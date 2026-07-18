"""Contratos públicos y administrativos del shop."""

import re
from typing import Literal
from uuid import UUID

from pydantic import BaseModel, EmailStr, Field, field_validator

from .schemas import PHONE_RE

SLUG_RE = re.compile(r"^[a-z0-9]+(?:-[a-z0-9]+)*$")


class CategoryOut(BaseModel):
    slug: str
    name: str
    description: str
    product_count: int


class CategoryIn(BaseModel):
    slug: str
    name: str = Field(min_length=2, max_length=100)
    description: str = Field(default="", max_length=1000)
    sort_order: int = Field(default=0, ge=0, le=10000)

    @field_validator("slug")
    @classmethod
    def valid_category_slug(cls, value: str) -> str:
        if not SLUG_RE.match(value):
            raise ValueError("slug inválido")
        return value


class ProductOut(BaseModel):
    slug: str
    name: str
    sku: str
    description: str
    short_description: str
    category_slug: str | None
    category_name: str | None
    image_url: str | None
    gallery: list[str]
    price: int
    available_qty: int
    in_stock: bool
    featured: bool


class ProductListOut(BaseModel):
    items: list[ProductOut]
    total: int
    limit: int
    offset: int


class CartCreateIn(BaseModel):
    customer_email: EmailStr | None = None


class CartItemSetIn(BaseModel):
    quantity: int = Field(ge=1, le=99)


class CartItemOut(BaseModel):
    product: ProductOut
    quantity: int
    line_total: int


class CartOut(BaseModel):
    token: str
    status: str
    currency: str
    items: list[CartItemOut]
    subtotal: int
    total_quantity: int
    expires_at: str


class CheckoutCustomerIn(BaseModel):
    name: str = Field(min_length=2, max_length=120)
    email: EmailStr
    phone: str

    @field_validator("name")
    @classmethod
    def clean_name(cls, value: str) -> str:
        return value.strip()

    @field_validator("phone")
    @classmethod
    def clean_phone(cls, value: str) -> str:
        value = value.strip()
        if not PHONE_RE.match(value):
            raise ValueError("teléfono inválido")
        return re.sub(r"[\s\-()]", "", value)


class CheckoutIn(BaseModel):
    cart_token: str = Field(min_length=32, max_length=128)
    customer: CheckoutCustomerIn
    payment_method: Literal["pay_at_store"] = "pay_at_store"
    customer_notes: str = Field(default="", max_length=1000)


class OrderItemOut(BaseModel):
    product_slug: str
    product_name: str
    sku: str
    unit_price: int
    quantity: int
    line_total: int


class OrderOut(BaseModel):
    id: UUID
    order_number: int
    customer_name: str
    customer_email: str
    customer_phone: str
    status: str
    payment_method: str
    payment_status: str
    currency: str
    subtotal: int
    total: int
    pickup_location: str
    customer_notes: str
    cancellation_reason: str
    created_at: str
    updated_at: str
    items: list[OrderItemOut]


class OrderSummaryOut(BaseModel):
    id: UUID
    order_number: int
    customer_name: str
    status: str
    payment_method: str
    payment_status: str
    total: int
    currency: str
    item_count: int
    created_at: str


class OrderStatusIn(BaseModel):
    status: Literal["confirmed", "ready", "completed", "cancelled"]
    note: str = Field(default="", max_length=500)


class ProductShopPatch(BaseModel):
    slug: str | None = None
    description: str | None = Field(default=None, max_length=5000)
    short_description: str | None = Field(default=None, max_length=240)
    category_slug: str | None = None
    image_url: str | None = Field(default=None, max_length=2000)
    gallery: list[str] | None = Field(default=None, max_length=12)
    featured: bool | None = None
    sort_order: int | None = Field(default=None, ge=0, le=10000)
    active: bool | None = None

    @field_validator("slug", "category_slug")
    @classmethod
    def valid_slug(cls, value: str | None) -> str | None:
        if value is not None and not SLUG_RE.match(value):
            raise ValueError("slug inválido")
        return value
