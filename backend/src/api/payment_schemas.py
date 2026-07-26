"""Contratos públicos mínimos del flujo de pagos."""

from typing import Literal

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
