"""Endpoints públicos: catálogo, disponibilidad y reservas del wizard."""

from datetime import date as date_type
from fastapi import APIRouter, HTTPException, Query, Request

from ...db.pool import get_pool
from ...db.repositories import catalog, site_context
from ...integrations.redis_client import rate_limit_exceeded
from ...services import availability_service, booking_service
from ..client_ip import get_client_ip
from ..schemas import AvailabilityOut, BarberOut, BookingIn, BookingOut, ServiceOut

router = APIRouter(prefix="/api/v1", tags=["public"])


@router.get("/site")
async def site_data():
    pool = await get_pool()
    return await site_context.get_site_data(pool)


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
    if not b["active"] or not s["active"]:
        raise HTTPException(404, "barbero o servicio no disponible")
    if not await catalog.barber_offers_service(pool, b["id"], s["id"]):
        raise HTTPException(422, "el profesional no ofrece ese servicio")
    slots = await availability_service.get_slots(pool, b, s, date)
    return AvailabilityOut(date=date, barber=barber, service=service, slots=slots)


@router.post("/bookings", response_model=BookingOut, status_code=201)
async def create_booking(body: BookingIn, request: Request):
    client_ip = get_client_ip(request)
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
            # El formulario público no es una prueba de identidad. Guardar el
            # email permitiría apropiarse de un teléfono y ver sus turnos.
            email=None,
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
