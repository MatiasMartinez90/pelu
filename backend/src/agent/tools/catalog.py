"""Tools de catálogo: servicios y profesionales."""

from langchain_core.tools import tool

from ...db.pool import get_pool
from ...db.repositories import catalog


def _fmt_price(service: dict) -> str:
    prefix = "desde " if service["variable_price"] else ""
    return f"{prefix}${service['price']:,}".replace(",", ".")


@tool
async def get_services(barber: str | None = None) -> str:
    """Lista los servicios con precio y duración. Pasá el slug del barbero
    devuelto por get_barbers para ver solo los servicios que ofrece ese profesional."""
    pool = await get_pool()
    services = await catalog.list_services(pool, barber_slug=barber)
    if not services:
        return "No hay servicios para ese profesional."
    lines = [
        f"- {s['name']} ({s['slug']}): {_fmt_price(s)} · {s['duration_min']} min"
        for s in services
    ]
    return "\n".join(lines)


@tool
async def get_barbers(service: str | None = None) -> str:
    """Lista los profesionales. Pasá el slug de un servicio (ej: 'corte-mujer')
    para ver solo quiénes lo hacen."""
    pool = await get_pool()
    barbers = await catalog.list_barbers(pool, service_slug=service)
    if not barbers:
        return "No hay profesionales para ese servicio."
    return "\n".join(f"- {b['name']} ({b['slug']}) · {b['role'].title()}" for b in barbers)
