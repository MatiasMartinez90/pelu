"""Passwordless customer identity: phone possession verified by registered email."""

import hashlib
import secrets
from datetime import UTC, datetime

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, EmailStr, Field

from ...config import get_settings
from ...db.pool import get_pool
from ...integrations.email import EmailMessage, get_email_provider

router = APIRouter(prefix="/api/v1/identity", tags=["identity"])


class OTPRequest(BaseModel):
    phone: str = Field(min_length=7, max_length=32)
    email: EmailStr


class OTPVerify(BaseModel):
    challenge_id: str
    code: str = Field(min_length=6, max_length=6, pattern=r"^[0-9]{6}$")


def _hash_code(code: str) -> bytes:
    return hashlib.sha256(f"{get_settings().otp_pepper}:{code}".encode()).digest()


@router.post("/phone/request", status_code=202)
async def request_phone_otp(body: OTPRequest):
    """Send an OTP only to the email already stored for the matching phone."""
    pool = await get_pool()
    row = await pool.fetchrow(
        "SELECT id, phone, email, name FROM customers WHERE phone=$1 AND lower(email)=lower($2)",
        body.phone.strip(), str(body.email).lower(),
    )
    if not row:
        return {"accepted": True}
    recent = await pool.fetchval(
        "SELECT count(*) FROM verification_challenges WHERE customer_id=$1 AND created_at > now() - interval '15 minutes'",
        row["id"],
    )
    if int(recent or 0) >= 3:
        return {"accepted": True}
    code = f"{secrets.randbelow(1_000_000):06d}"
    settings = get_settings()
    challenge = await pool.fetchrow(
        """INSERT INTO verification_challenges (customer_id,phone,email,code_hash,expires_at)
           VALUES ($1,$2,$3,$4,now()+($5::int * interval '1 minute')) RETURNING id""",
        row["id"], row["phone"], row["email"], _hash_code(code), settings.otp_ttl_minutes,
    )
    try:
        await get_email_provider().send(EmailMessage(
            to=row["email"], subject="Tu código para ingresar",
            text=f"Tu código es {code}. Vence en {settings.otp_ttl_minutes} minutos.",
            html=f"<p>Tu código para ingresar es <strong>{code}</strong>.</p><p>Vence en {settings.otp_ttl_minutes} minutos.</p>",
        ))
    except Exception:
        await pool.execute("DELETE FROM verification_challenges WHERE id=$1", challenge["id"])
        raise HTTPException(503, "no se pudo enviar el código") from None
    return {"accepted": True, "challenge_id": str(challenge["id"]), "expires_in": settings.otp_ttl_minutes * 60}


@router.post("/phone/verify")
async def verify_phone_otp(body: OTPVerify):
    pool = await get_pool()
    row = await pool.fetchrow(
        """SELECT id,customer_id,phone,email,code_hash,attempts,expires_at,consumed_at
           FROM verification_challenges WHERE id=$1""", body.challenge_id,
    )
    if not row or row["consumed_at"] or row["expires_at"] <= datetime.now(UTC):
        raise HTTPException(400, "código inválido o vencido")
    settings = get_settings()
    if row["attempts"] >= settings.otp_max_attempts:
        raise HTTPException(429, "demasiados intentos")
    if not secrets.compare_digest(bytes(row["code_hash"]), _hash_code(body.code)):
        await pool.execute("UPDATE verification_challenges SET attempts=attempts+1 WHERE id=$1", row["id"])
        raise HTTPException(400, "código inválido o vencido")
    await pool.execute("UPDATE verification_challenges SET consumed_at=now() WHERE id=$1", row["id"])
    return {"verified": True, "customer_id": str(row["customer_id"]), "phone": row["phone"], "email": row["email"]}
