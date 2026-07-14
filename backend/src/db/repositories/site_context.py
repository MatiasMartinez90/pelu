"""Perfil institucional y horarios que comparten el agente y la API pública."""

import json
import time
from typing import Any

import asyncpg

DOW_NAMES = {
    0: "domingo",
    1: "lunes",
    2: "martes",
    3: "miércoles",
    4: "jueves",
    5: "viernes",
    6: "sábado",
}

PROFILE_FIELDS = {
    "name",
    "short_name",
    "tagline",
    "city",
    "description",
    "phone_display",
    "whatsapp",
    "instagram",
    "email",
    "address",
    "maps_query",
    "directions",
    "payment_methods",
    "payment_notes",
    "cancellation_notice_min",
    "cancellation_notes",
    "online_store_url",
    "additional_info",
}

_CACHE_TTL = 10
_cache: dict[str, Any] | None = None
_cache_at = 0.0


def _decode_json(value: Any) -> Any:
    return json.loads(value) if isinstance(value, str) else value


def _profile_dict(row: asyncpg.Record) -> dict[str, Any]:
    profile = dict(row)
    profile.pop("singleton", None)
    profile["payment_methods"] = list(profile["payment_methods"])
    profile["additional_info"] = _decode_json(profile["additional_info"])
    return profile


async def get_site_data(pool: asyncpg.Pool, *, use_cache: bool = True) -> dict[str, Any]:
    """Devuelve perfil, horario general y profesionales desde una sola fuente."""
    global _cache, _cache_at
    if use_cache and _cache is not None and time.monotonic() - _cache_at < _CACHE_TTL:
        return _cache

    profile_row = await pool.fetchrow("SELECT * FROM site_profile WHERE singleton = true")
    if profile_row is None:
        raise RuntimeError("site_profile no tiene su fila única")

    schedule_rows = await pool.fetch(
        """
        SELECT sr.dow, sr.opens_at, sr.closes_at, b.slug AS barber_slug, b.name AS barber_name
        FROM schedule_rules sr
        LEFT JOIN barbers b ON b.id = sr.barber_id
        ORDER BY b.sort_order NULLS FIRST, sr.dow
        """
    )
    barber_rows = await pool.fetch(
        """
        SELECT b.slug, b.name, b.role, b.photo_url, b.bio, b.instagram,
               COALESCE(array_agg(s.name ORDER BY s.sort_order)
                        FILTER (WHERE s.id IS NOT NULL), '{}') AS services
        FROM barbers b
        LEFT JOIN barber_services bs ON bs.barber_id = b.id
        LEFT JOIN services s ON s.id = bs.service_id AND s.active
        WHERE b.active
        GROUP BY b.id
        ORDER BY b.sort_order
        """
    )

    result = {
        **_profile_dict(profile_row),
        "schedule": [
            {
                "dow": row["dow"],
                "day": DOW_NAMES[row["dow"]],
                "opens_at": row["opens_at"].strftime("%H:%M"),
                "closes_at": row["closes_at"].strftime("%H:%M"),
                "barber_slug": row["barber_slug"],
                "barber_name": row["barber_name"],
            }
            for row in schedule_rows
        ],
        "barbers": [
            {**dict(row), "services": list(row["services"])} for row in barber_rows
        ],
    }
    _cache, _cache_at = result, time.monotonic()
    return result


async def update_profile(pool: asyncpg.Pool, values: dict[str, Any]) -> dict[str, Any]:
    global _cache
    unknown = set(values) - PROFILE_FIELDS
    if unknown:
        raise ValueError(f"campos desconocidos: {sorted(unknown)}")
    if not values:
        return await get_site_data(pool, use_cache=False)
    if "cancellation_notice_min" in values and (
        not isinstance(values["cancellation_notice_min"], int)
        or values["cancellation_notice_min"] < 0
    ):
        raise ValueError("cancellation_notice_min debe ser un entero no negativo")
    if "payment_methods" in values and (
        not isinstance(values["payment_methods"], list)
        or not all(isinstance(item, str) for item in values["payment_methods"])
    ):
        raise ValueError("payment_methods debe ser una lista de textos")
    if "additional_info" in values and not isinstance(values["additional_info"], dict):
        raise ValueError("additional_info debe ser un objeto")

    text_fields = PROFILE_FIELDS - {
        "cancellation_notice_min",
        "payment_methods",
        "additional_info",
    }
    for field in text_fields:
        if field in values and not (
            isinstance(values[field], str) or (field == "online_store_url" and values[field] is None)
        ):
            raise ValueError(f"{field} debe ser texto")
    for required in ("name", "short_name", "address"):
        if required in values and not values[required].strip():
            raise ValueError(f"{required} no puede quedar vacío")

    columns = sorted(values)
    assignments = ", ".join(f"{column} = ${index}" for index, column in enumerate(columns, 1))
    args = [
        json.dumps(values[column]) if column == "additional_info" else values[column]
        for column in columns
    ]
    await pool.execute(
        f"UPDATE site_profile SET {assignments}, updated_at = now() WHERE singleton = true",
        *args,
    )
    _cache = None
    return await get_site_data(pool, use_cache=False)


def format_agent_context(data: dict[str, Any]) -> str:
    """Contexto compacto y legible para inyectar en el system prompt."""
    local_hours = [rule for rule in data["schedule"] if rule["barber_slug"] is None]
    specific_hours = [rule for rule in data["schedule"] if rule["barber_slug"] is not None]
    payments = ", ".join(data["payment_methods"]) or "consultar en el local"
    cancel_hours = data["cancellation_notice_min"] / 60
    cancel_notice = f"{cancel_hours:g} horas" if cancel_hours else "sin anticipación mínima"

    lines = [
        f"Nombre: {data['name']} ({data['tagline']})",
        f"Descripción: {data['description']}",
        f"Dirección: {data['address']}",
        f"Cómo llegar: {data['directions']}",
        f"Teléfono: {data['phone_display']} · WhatsApp: {data['whatsapp']}",
        f"Email: {data['email']} · Instagram: @{data['instagram']}",
        f"Medios de pago: {payments}. {data['payment_notes']}",
        f"Cancelaciones/reprogramaciones: avisar con {cancel_notice}. "
        f"{data['cancellation_notes']}",
    ]
    if data.get("online_store_url"):
        lines.append(f"Tienda online: {data['online_store_url']}")
    lines.append("Horario general:")
    lines.extend(
        f"- {rule['day']}: {rule['opens_at']}-{rule['closes_at']}" for rule in local_hours
    )
    if specific_hours:
        lines.append("Horarios específicos por profesional:")
        lines.extend(
            f"- {rule['barber_name']} · {rule['day']}: "
            f"{rule['opens_at']}-{rule['closes_at']}"
            for rule in specific_hours
        )
    lines.append("Profesionales activos:")
    lines.extend(
        f"- {barber['name']} ({barber['slug']}, {barber['role'].title()}): "
        f"{barber['bio']} Servicios: {', '.join(barber['services']) or 'sin servicios activos'}."
        for barber in data["barbers"]
    )
    if data.get("additional_info"):
        lines.append(f"Información adicional: {json.dumps(data['additional_info'], ensure_ascii=False)}")
    return "\n".join(lines)


def clear_cache() -> None:
    global _cache
    _cache = None
