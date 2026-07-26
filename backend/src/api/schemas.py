"""Modelos Pydantic de la API pública."""

import re
from datetime import date, datetime
from uuid import UUID

from typing import Literal

from pydantic import BaseModel, EmailStr, Field, field_validator

PHONE_RE = re.compile(r"^\+?[0-9][0-9\s\-()]{6,20}$")


class BarberOut(BaseModel):
    slug: str
    name: str
    role: str
    photo_url: str | None
    bio: str
    instagram: str


class ServiceOut(BaseModel):
    slug: str
    name: str
    description: str
    price: int
    duration_min: int
    badge: str | None
    variable_price: bool


class BookingBootstrapOut(BaseModel):
    barbers: list[BarberOut]
    services_by_barber: dict[str, list[ServiceOut]]


class WebVitalIn(BaseModel):
    name: Literal["FCP", "LCP", "CLS", "INP", "TTFB"]
    value: float = Field(ge=0, le=120_000)
    rating: Literal["good", "needs-improvement", "poor"]
    path: str = Field(min_length=1, max_length=160)
    device: Literal["mobile", "desktop"]


class AvailabilityOut(BaseModel):
    date: date
    barber: str
    service: str
    slots: list[str]


class CustomerIn(BaseModel):
    name: str
    phone: str
    email: EmailStr | None = None

    @field_validator("name")
    @classmethod
    def name_min(cls, v: str) -> str:
        v = v.strip()
        if len(v) < 2:
            raise ValueError("nombre demasiado corto")
        return v

    @field_validator("phone")
    @classmethod
    def phone_format(cls, v: str) -> str:
        v = v.strip()
        if not PHONE_RE.match(v):
            raise ValueError("teléfono inválido")
        return re.sub(r"[\s\-()]", "", v)


class BookingIn(BaseModel):
    barber: str
    service: str
    date: date
    time: str  # "HH:MM"
    customer: CustomerIn

    @field_validator("time")
    @classmethod
    def time_format(cls, v: str) -> str:
        if not re.match(r"^([01][0-9]|2[0-3]):[0-5][0-9]$", v):
            raise ValueError("hora inválida, formato HH:MM")
        return v


class BookingOut(BaseModel):
    id: UUID
    barber: str
    service: str
    starts_at: datetime
    ends_at: datetime
    status: str
    price: int
    channel: str
    payment_token: str | None = None
