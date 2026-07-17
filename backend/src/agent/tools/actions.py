"""Two-turn, durable confirmation workflow for every mutating agent action."""

from __future__ import annotations

import json
import re
from datetime import date as date_type
from typing import Annotated, Any
from uuid import UUID

from langchain_core.messages import HumanMessage
from langchain_core.tools import tool
from langgraph.prebuilt import InjectedState

from ...db.pool import get_pool
from ...db.repositories import catalog
from ...services import availability_service, booking_service
from .. import events
from .booking import _fmt_dt, _resolve_requested_date

_CONFIRMATION = re.compile(
    r"^\s*(sí|si|confirmo|confirmar|dale|ok|okay|de acuerdo|hacelo|reservá|reserva)"
    r"(?:\s+(?:por favor|gracias))?[.!¡]*\s*$",
    re.IGNORECASE,
)


def _contact_channel(contact_ref: str) -> str:
    return "telegram" if contact_ref.startswith("telegram:") else "whatsapp"


def _latest_user_text(state: dict) -> str:
    for message in reversed(state.get("messages", [])):
        if isinstance(message, HumanMessage):
            return str(message.content)
        if isinstance(message, dict) and message.get("role") == "user":
            return str(message.get("content", ""))
    return ""


async def _store_action(state: dict, action_type: str, payload: dict[str, Any]) -> UUID:
    pool = await get_pool()
    row = await pool.fetchrow(
        """
        INSERT INTO agent_pending_actions
            (conversation_id, phone, action_type, payload, prepared_turn_id)
        VALUES ($1, $2, $3, $4::jsonb, $5)
        ON CONFLICT (conversation_id) WHERE status = 'pending'
        DO UPDATE SET phone = EXCLUDED.phone, action_type = EXCLUDED.action_type,
                      payload = EXCLUDED.payload,
                      prepared_turn_id = EXCLUDED.prepared_turn_id,
                      expires_at = now() + interval '30 minutes', created_at = now()
        RETURNING id
        """,
        state["conversation_id"],
        state["phone"],
        action_type,
        json.dumps(payload),
        UUID(str(state["turn_id"])),
    )
    return row["id"]


@tool
async def prepare_booking(
    barber: str,
    service: str,
    date: str,
    time: str,
    customer_name: str,
    state: Annotated[dict, InjectedState],
) -> str:
    """Prepare a booking and ask for explicit confirmation. This never creates it."""
    pool = await get_pool()
    b = await catalog.get_barber_by_slug(pool, barber)
    s = await catalog.get_service_by_slug(pool, service)
    if b is None or not b["active"]:
        return "Ese profesional no existe o no está disponible."
    if s is None or not s["active"]:
        return "Ese servicio no existe o no está disponible."
    if not await catalog.barber_offers_service(pool, b["id"], s["id"]):
        return f"{b['name']} no ofrece {s['name']}."
    try:
        day = _resolve_requested_date(date, state)
    except ValueError:
        return "Fecha inválida: usá YYYY-MM-DD."
    slots = await availability_service.get_slots(pool, b, s, day)
    if time not in slots:
        return "Ese horario ya no está disponible. Consultá disponibilidad otra vez."
    action_id = await _store_action(
        state,
        "create",
        {
            "barber": barber,
            "service": service,
            "date": day.isoformat(),
            "time": time,
            "customer_name": customer_name,
        },
    )
    return (
        f"Acción {action_id} preparada, todavía NO reservada: {s['name']} con "
        f"{b['name']} el {day.isoformat()} a las {time}, a nombre de {customer_name}, "
        f"precio ${s['price']:,}. Pedile al cliente que confirme explícitamente "
        "dentro de 30 minutos. No digas que el turno ya está reservado y no ejecutes "
        "confirm_pending_action en este mismo turno."
    ).replace(",", ".")


@tool
async def prepare_reschedule(
    booking_id: str,
    date: str,
    time: str,
    state: Annotated[dict, InjectedState],
) -> str:
    """Prepare rescheduling one of the customer's bookings; does not mutate it."""
    try:
        booking_uuid = UUID(booking_id)
        date_type.fromisoformat(date)
    except ValueError:
        return "Turno o fecha inválidos."
    bookings = await booking_service.get_bookings_by_phone(await get_pool(), state["phone"])
    booking = next((item for item in bookings if item["id"] == booking_uuid), None)
    if booking is None:
        return "No encontré un turno futuro tuyo con ese identificador."
    action_id = await _store_action(
        state,
        "reschedule",
        {"booking_id": booking_id, "date": date, "time": time},
    )
    return (
        f"Acción {action_id} preparada: reprogramar {booking['service']} con "
        f"{booking['barber']} al {date} a las {time}. Pedile confirmación explícita. "
        "No ejecutes confirm_pending_action en este mismo turno."
    )


@tool
async def prepare_cancel(
    booking_id: str, state: Annotated[dict, InjectedState]
) -> str:
    """Prepare cancellation of one customer-owned booking; does not cancel it."""
    try:
        booking_uuid = UUID(booking_id)
    except ValueError:
        return "Identificador de turno inválido."
    bookings = await booking_service.get_bookings_by_phone(await get_pool(), state["phone"])
    booking = next((item for item in bookings if item["id"] == booking_uuid), None)
    if booking is None:
        return "No encontré un turno futuro tuyo con ese identificador."
    action_id = await _store_action(state, "cancel", {"booking_id": booking_id})
    return (
        f"Acción {action_id} preparada: cancelar {booking['service']} con "
        f"{booking['barber']}, {_fmt_dt(booking['starts_at'])} hs. "
        "Pedile confirmación explícita. No ejecutes confirm_pending_action en este turno."
    )


@tool
async def confirm_pending_action(state: Annotated[dict, InjectedState]) -> str:
    """Execute the pending action only after explicit confirmation on a later user turn."""
    latest = _latest_user_text(state)
    if not _CONFIRMATION.match(latest):
        return "No hay una confirmación explícita válida en este mensaje. No ejecutes la acción."

    pool = await get_pool()
    completed = await pool.fetchrow(
        """
        SELECT result_text FROM agent_pending_actions
        WHERE conversation_id = $1 AND phone = $2 AND status = 'completed'
          AND confirmed_turn_id = $3
        """,
        state["conversation_id"],
        state["phone"],
        UUID(str(state["turn_id"])),
    )
    if completed:
        return completed["result_text"]
    action = await pool.fetchrow(
        """
        SELECT id, action_type, payload, prepared_turn_id
        FROM agent_pending_actions
        WHERE conversation_id = $1 AND phone = $2 AND status = 'pending'
          AND expires_at > now()
        """,
        state["conversation_id"],
        state["phone"],
    )
    if action is None:
        return (
            "La pre-reserva venció o ya no existe. Explicale al cliente que el turno "
            "NO quedó reservado y volvé a consultar disponibilidad antes de preparar "
            "otra confirmación. No lo presentes como un error técnico ni lo derives a "
            "WhatsApp."
        )
    if str(action["prepared_turn_id"]) == str(state["turn_id"]):
        return "La acción debe confirmarse en un mensaje posterior del cliente."

    payload = action["payload"]
    if isinstance(payload, str):
        payload = json.loads(payload)
    command_key = str(action["id"])
    try:
        if action["action_type"] == "create":
            result = await booking_service.create_booking(
                pool,
                barber_slug=payload["barber"],
                service_slug=payload["service"],
                day=date_type.fromisoformat(payload["date"]),
                hhmm=payload["time"],
                phone=state["phone"],
                customer_name=payload["customer_name"],
                channel=_contact_channel(state["phone"]),
                idempotency_key=command_key,
            )
            result_text = (
                f"Reserva confirmada: {result['service']} con {result['barber']}, "
                f"{_fmt_dt(result['starts_at'])} hs. El pago es en el local."
            )
            event_type = "booking_created"
        elif action["action_type"] == "reschedule":
            result = await booking_service.reschedule_booking(
                pool,
                UUID(payload["booking_id"]),
                day=date_type.fromisoformat(payload["date"]),
                hhmm=payload["time"],
                phone=state["phone"],
                channel=_contact_channel(state["phone"]),
                command_key=command_key,
            )
            result_text = f"Listo, turno reprogramado para {_fmt_dt(result['starts_at'])} hs."
            event_type = "booking_rescheduled"
        else:
            await booking_service.cancel_booking(
                pool,
                UUID(payload["booking_id"]),
                reason=f"cancelado por {_contact_channel(state['phone'])}",
                phone=state["phone"],
                command_key=command_key,
            )
            result_text = "Turno cancelado. ¡Que sea la próxima!"
            event_type = "booking_cancelled"
    except booking_service.BookingError as exc:
        return f"No se pudo ejecutar la acción: {exc}"

    await pool.execute(
        """
        UPDATE agent_pending_actions
        SET status = 'completed', result_text = $2, completed_at = now(),
            confirmed_turn_id = $3
        WHERE id = $1
        """,
        action["id"],
        result_text,
        UUID(str(state["turn_id"])),
    )
    await events.log_event(
        event_type,
        conversation_id=state["conversation_id"],
        phone=state["phone"],
    )
    return result_text
