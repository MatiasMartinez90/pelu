"""Portal del barbero logueado (/barbero): su agenda y sus estadísticas.

Todo se filtra por el barber del token — un barbero no puede ver datos de otros.
"""

from datetime import date as date_type

from fastapi import APIRouter, Query

from ...db.pool import get_pool
from ..deps import BarberUser
from .admin_dashboard import _month_bounds

router = APIRouter(prefix="/api/v1/barber", tags=["barbero"])


@router.get("/me")
async def whoami(barber: dict = BarberUser):
    return {"slug": barber["slug"], "name": barber["name"], "email": barber.get("email")}


@router.get("/agenda")
async def my_agenda(date: date_type = Query(...), barber: dict = BarberUser):
    """Turnos propios de un día."""
    pool = await get_pool()
    rows = await pool.fetch(
        """
        SELECT a.id, a.starts_at, a.ends_at, a.status, a.price_at_booking, a.channel,
               c.name AS customer, s.name AS service
        FROM appointments a
        JOIN customers c ON c.id = a.customer_id
        JOIN services s ON s.id = a.service_id
        WHERE a.starts_at::date = $1 AND a.barber_id = $2
        ORDER BY a.starts_at
        """,
        date,
        barber["id"],
    )
    return [dict(r) for r in rows]


@router.get("/stats")
async def my_stats(month: str | None = Query(default=None), barber: dict = BarberUser):
    """KPIs propios del mes: ingresos, turnos completados, cancelaciones, top servicios."""
    pool = await get_pool()
    month_start, month_end, month_str = _month_bounds(month)

    kpis = await pool.fetchrow(
        """
        SELECT
          COALESCE(SUM(price_at_booking) FILTER (WHERE status IN ('active','completed')), 0) AS revenue,
          COUNT(*) FILTER (WHERE status IN ('active','completed')) AS appointments,
          COUNT(*) FILTER (WHERE status = 'completed') AS completed,
          COUNT(*) FILTER (WHERE status = 'cancelled') AS cancelled,
          COUNT(DISTINCT customer_id) FILTER (WHERE status IN ('active','completed')) AS customers
        FROM appointments
        WHERE barber_id = $1 AND starts_at >= $2 AND starts_at < $3
        """,
        barber["id"],
        month_start,
        month_end,
    )
    top_services = await pool.fetch(
        """
        SELECT s.name, COUNT(*) AS count
        FROM appointments a JOIN services s ON s.id = a.service_id
        WHERE a.barber_id = $1 AND a.starts_at >= $2 AND a.starts_at < $3
          AND a.status IN ('active','completed')
        GROUP BY s.name ORDER BY count DESC LIMIT 5
        """,
        barber["id"],
        month_start,
        month_end,
    )
    return {
        "month": month_str,
        "barber": barber["name"],
        "kpis": dict(kpis),
        "top_services": [dict(r) for r in top_services],
    }
