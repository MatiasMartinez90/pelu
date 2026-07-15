from unittest.mock import AsyncMock

import pytest
from starlette.requests import Request
from starlette.responses import Response

from src.api.routers.public import _cache_public
from src.db.repositories import catalog


class BootstrapPool:
    async def fetch(self, query, *args):
        if "FROM barbers WHERE" in query:
            return [
                {
                    "id": "b1",
                    "slug": "ana",
                    "name": "Ana",
                    "role": "BARBERA",
                    "photo_url": "/media/team/ana.v1.webp",
                    "bio": "Bio",
                    "instagram": "ana",
                    "active": True,
                    "sort_order": 1,
                }
            ]
        if "FROM services WHERE" in query:
            return [
                {
                    "id": "s1",
                    "slug": "corte",
                    "name": "Corte",
                    "description": "Corte completo",
                    "price": 100,
                    "duration_min": 30,
                    "badge": None,
                    "variable_price": False,
                    "active": True,
                    "sort_order": 1,
                }
            ]
        if "SELECT b.slug AS barber_slug" in query:
            return [{"barber_slug": "ana", "service_slug": "corte"}]
        raise AssertionError(query)


@pytest.mark.asyncio
async def test_booking_bootstrap_groups_services_without_client_waterfall():
    result = await catalog.booking_bootstrap(BootstrapPool())

    assert result["barbers"][0]["slug"] == "ana"
    assert result["services_by_barber"]["ana"][0]["slug"] == "corte"
    assert "id" not in result["barbers"][0]


@pytest.mark.asyncio
async def test_booking_selection_uses_one_database_roundtrip():
    pool = AsyncMock()
    pool.fetchrow.return_value = {
        "barber_id": "b1",
        "barber_slug": "ana",
        "barber_name": "Ana",
        "barber_role": "BARBERA",
        "barber_photo_url": "/media/team/ana.v1.webp",
        "service_id": "s1",
        "service_slug": "corte",
        "service_name": "Corte",
        "service_description": "Corte completo",
        "service_price": 100,
        "duration_min": 30,
        "badge": None,
        "variable_price": False,
    }

    barber, service = await catalog.get_booking_selection(pool, "ana", "corte")

    assert barber["slug"] == "ana"
    assert service["duration_min"] == 30
    pool.fetchrow.assert_awaited_once()


def test_public_catalog_cache_has_etag_and_shared_swr():
    first_request = Request({"type": "http", "method": "GET", "path": "/", "headers": []})
    first_response = Response()
    assert not _cache_public(first_response, first_request, {"value": 1})
    etag = first_response.headers["etag"]
    assert "s-maxage=300" in first_response.headers["cache-control"]
    assert "stale-while-revalidate=86400" in first_response.headers["cache-control"]

    second_request = Request(
        {
            "type": "http",
            "method": "GET",
            "path": "/",
            "headers": [(b"if-none-match", etag.encode())],
        }
    )
    assert _cache_public(Response(), second_request, {"value": 1})
