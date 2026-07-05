"""Cálculo de slots disponibles.

slots(barbero, servicio, fecha) = reglas de horario − bloqueos − turnos activos.
Toda la aritmética se hace en la TZ del local (America/Argentina/Buenos_Aires);
la DB guarda timestamptz.
"""

from datetime import date, datetime, time, timedelta
from zoneinfo import ZoneInfo

import asyncpg

from ..config import get_settings
from ..db.repositories import settings_repo


def _tz() -> ZoneInfo:
    return ZoneInfo(get_settings().timezone)


async def get_slots(
    pool: asyncpg.Pool,
    barber: dict,
    service: dict,
    day: date,
    *,
    ignore_lead_time: bool = False,
) -> list[str]:
    """Slots "HH:MM" en los que el servicio entra completo para ese barbero ese día."""
    app = await settings_repo.get_all(pool)
    if not app["agenda_open"]:
        return []

    tz = _tz()
    now = datetime.now(tz)
    if day > (now.date() + timedelta(days=int(app["max_days_ahead"]))):
        return []

    # Regla de horario: la específica del barbero pisa la del local.
    dow = (day.weekday() + 1) % 7  # Python: lunes=0 → nuestro dow: domingo=0
    rule = await pool.fetchrow(
        """
        SELECT opens_at, closes_at FROM schedule_rules
        WHERE dow = $1 AND (barber_id = $2 OR barber_id IS NULL)
        ORDER BY barber_id NULLS LAST LIMIT 1
        """,
        dow,
        barber["id"],
    )
    if rule is None:
        return []

    granularity = timedelta(minutes=int(app["slot_granularity_min"]))
    duration = timedelta(minutes=service["duration_min"])
    min_start = now + timedelta(minutes=int(app["min_lead_minutes"]))

    day_open = datetime.combine(day, rule["opens_at"], tzinfo=tz)
    day_close = datetime.combine(day, rule["closes_at"], tzinfo=tz)

    # Ocupaciones del día: turnos activos del barbero + bloqueos (suyos o del local).
    busy = await pool.fetch(
        """
        SELECT starts_at, ends_at FROM appointments
        WHERE barber_id = $1 AND status = 'active'
          AND starts_at < $3 AND ends_at > $2
        UNION ALL
        SELECT starts_at, ends_at FROM availability_blocks
        WHERE (barber_id = $1 OR barber_id IS NULL)
          AND starts_at < $3 AND ends_at > $2
        """,
        barber["id"],
        day_open,
        day_close,
    )
    intervals = [(r["starts_at"], r["ends_at"]) for r in busy]

    slots: list[str] = []
    cursor = day_open
    while cursor + duration <= day_close:
        if ignore_lead_time or cursor >= min_start:
            slot_end = cursor + duration
            if not any(s < slot_end and e > cursor for s, e in intervals):
                slots.append(cursor.strftime("%H:%M"))
        cursor += granularity
    return slots


def slot_to_range(day: date, hhmm: str, duration_min: int) -> tuple[datetime, datetime]:
    """Convierte fecha + "HH:MM" (hora local) a (starts_at, ends_at) aware."""
    tz = _tz()
    h, m = hhmm.split(":")
    start = datetime.combine(day, time(int(h), int(m)), tzinfo=tz)
    return start, start + timedelta(minutes=duration_min)
