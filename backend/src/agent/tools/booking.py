"""Tools de turnos. Usan los mismos services que la API REST: el anti
doble-booking es el exclusion constraint de la DB, no lógica en memoria."""

from datetime import date as date_type
from typing import Annotated
from uuid import UUID

from langchain_core.tools import tool
from langgraph.prebuilt import InjectedState

from ...db.pool import get_pool
from ...db.repositories import catalog
from ...services import availability_service, booking_service
from .. import events


def _fmt_dt(dt) -> str:
    dias = ["lunes", "martes", "miércoles", "jueves", "viernes", "sábado", "domingo"]
    from zoneinfo import ZoneInfo

    from ...config import get_settings

    local = dt.astimezone(ZoneInfo(get_settings().timezone))
    return f"{dias[local.weekday()]} {local.strftime('%d/%m %H:%M')}"


@tool
async def check_availability(barber: str, service: str, date: str) -> str:
    """Horarios disponibles de un profesional para un servicio en una fecha.
    barber y service son slugs obtenidos dinámicamente con get_barbers/get_services;
    date es YYYY-MM-DD."""
    pool = await get_pool()
    b = await catalog.get_barber_by_slug(pool, barber)
    s = await catalog.get_service_by_slug(pool, service)
    if b is None:
        return f"No existe el profesional '{barber}'. Usá get_barbers para ver los slugs."
    if s is None:
        return f"No existe el servicio '{service}'. Usá get_services para ver los slugs."
    if not b["active"]:
        return f"{b['name']} no está disponible en este momento."
    if not s["active"]:
        return f"El servicio {s['name']} no está disponible en este momento."
    if not await catalog.barber_offers_service(pool, b["id"], s["id"]):
        return f"{b['name']} no ofrece {s['name']}. Usá get_services con su slug."
    try:
        day = date_type.fromisoformat(date)
    except ValueError:
        return "Fecha inválida: usá formato YYYY-MM-DD."
    slots = await availability_service.get_slots(pool, b, s, day)
    if not slots:
        return f"{b['name']} no tiene horarios libres el {date} para {s['name']}."
    return f"Horarios de {b['name']} el {date}: {', '.join(slots)}"


@tool
async def create_booking(
    barber: str,
    service: str,
    date: str,
    time: str,
    customer_name: str,
    state: Annotated[dict, InjectedState],
) -> str:
    """Crea la reserva. Usar SOLO después de confirmar todos los datos con el
    cliente. barber/service son slugs, date YYYY-MM-DD, time HH:MM."""
    pool = await get_pool()
    phone = state["phone"]
    try:
        result = await booking_service.create_booking(
            pool,
            barber_slug=barber,
            service_slug=service,
            day=date_type.fromisoformat(date),
            hhmm=time,
            phone=phone,
            customer_name=customer_name,
            channel="whatsapp",
        )
    except booking_service.BookingError as e:
        return f"No se pudo reservar: {e}"
    await events.log_event(
        "booking_created", conversation_id=state.get("conversation_id"), phone=phone
    )
    return (
        f"Reserva confirmada: {result['service']} con {result['barber']}, "
        f"{_fmt_dt(result['starts_at'])} hs, a nombre de {customer_name}. "
        f"Precio: ${result['price_at_booking']:,}".replace(",", ".")
        + ". El pago es en el local."
    )


@tool
async def get_my_bookings(state: Annotated[dict, InjectedState]) -> str:
    """Turnos futuros del cliente (por su número de WhatsApp)."""
    pool = await get_pool()
    bookings = await booking_service.get_bookings_by_phone(pool, state["phone"])
    if not bookings:
        return "El cliente no tiene turnos activos."
    return "\n".join(
        f"- [{b['id']}] {b['service']} con {b['barber']}, {_fmt_dt(b['starts_at'])} hs"
        for b in bookings
    )


@tool
async def reschedule_booking(
    booking_id: str, date: str, time: str, state: Annotated[dict, InjectedState]
) -> str:
    """Reprograma un turno futuro del cliente. booking_id sale de get_my_bookings;
    date YYYY-MM-DD, time HH:MM."""
    pool = await get_pool()
    try:
        result = await booking_service.reschedule_booking(
            pool,
            UUID(booking_id),
            day=date_type.fromisoformat(date),
            hhmm=time,
            phone=state["phone"],
            channel="whatsapp",
        )
    except (booking_service.BookingError, ValueError) as e:
        return f"No se pudo reprogramar: {e}"
    await events.log_event(
        "booking_rescheduled", conversation_id=state.get("conversation_id"), phone=state["phone"]
    )
    return f"Listo, turno reprogramado para {_fmt_dt(result['starts_at'])} hs."


@tool
async def cancel_booking(booking_id: str, state: Annotated[dict, InjectedState]) -> str:
    """Cancela un turno futuro del cliente. booking_id sale de get_my_bookings."""
    pool = await get_pool()
    try:
        await booking_service.cancel_booking(
            pool, UUID(booking_id), reason="cancelado por WhatsApp", phone=state["phone"]
        )
    except (booking_service.BookingError, ValueError) as e:
        return f"No se pudo cancelar: {e}"
    await events.log_event(
        "booking_cancelled", conversation_id=state.get("conversation_id"), phone=state["phone"]
    )
    return "Turno cancelado. ¡Que sea la próxima!"
