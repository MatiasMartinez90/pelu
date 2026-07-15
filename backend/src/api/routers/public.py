"""Endpoints públicos: catálogo, disponibilidad y reservas del wizard."""

import hashlib
import json
from datetime import date as date_type
from fastapi import APIRouter, HTTPException, Query, Request, Response

from ...db.pool import get_pool
from ...db.repositories import catalog, site_context
from ...integrations.redis_client import rate_limit_exceeded
from ...services import availability_service, booking_service
from ..client_ip import get_client_ip
from ..schemas import (
    AvailabilityOut,
    BarberOut,
    BookingBootstrapOut,
    BookingIn,
    BookingOut,
    ServiceOut,
)

router = APIRouter(prefix="/api/v1", tags=["public"])


def _cache_public(response: Response, request: Request, value, max_age: int = 300) -> bool:
    """Agrega caché compartida y devuelve True si corresponde responder 304."""
    encoded = json.dumps(value, sort_keys=True, default=str, separators=(",", ":")).encode()
    etag = f'"{hashlib.sha256(encoded).hexdigest()[:24]}"'
    response.headers["Cache-Control"] = (
        f"public, max-age=60, s-maxage={max_age}, stale-while-revalidate=86400"
    )
    response.headers["ETag"] = etag
    return request.headers.get("if-none-match") == etag


@router.get("/site")
async def site_data(request: Request, response: Response):
    pool = await get_pool()
    value = await site_context.get_site_data(pool)
    if _cache_public(response, request, value, 300):
        return Response(status_code=304, headers=dict(response.headers))
    return value


@router.get("/barbers", response_model=list[BarberOut])
async def list_barbers(request: Request, response: Response, service: str | None = None):
    pool = await get_pool()
    value = await catalog.list_barbers(pool, service_slug=service)
    if _cache_public(response, request, value):
        return Response(status_code=304, headers=dict(response.headers))
    return value


@router.get("/services", response_model=list[ServiceOut])
async def list_services(request: Request, response: Response, barber: str | None = None):
    pool = await get_pool()
    value = await catalog.list_services(pool, barber_slug=barber)
    if _cache_public(response, request, value):
        return Response(status_code=304, headers=dict(response.headers))
    return value


@router.get("/booking-bootstrap", response_model=BookingBootstrapOut)
async def booking_bootstrap(request: Request, response: Response):
    pool = await get_pool()
    value = await catalog.booking_bootstrap(pool)
    if _cache_public(response, request, value):
        return Response(status_code=304, headers=dict(response.headers))
    return value


@router.get("/availability", response_model=AvailabilityOut)
async def availability(
    barber: str = Query(...),
    service: str = Query(...),
    date: date_type = Query(...),
):
    pool = await get_pool()
    selection = await catalog.get_booking_selection(pool, barber, service)
    if selection is None:
        raise HTTPException(422, "profesional o servicio no disponible")
    b, s = selection
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
