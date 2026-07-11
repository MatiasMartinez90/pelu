"""Portal del cliente logueado (/mi-cuenta): sus turnos e historial."""

from uuid import UUID

from fastapi import APIRouter, HTTPException

from ...db.pool import get_pool
from ...services import booking_service, link_service
from ..deps import CustomerUser

router = APIRouter(prefix="/api/v1/me", tags=["cliente"])


@router.post("/link/whatsapp/start")
async def link_whatsapp_start(customer: dict = CustomerUser):
    """Genera el código que el cliente envía desde su WhatsApp para vincular su número."""
    token = await link_service.issue_token(customer["email"])
    return {"code": f"{link_service.PREFIX}{token}", "expires_in": link_service.TOKEN_TTL}


@router.get("/bookings")
async def my_bookings(customer: dict = CustomerUser):
    """Próximos turnos + historial completo del cliente (identidad = email del token)."""
    pool = await get_pool()
    email = customer["email"]
    upcoming = await booking_service.get_bookings_by_email(pool, email, only_future=True)
    history = await booking_service.get_bookings_by_email(pool, email, only_future=False)
    return {
        "email": email,
        "name": customer.get("name", ""),
        "upcoming": upcoming,
        "history": history,
    }


@router.post("/bookings/{booking_id}/cancel")
async def cancel_my_booking(booking_id: UUID, customer: dict = CustomerUser):
    """Cancela un turno propio activo futuro (respeta el GiST anti doble-booking al liberar)."""
    pool = await get_pool()
    try:
        res = await booking_service.cancel_booking_by_email(
            pool, booking_id, email=customer["email"]
        )
    except booking_service.BookingError as e:
        raise HTTPException(422, {"code": "BOOKING_ERROR", "message": str(e)}) from None
    return {"id": str(res["id"]), "starts_at": res["starts_at"]}
