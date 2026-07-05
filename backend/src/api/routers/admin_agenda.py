"""Admin: agenda del día y gestión de turnos."""

from datetime import date as date_type
from uuid import UUID

from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel

from ...db.pool import get_pool
from ...services import booking_service
from ..deps import AdminUser

router = APIRouter(prefix="/api/v1/admin", tags=["admin"])


@router.get("/agenda")
async def agenda(date: date_type = Query(...), barber: str | None = None, admin: dict = AdminUser):
    pool = await get_pool()
    rows = await pool.fetch(
        """
        SELECT a.id, a.starts_at, a.ends_at, a.status, a.price_at_booking, a.channel,
               c.name AS customer, c.phone, b.name AS barber, b.slug AS barber_slug,
               s.name AS service
        FROM appointments a
        JOIN customers c ON c.id = a.customer_id
        JOIN barbers b ON b.id = a.barber_id
        JOIN services s ON s.id = a.service_id
        WHERE a.starts_at::date = $1 AND ($2::text IS NULL OR b.slug = $2)
        ORDER BY a.starts_at
        """,
        date,
        barber,
    )
    return [dict(r) for r in rows]


class AdminBookingIn(BaseModel):
    barber: str
    service: str
    date: date_type
    time: str
    customer_name: str
    phone: str


@router.post("/appointments", status_code=201)
async def create_appointment(body: AdminBookingIn, admin: dict = AdminUser):
    pool = await get_pool()
    try:
        return await booking_service.create_booking(
            pool,
            barber_slug=body.barber,
            service_slug=body.service,
            day=body.date,
            hhmm=body.time,
            phone=body.phone,
            customer_name=body.customer_name,
            channel="admin",
        )
    except booking_service.SlotTakenError as e:
        raise HTTPException(409, str(e)) from None
    except booking_service.BookingError as e:
        raise HTTPException(422, str(e)) from None


class AppointmentPatch(BaseModel):
    status: str | None = None  # cancelled | completed | no_show
    date: date_type | None = None  # reagendar
    time: str | None = None
    reason: str = ""


@router.patch("/appointments/{appointment_id}")
async def patch_appointment(appointment_id: UUID, body: AppointmentPatch, admin: dict = AdminUser):
    pool = await get_pool()
    if body.date and body.time:
        try:
            return await booking_service.reschedule_booking(
                pool, appointment_id, day=body.date, hhmm=body.time, channel="admin"
            )
        except booking_service.BookingError as e:
            raise HTTPException(422, str(e)) from None

    if body.status == "cancelled":
        try:
            return await booking_service.cancel_booking(
                pool, appointment_id, reason=body.reason or f"cancelado por {admin['email']}"
            )
        except booking_service.BookingError as e:
            raise HTTPException(422, str(e)) from None

    if body.status in ("completed", "no_show"):
        row = await pool.fetchrow(
            """
            UPDATE appointments SET status = $2, updated_at = now()
            WHERE id = $1 AND status = 'active' RETURNING id, status
            """,
            appointment_id,
            body.status,
        )
        if row is None:
            raise HTTPException(404, "turno activo no encontrado")
        return dict(row)

    raise HTTPException(422, "nada para actualizar")
