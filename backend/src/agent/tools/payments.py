"""Tools estrechas para ofrecer el pago opcional después de reservar."""

import json
from datetime import datetime
from typing import Annotated
from uuid import UUID
from zoneinfo import ZoneInfo

from langchain_core.tools import tool
from langgraph.prebuilt import InjectedState

from ...config import get_settings
from ...db.pool import get_pool
from ...db.repositories import payments
from ...payments.providers import PaymentProviderError
from ...services import payment_service
from .. import events


async def _latest_booking_id(state: dict) -> UUID | None:
    pool = await get_pool()
    action = await pool.fetchrow(
        """SELECT payload FROM agent_pending_actions
           WHERE conversation_id = $1 AND phone = $2 AND action_type = 'create'
             AND status = 'completed'
           ORDER BY completed_at DESC LIMIT 1""",
        state["conversation_id"], state["phone"],
    )
    if action is None:
        return None
    payload = action["payload"]
    if isinstance(payload, str):
        payload = json.loads(payload)
    try:
        return UUID(str(payload["booking_id"]))
    except (KeyError, TypeError, ValueError):
        return None


@tool
async def create_booking_payment_link(state: Annotated[dict, InjectedState]) -> str:
    """Genera el link del último turno confirmado en esta conversación.

    Usar sólo si, en un mensaje posterior a la confirmación de la reserva, el
    cliente elige explícitamente pagar ahora con Mercado Pago.
    """
    settings = get_settings()
    if settings.payment_provider == "disabled":
        return "El pago online no está disponible. El turno sigue confirmado y se paga en el local."
    pool = await get_pool()
    appointment_id = await _latest_booking_id(state)
    if appointment_id is None:
        return "No hay una reserva recién confirmada en esta conversación. No generes un cobro."
    if not await payments.appointment_belongs_to_contact(
        pool, appointment_id, state["phone"]
    ):
        return "No se pudo verificar que el turno pertenezca a este contacto. No generes un cobro."
    try:
        intent, _ = await payment_service.create_appointment_preference(
            appointment_id,
            idempotency_key=f"agent-payment:{state['turn_id']}",
            settings=settings,
        )
    except (payments.PaymentError, PaymentProviderError, ValueError):
        return "No pude generar el link. El turno sigue confirmado y puede pagarse en el local."
    expires_at = datetime.fromisoformat(intent["expires_at"]).astimezone(
        ZoneInfo(settings.timezone)
    )
    await events.log_event(
        "booking_payment_link_created",
        conversation_id=state["conversation_id"],
        phone=state["phone"],
    )
    return (
        f"Link de pago seguro: {intent['checkout_url']}\n"
        f"Vence el {expires_at.strftime('%d/%m a las %H:%M')}. "
        "El turno ya está confirmado y no se cancela si el link vence."
    )


@tool
async def choose_booking_pay_at_store(state: Annotated[dict, InjectedState]) -> str:
    """Registra pago en el local para el último turno confirmado del contacto."""
    appointment_id = await _latest_booking_id(state)
    if appointment_id is None:
        return "No hay una reserva recién confirmada en esta conversación."
    try:
        await payments.cancel_appointment_payment_to_store(
            await get_pool(), appointment_id, state["phone"], actor="agent_customer_choice"
        )
    except payments.PaymentConflict:
        return "El turno ya figura abonado. No indiques que debe pagar otra vez."
    except payments.PaymentError:
        return "No se pudo verificar el turno. No cambies el estado del pago."
    return "Pago en el local registrado. El turno continúa confirmado."
