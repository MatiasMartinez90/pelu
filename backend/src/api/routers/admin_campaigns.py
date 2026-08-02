"""Draft campaigns and consent controls.

This API deliberately stops before provider delivery. Every campaign starts as
draft and marketing campaigns require an explicit approval transition.
"""

import hashlib
import json
from typing import Any, Literal
from uuid import UUID

from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel, Field

from ...db.pool import get_pool
from ..deps import AdminUser

router = APIRouter(prefix="/api/v1/admin/campaigns", tags=["admin", "campaigns"])


class CampaignIn(BaseModel):
    name: str = Field(min_length=2, max_length=160)
    kind: Literal["marketing", "operational"]
    content: dict[str, Any] = Field(default_factory=dict)
    audience: dict[str, Any] = Field(default_factory=dict)


class ConsentIn(BaseModel):
    channel: Literal["email", "whatsapp", "instagram", "telegram"]
    purpose: Literal["marketing", "service"] = "marketing"
    granted: bool
    source: str = Field(default="admin", min_length=1, max_length=80)


@router.get("")
async def list_campaigns(
    status: str | None = Query(default=None),
    limit: int = Query(default=50, ge=1, le=200),
    admin: dict = AdminUser,
):
    clauses = ["1=1"]
    values: list[Any] = []
    if status:
        values.append(status)
        clauses.append(f"status = ${len(values)}")
    values.append(limit)
    rows = await (await get_pool()).fetch(
        f"SELECT id,name,kind,status,content,audience,scheduled_at,created_by,approved_by,approved_at,created_at,updated_at FROM campaigns WHERE {' AND '.join(clauses)} ORDER BY created_at DESC LIMIT ${len(values)}",
        *values,
    )
    return [dict(row) for row in rows]


@router.post("", status_code=201)
async def create_campaign(body: CampaignIn, admin: dict = AdminUser):
    pool = await get_pool()
    row = await pool.fetchrow(
        """INSERT INTO campaigns (name,kind,content,audience,created_by)
           VALUES ($1,$2,$3::jsonb,$4::jsonb,$5)
           RETURNING id,name,kind,status,content,audience,created_by,created_at""",
        body.name.strip(), body.kind, json.dumps(body.content), json.dumps(body.audience), admin["email"],
    )
    return dict(row)


@router.post("/{campaign_id}/approve")
async def approve_campaign(campaign_id: UUID, admin: dict = AdminUser):
    pool = await get_pool()
    row = await pool.fetchrow(
        """UPDATE campaigns SET approved_by=$2, approved_at=now(), status='scheduled', updated_at=now()
           WHERE id=$1 AND status='draft'
           RETURNING id,status,approved_by,approved_at""",
        campaign_id,
        admin["email"],
    )
    if not row:
        raise HTTPException(409, "campaign is not a draft or does not exist")
    return dict(row)


@router.put("/consent/{customer_id}")
async def set_consent(customer_id: UUID, body: ConsentIn, admin: dict = AdminUser):
    pool = await get_pool()
    async with pool.acquire() as connection:
        async with connection.transaction():
            exists = await connection.fetchval("SELECT 1 FROM customers WHERE id=$1", customer_id)
            if not exists:
                raise HTTPException(404, "customer not found")
            await connection.execute(
                "UPDATE customer_consents SET revoked_at=COALESCE(revoked_at,now()) WHERE customer_id=$1 AND channel=$2 AND purpose=$3 AND revoked_at IS NULL",
                customer_id,
                body.channel,
                body.purpose,
            )
            if body.granted:
                await connection.execute(
                    "INSERT INTO customer_consents (customer_id,channel,purpose,granted_at,source) VALUES ($1,$2,$3,now(),$4)",
                    customer_id,
                    body.channel,
                    body.purpose,
                    body.source,
                )
    return {"customer_id": str(customer_id), "channel": body.channel, "purpose": body.purpose, "granted": body.granted}


@router.post("/suppressions")
async def add_suppression(channel: Literal["email", "whatsapp", "instagram", "telegram"], destination: str, reason: str = "unsubscribe", admin: dict = AdminUser):
    if not destination.strip():
        raise HTTPException(422, "destination required")
    digest = hashlib.sha256(destination.strip().lower().encode()).digest()
    await (await get_pool()).execute(
        """INSERT INTO marketing_suppressions (channel,destination_hash,reason) VALUES ($1,$2,$3)
           ON CONFLICT (channel,destination_hash) DO UPDATE SET reason=EXCLUDED.reason""",
        channel,
        digest,
        reason[:120],
    )
    return {"channel": channel, "suppressed": True}
