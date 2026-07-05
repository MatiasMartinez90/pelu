"""Admin: KPIs del resumen, clientes y métricas del agente."""

from datetime import date, timedelta

from fastapi import APIRouter, Query

from ...db.pool import get_pool
from ..deps import AdminUser

router = APIRouter(prefix="/api/v1/admin", tags=["admin"])


@router.get("/dashboard/summary")
async def dashboard_summary(admin: dict = AdminUser):
    pool = await get_pool()
    today = date.today()
    month_start = today.replace(day=1)
    week_ago = today - timedelta(days=6)

    kpis = await pool.fetchrow(
        """
        SELECT
          COALESCE(SUM(price_at_booking) FILTER (WHERE status IN ('active','completed')), 0) AS month_revenue,
          COUNT(*) FILTER (WHERE status IN ('active','completed')) AS month_appointments,
          COUNT(DISTINCT customer_id) FILTER (WHERE status IN ('active','completed')) AS month_customers,
          COUNT(*) FILTER (WHERE status = 'cancelled') AS month_cancelled,
          COUNT(*) FILTER (WHERE channel = 'whatsapp' AND status IN ('active','completed')) AS month_whatsapp,
          COUNT(*) FILTER (WHERE channel = 'web' AND status IN ('active','completed')) AS month_web
        FROM appointments WHERE starts_at >= $1
        """,
        month_start,
    )
    daily = await pool.fetch(
        """
        SELECT date_trunc('day', starts_at)::date AS day,
               COALESCE(SUM(price_at_booking), 0) AS revenue
        FROM appointments
        WHERE starts_at >= $1 AND status IN ('active','completed')
        GROUP BY 1 ORDER BY 1
        """,
        week_ago,
    )
    top_services = await pool.fetch(
        """
        SELECT s.name, COUNT(*) AS count
        FROM appointments a JOIN services s ON s.id = a.service_id
        WHERE a.starts_at >= $1 AND a.status IN ('active','completed')
        GROUP BY s.name ORDER BY count DESC LIMIT 5
        """,
        month_start,
    )
    barber_perf = await pool.fetch(
        """
        SELECT b.name, COALESCE(SUM(a.price_at_booking), 0) AS revenue, COUNT(*) AS count
        FROM appointments a JOIN barbers b ON b.id = a.barber_id
        WHERE a.starts_at >= $1 AND a.status IN ('active','completed')
        GROUP BY b.name ORDER BY revenue DESC
        """,
        month_start,
    )
    return {
        "kpis": dict(kpis),
        "revenue_daily": [dict(r) for r in daily],
        "top_services": [dict(r) for r in top_services],
        "barber_performance": [dict(r) for r in barber_perf],
    }


@router.get("/customers")
async def list_customers(search: str = "", admin: dict = AdminUser):
    pool = await get_pool()
    rows = await pool.fetch(
        """
        SELECT c.id, c.phone, c.name, c.email, c.first_channel, c.created_at,
               COUNT(a.id) FILTER (WHERE a.status = 'completed') AS visits,
               COALESCE(SUM(a.price_at_booking) FILTER (WHERE a.status = 'completed'), 0) AS spent,
               MAX(a.starts_at) FILTER (WHERE a.status = 'completed') AS last_visit
        FROM customers c LEFT JOIN appointments a ON a.customer_id = c.id
        WHERE $1 = '' OR c.name ILIKE '%' || $1 || '%' OR c.phone LIKE '%' || $1 || '%'
        GROUP BY c.id ORDER BY last_visit DESC NULLS LAST LIMIT 100
        """,
        search,
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
