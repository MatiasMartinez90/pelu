"""Endpoints públicos: catálogo, disponibilidad y reservas del wizard."""

from datetime import date as date_type
from uuid import UUID

from fastapi import APIRouter, HTTPException, Query, Request

from ...db.pool import get_pool
from ...db.repositories import catalog
from ...integrations.redis_client import rate_limit_exceeded
from ...services import availability_service, booking_service
from ..schemas import AvailabilityOut, BarberOut, BookingIn, BookingOut, ServiceOut

router = APIRouter(prefix="/api/v1", tags=["public"])


@router.get("/barbers", response_model=list[BarberOut])
async def list_barbers(service: str | None = None):
    pool = await get_pool()
    return await catalog.list_barbers(pool, service_slug=service)


@router.get("/services", response_model=list[ServiceOut])
async def list_services(barber: str | None = None):
    pool = await get_pool()
    return await catalog.list_services(pool, barber_slug=barber)


@router.get("/availability", response_model=AvailabilityOut)
async def availability(
    barber: str = Query(...),
    service: str = Query(...),
    date: date_type = Query(...),
):
    pool = await get_pool()
    b = await catalog.get_barber_by_slug(pool, barber)
    s = await catalog.get_service_by_slug(pool, service)
    if b is None or s is None:
        raise HTTPException(404, "barbero o servicio inexistente")
    slots = await availability_service.get_slots(pool, b, s, date)
    return AvailabilityOut(date=date, barber=barber, service=service, slots=slots)


@router.post("/bookings", response_model=BookingOut, status_code=201)
async def create_booking(body: BookingIn, request: Request):
    client_ip = request.client.host if request.client else "unknown"
    if await rate_limit_exceeded(f"ip:{client_ip}") or await rate_limit_exceeded(
        f"phone:{body.customer.phone}"
    ):
        raise HTTPException(429, "Demasiadas solicitudes, probá más tarde.")

    pool = await get_pool()
    try:
        result = await booking_service.create_booking(
            pool,
            barber_slug=body.barber,
            service_slug=body.service,
            day=body.date,
            hhmm=body.time,
            phone=body.customer.phone,
            customer_name=body.customer.name,
            email=body.customer.email,
            channel="web",
        )
    except booking_service.SlotTakenError as e:
        raise HTTPException(409, {"code": "SLOT_TAKEN", "message": str(e)}) from None
    except booking_service.SlotUnavailableError as e:
        raise HTTPException(422, {"code": "SLOT_UNAVAILABLE", "message": str(e)}) from None
    except booking_service.BookingError as e:
        raise HTTPException(422, {"code": "BOOKING_ERROR", "message": str(e)}) from None

    return BookingOut(
        id=result["id"],
        barber=result["barber"],
        service=result["service"],
        starts_at=result["starts_at"],
        ends_at=result["ends_at"],
        status=result["status"],
        price=result["price_at_booking"],
        channel=result["channel"],
    )


@router.get("/bookings/{booking_id}", response_model=BookingOut)
async def get_booking(booking_id: UUID, phone: str = Query(...)):
    pool = await get_pool()
    row = await pool.fetchrow(
        """
        SELECT a.id, a.starts_at, a.ends_at, a.status, a.price_at_booking, a.channel,
               b.name AS barber, s.name AS service
        FROM appointments a
        JOIN customers c ON c.id = a.customer_id
        JOIN barbers b ON b.id = a.barber_id
        JOIN services s ON s.id = a.service_id
        WHERE a.id = $1 AND c.phone = $2
        """,
        booking_id,
        phone.replace(" ", "").replace("-", ""),
    )
    if row is None:
        raise HTTPException(404, "reserva no encontrada")
    return BookingOut(
        id=row["id"],
        barber=row["barber"],
        service=row["service"],
        starts_at=row["starts_at"],
        ends_at=row["ends_at"],
        status=row["status"],
        price=row["price_at_booking"],
        channel=row["channel"],
    )
