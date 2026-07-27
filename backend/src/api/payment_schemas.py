"""Contratos públicos mínimos del flujo de pagos."""

from datetime import datetime
from typing import Literal
from uuid import UUID

from pydantic import BaseModel, Field


class ShopPaymentPreferenceIn(BaseModel):
    cart_token: str = Field(min_length=32, max_length=128)


class AppointmentPaymentPreferenceIn(BaseModel):
    capability_token: str = Field(min_length=40, max_length=1000)


class PaymentPreferenceOut(BaseModel):
    checkout_url: str
    status_token: str
    status: str
    amount: int
    currency: str
    expires_at: str
    sandbox: bool


class PaymentStatusOut(BaseModel):
    purpose: str
    status: str
    amount: int
    currency: str
    expires_at: str
    sandbox: bool


class DemoPaymentActionIn(BaseModel):
    outcome: Literal["approved", "rejected"]


PaymentCallbackStatus = Literal[
    "pending",
    "approved",
    "rejected",
    "cancelled",
    "refunded",
    "expired",
]


class PaymentServiceCallbackIn(BaseModel):
    event: Literal[
        "payment.pending",
        "payment.approved",
        "payment.rejected",
        "payment.cancelled",
        "payment.refunded",
        "payment.expired",
    ]
    payment_intent_id: UUID
    tenant_id: str = Field(pattern=r"^[a-z0-9][a-z0-9_-]{1,62}$")
    external_reference: str = Field(min_length=1, max_length=300)
    status: PaymentCallbackStatus
    amount: int = Field(gt=0, le=1_000_000_000)
    currency: str = Field(pattern=r"^[A-Z]{3}$")
    occurred_at: datetime
