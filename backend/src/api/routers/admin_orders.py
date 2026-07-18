"""Administración de pedidos del shop."""

from typing import Literal
from uuid import UUID

from fastapi import APIRouter, HTTPException, Query

from ...db.pool import get_pool
from ...db.repositories import commerce
from ..deps import AdminUser
from ..shop_schemas import OrderOut, OrderStatusIn, OrderSummaryOut

router = APIRouter(prefix="/api/v1/admin/orders", tags=["admin", "shop"])


@router.get("", response_model=list[OrderSummaryOut])
async def list_orders(
    status: Literal["pending", "confirmed", "ready", "completed", "cancelled"] | None = None,
    limit: int = Query(default=50, ge=1, le=100),
    offset: int = Query(default=0, ge=0, le=10000),
    admin: dict = AdminUser,
):
    return await commerce.list_orders(await get_pool(), status, limit, offset)


@router.get("/{order_id}", response_model=OrderOut)
async def get_order(order_id: UUID, admin: dict = AdminUser):
    try:
        return await commerce.get_order(await get_pool(), order_id)
    except commerce.CommerceError as error:
        raise HTTPException(404, str(error)) from None


@router.patch("/{order_id}/status", response_model=OrderOut)
async def update_order_status(order_id: UUID, body: OrderStatusIn, admin: dict = AdminUser):
    try:
        return await commerce.transition_order(
            await get_pool(), order_id, body.status, body.note.strip(), admin["email"]
        )
    except commerce.InvalidOrderTransition as error:
        raise HTTPException(409, str(error)) from None
    except commerce.CommerceError as error:
        raise HTTPException(404, str(error)) from None
