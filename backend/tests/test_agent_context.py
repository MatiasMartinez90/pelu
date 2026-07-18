from datetime import time

import pytest

from src.agent.graph import _agent_error_reply, _booking_url, _budget_reply
from src.agent.system_prompt import build_system_prompt
from src.config import get_settings
from src.agent.tools import booking
from src.db.repositories import site_context


def sample_site_data():
    return {
        "name": "Tijera Sur",
        "tagline": "Peluquería",
        "description": "Cortes del barrio.",
        "address": "Calle Dinámica 123",
        "directions": "A una cuadra de la estación.",
        "phone_display": "+54 11 1234-5678",
        "whatsapp": "541112345678",
        "email": "hola@example.com",
        "instagram": "tijerasur",
        "payment_methods": ["tarjeta", "transferencia"],
        "payment_notes": "Pago al finalizar.",
        "cancellation_notice_min": 60,
        "cancellation_notes": "Sin costo.",
        "online_store_url": None,
        "additional_info": {},
        "schedule": [
            {
                "dow": 2,
                "day": "martes",
                "opens_at": "09:00",
                "closes_at": "18:00",
                "barber_slug": None,
                "barber_name": None,
            }
        ],
        "barbers": [
            {
                "slug": "alex",
                "name": "Alex",
                "role": "BARBERO",
                "photo_url": None,
                "bio": "Especialista en fades.",
                "instagram": "alex.corta",
                "services": ["Corte"],
            }
        ],
    }


def test_system_prompt_uses_database_context_instead_of_fixed_business_data():
    context = site_context.format_agent_context(sample_site_data())
    prompt = build_system_prompt(context)

    assert "Tijera Sur" in prompt
    assert "Calle Dinámica 123" in prompt
    assert "Alex" in prompt
    assert "martes: 09:00-18:00" in prompt
    assert "Av. Cabildo 2200" not in prompt


def test_agent_copy_and_booking_url_come_from_installation_settings(monkeypatch):
    monkeypatch.setenv("AGENT_TONE", "formal y directo")
    monkeypatch.setenv("PUBLIC_SITE_URL", "https://cliente.example/")
    monkeypatch.setenv("PUBLIC_BOOKING_PATH", "/reservas")
    get_settings.cache_clear()
    try:
        prompt = build_system_prompt("Contexto dinámico")
        assert "Tono formal y directo" in prompt
        assert _booking_url() == "https://cliente.example/reservas"
        assert "https://cliente.example/reservas" in _budget_reply()
        assert "https://cliente.example/reservas" in _agent_error_reply()
        assert "nox.cloud-it.com.ar" not in prompt + _budget_reply() + _agent_error_reply()
    finally:
        get_settings.cache_clear()


class AvailabilityPool:
    pass


@pytest.mark.asyncio
async def test_check_availability_rejects_service_not_offered_by_barber(monkeypatch):
    pool = AvailabilityPool()

    async def value(item):
        return item

    monkeypatch.setattr(booking, "get_pool", lambda: value(pool))
    monkeypatch.setattr(
        booking.catalog,
        "get_barber_by_slug",
        lambda current_pool, slug: value({"id": "barber-id", "name": "Alex", "active": True}),
    )
    monkeypatch.setattr(
        booking.catalog,
        "get_service_by_slug",
        lambda current_pool, slug: value({"id": "service-id", "name": "Color", "active": True}),
    )
    monkeypatch.setattr(
        booking.catalog,
        "barber_offers_service",
        lambda current_pool, barber_id, service_id: value(False),
    )

    result = await booking.check_availability.ainvoke(
        {"barber": "alex", "service": "color", "date": "2026-07-20"}
    )

    assert result == "Alex no ofrece Color. Usá get_services con su slug."


class SitePool:
    async def fetchrow(self, query):
        return {
            "singleton": True,
            "name": "Tijera Sur",
            "short_name": "TS",
            "tagline": "Peluquería",
            "city": "Buenos Aires",
            "description": "Cortes del barrio.",
            "phone_display": "+54 11 1234-5678",
            "whatsapp": "541112345678",
            "instagram": "tijerasur",
            "email": "hola@example.com",
            "address": "Calle Dinámica 123",
            "maps_query": "Calle Dinámica 123",
            "directions": "A una cuadra de la estación.",
            "payment_methods": ["tarjeta"],
            "payment_notes": "Pago al finalizar.",
            "cancellation_notice_min": 60,
            "cancellation_notes": "Sin costo.",
            "online_store_url": None,
            "additional_info": '{"wifi": "clientes"}',
            "updated_at": None,
        }

    async def fetch(self, query):
        if "FROM schedule_rules" in query:
            return [
                {
                    "dow": 2,
                    "opens_at": time(9),
                    "closes_at": time(18),
                    "barber_slug": None,
                    "barber_name": None,
                }
            ]
        return [
            {
                "slug": "alex",
                "name": "Alex",
                "role": "BARBERO",
                "photo_url": None,
                "bio": "",
                "instagram": "",
                "services": ["Corte"],
            }
        ]


@pytest.mark.asyncio
async def test_site_data_is_composed_from_database_rows():
    site_context.clear_cache()
    data = await site_context.get_site_data(SitePool(), use_cache=False)

    assert data["name"] == "Tijera Sur"
    assert data["additional_info"] == {"wifi": "clientes"}
    assert data["schedule"][0]["opens_at"] == "09:00"
    assert data["barbers"][0]["name"] == "Alex"
