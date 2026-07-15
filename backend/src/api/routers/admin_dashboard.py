"""Admin: KPIs del resumen, clientes y métricas del agente."""

import asyncio
from datetime import date, datetime
from uuid import UUID

from fastapi import APIRouter, Query

from ...db.pool import get_pool
from ..deps import AdminUser

router = APIRouter(prefix="/api/v1/admin", tags=["admin"])


def _month_bounds(month: str | None) -> tuple[date, date, str]:
    """Devuelve (inicio_mes, inicio_mes_siguiente, 'YYYY-MM'). Default = mes actual.
    No permite meses futuros: si piden uno posterior al actual, cae al actual."""
    today = date.today()
    current_start = today.replace(day=1)
    start = current_start
    if month:
        try:
            y, m = (int(x) for x in month.split("-", 1))
            start = date(y, m, 1)
        except (ValueError, TypeError):
            start = current_start
    if start > current_start:
        start = current_start
    nxt = date(start.year + 1, 1, 1) if start.month == 12 else date(start.year, start.month + 1, 1)
    return start, nxt, start.strftime("%Y-%m")


@router.get("/dashboard/summary")
async def dashboard_summary(month: str | None = Query(default=None), admin: dict = AdminUser):
    pool = await get_pool()
    month_start, month_end, month_str = _month_bounds(month)

    # Las 4 queries son independientes entre sí: corren en paralelo en vez de
    # una tras otra (cada pool.fetch* toma su propia conexión del pool).
    kpis, daily, top_services, barber_perf = await asyncio.gather(
        pool.fetchrow(
            """
            SELECT
              COALESCE(SUM(price_at_booking) FILTER (WHERE status IN ('active','completed')), 0) AS month_revenue,
              COUNT(*) FILTER (WHERE status IN ('active','completed')) AS month_appointments,
              COUNT(DISTINCT customer_id) FILTER (WHERE status IN ('active','completed')) AS month_customers,
              COUNT(*) FILTER (WHERE status = 'cancelled') AS month_cancelled,
              COUNT(*) FILTER (WHERE channel = 'whatsapp' AND status IN ('active','completed')) AS month_whatsapp,
              COUNT(*) FILTER (WHERE channel = 'web' AND status IN ('active','completed')) AS month_web
            FROM appointments WHERE starts_at >= $1 AND starts_at < $2
            """,
            month_start,
            month_end,
        ),
        pool.fetch(
            """
            SELECT date_trunc('day', starts_at)::date AS day,
                   COALESCE(SUM(price_at_booking), 0) AS revenue
            FROM appointments
            WHERE starts_at >= $1 AND starts_at < $2
              AND status IN ('active','completed')
            GROUP BY 1 ORDER BY 1
            """,
            month_start,
            month_end,
        ),
        pool.fetch(
            """
            SELECT s.name, COUNT(*) AS count
            FROM appointments a JOIN services s ON s.id = a.service_id
            WHERE a.starts_at >= $1 AND a.starts_at < $2 AND a.status IN ('active','completed')
            GROUP BY s.name ORDER BY count DESC LIMIT 5
            """,
            month_start,
            month_end,
        ),
        pool.fetch(
            """
            SELECT b.name, COALESCE(SUM(a.price_at_booking), 0) AS revenue, COUNT(*) AS count
            FROM appointments a JOIN barbers b ON b.id = a.barber_id
            WHERE a.starts_at >= $1 AND a.starts_at < $2 AND a.status IN ('active','completed')
            GROUP BY b.name ORDER BY revenue DESC
            """,
            month_start,
            month_end,
        ),
    )
    return {
        "month": month_str,
        "kpis": dict(kpis),
        "revenue_daily": [dict(r) for r in daily],
        "top_services": [dict(r) for r in top_services],
        "barber_performance": [dict(r) for r in barber_perf],
    }


@router.get("/customers")
async def list_customers(
    search: str = "",
    cursor: str | None = None,
    limit: int = Query(default=50, ge=1, le=100),
    admin: dict = AdminUser,
):
    pool = await get_pool()
    cursor_at: datetime | None = None
    cursor_id: UUID | None = None
    if cursor:
        try:
            raw_at, raw_id = cursor.split("|", 1)
            cursor_at, cursor_id = datetime.fromisoformat(raw_at), UUID(raw_id)
        except (TypeError, ValueError):
            cursor_at = cursor_id = None
    rows = await pool.fetch(
        """
        WITH stats AS (
          SELECT c.id, c.phone, c.name, c.email, c.first_channel, c.created_at,
                 COUNT(a.id) FILTER (WHERE a.status = 'completed') AS visits,
                 COALESCE(SUM(a.price_at_booking) FILTER (WHERE a.status = 'completed'), 0) AS spent,
                 MAX(a.starts_at) FILTER (WHERE a.status = 'completed') AS last_visit,
                 COALESCE(MAX(a.starts_at) FILTER (WHERE a.status = 'completed'), c.created_at) AS sort_at
          FROM customers c LEFT JOIN appointments a ON a.customer_id = c.id
          WHERE $1 = '' OR c.name ILIKE '%' || $1 || '%' OR c.phone LIKE '%' || $1 || '%'
          GROUP BY c.id
        )
        SELECT * FROM stats
        WHERE $2::timestamptz IS NULL OR (sort_at, id) < ($2, $3)
        ORDER BY sort_at DESC, id DESC LIMIT $4
        """,
        search,
        cursor_at,
        cursor_id,
        limit + 1,
    )
    has_more = len(rows) > limit
    page = rows[:limit]
    items = []
    for row in page:
        item = dict(row)
        item.pop("sort_at", None)
        items.append(item)
    next_cursor = None
    if has_more and page:
        next_cursor = f"{page[-1]['sort_at'].isoformat()}|{page[-1]['id']}"
    return {"items": items, "next_cursor": next_cursor}


@router.get("/services")
async def list_services_admin(admin: dict = AdminUser):
    pool = await get_pool()
    rows = await pool.fetch(
        """
        SELECT id, slug, name, price, duration_min, badge, variable_price, active
        FROM services ORDER BY sort_order
        """
    )
    return [dict(r) for r in rows]


@router.get("/agent/events")
async def agent_events_feed(limit: int = Query(default=20, le=100), admin: dict = AdminUser):
    pool = await get_pool()
    rows = await pool.fetch(
        """
        SELECT event_type, conversation_id, phone, cost_usd, latency_ms, created_at
        FROM agent_events
        WHERE event_type IN ('booking_created','booking_cancelled','booking_rescheduled',
                             'handoff','rate_limited','error')
        ORDER BY created_at DESC LIMIT $1
        """,
        limit,
    )
    return [dict(r) for r in rows]


@router.get("/agent/metrics")
async def agent_metrics(days: int = Query(default=30, le=365), admin: dict = AdminUser):
    pool = await get_pool()
    row = await pool.fetchrow(
        """
        SELECT
          COUNT(*) FILTER (WHERE event_type = 'message_in') AS messages_in,
          COUNT(*) FILTER (WHERE event_type = 'message_out') AS messages_out,
          COUNT(*) FILTER (WHERE event_type = 'booking_created') AS bookings,
          COUNT(*) FILTER (WHERE event_type = 'booking_cancelled') AS cancellations,
          COUNT(*) FILTER (WHERE event_type = 'handoff') AS handoffs,
          COUNT(*) FILTER (WHERE event_type = 'error') AS errors,
          COALESCE(SUM(cost_usd), 0) AS cost_usd,
          COALESCE(AVG(latency_ms) FILTER (WHERE event_type = 'message_out'), 0) AS avg_latency_ms
        FROM agent_events WHERE created_at >= now() - ($1 || ' days')::interval
        """,
        str(days),
    )
    return dict(row)
