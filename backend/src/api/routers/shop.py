"""API pública del shop: catálogo, carrito y checkout con retiro local."""

from fastapi import APIRouter, Header, HTTPException, Query, Request, Response

from ...config import get_settings
from ...db.pool import get_pool
from ...db.repositories import commerce
from ...integrations.redis_client import rate_limit_exceeded
from ..client_ip import get_client_ip
from ..shop_schemas import (
    CartCreateIn,
    CartItemSetIn,
    CartOut,
    CategoryOut,
    CheckoutIn,
    OrderOut,
    ProductListOut,
    ProductOut,
)

router = APIRouter(prefix="/api/v1/shop", tags=["shop"])


def _commerce_error(error: commerce.CommerceError) -> HTTPException:
    if isinstance(error, commerce.CartNotFound):
        return HTTPException(404, str(error))
    if isinstance(error, commerce.StockConflict):
        return HTTPException(409, str(error))
    if isinstance(error, (commerce.CartUnavailable, commerce.ProductUnavailable)):
        return HTTPException(422, str(error))
    return HTTPException(400, str(error))


@router.get("/categories", response_model=list[CategoryOut])
async def categories(response: Response):
    response.headers["Cache-Control"] = "public, max-age=60, s-maxage=300, stale-while-revalidate=86400"
    return await commerce.list_categories(await get_pool())


@router.get("/products", response_model=ProductListOut)
async def products(
    response: Response,
    category: str | None = None,
    q: str | None = Query(default=None, min_length=2, max_length=80),
    featured: bool | None = None,
    limit: int = Query(default=24, ge=1, le=100),
    offset: int = Query(default=0, ge=0, le=10000),
):
    response.headers["Cache-Control"] = "public, max-age=30, s-maxage=120, stale-while-revalidate=600"
    return await commerce.list_products(
        await get_pool(), category=category, search=q, featured=featured, limit=limit, offset=offset
    )


@router.get("/products/{slug}", response_model=ProductOut)
async def product(slug: str, response: Response):
    value = await commerce.get_product(await get_pool(), slug)
    if value is None:
        raise HTTPException(404, "producto inexistente")
    response.headers["Cache-Control"] = "public, max-age=30, s-maxage=120, stale-while-revalidate=600"
    return value


@router.post("/carts", response_model=CartOut, status_code=201)
async def create_cart(body: CartCreateIn, request: Request):
    if await rate_limit_exceeded(f"shop-cart:{get_client_ip(request)}"):
        raise HTTPException(429, "Demasiadas solicitudes")
    return await commerce.create_cart(
        await get_pool(), str(body.customer_email) if body.customer_email else None,
        get_settings().currency,
    )


@router.get("/carts/{token}", response_model=CartOut)
async def get_cart(token: str):
    try:
        return await commerce.get_cart(await get_pool(), token)
    except commerce.CommerceError as error:
        raise _commerce_error(error) from None


@router.put("/carts/{token}/items/{product_slug}", response_model=CartOut)
async def set_item(token: str, product_slug: str, body: CartItemSetIn, request: Request):
    if await rate_limit_exceeded(f"shop-cart:{get_client_ip(request)}"):
        raise HTTPException(429, "Demasiadas solicitudes")
    try:
        return await commerce.set_cart_item(await get_pool(), token, product_slug, body.quantity)
    except commerce.CommerceError as error:
        raise _commerce_error(error) from None


@router.delete("/carts/{token}/items/{product_slug}", response_model=CartOut)
async def remove_item(token: str, product_slug: str, request: Request):
    if await rate_limit_exceeded(f"shop-cart:{get_client_ip(request)}"):
        raise HTTPException(429, "Demasiadas solicitudes")
    try:
        return await commerce.remove_cart_item(await get_pool(), token, product_slug)
    except commerce.CommerceError as error:
        raise _commerce_error(error) from None


@router.post("/checkout", response_model=OrderOut)
async def checkout(
    body: CheckoutIn,
    request: Request,
    response: Response,
    idempotency_key: str = Header(..., alias="Idempotency-Key", min_length=16, max_length=128),
):
    if await rate_limit_exceeded(f"shop-checkout:{get_client_ip(request)}"):
        raise HTTPException(429, "Demasiados intentos de compra")
    try:
        order, created = await commerce.checkout(
            await get_pool(), cart_token=body.cart_token, idempotency_key=idempotency_key,
            customer_name=body.customer.name, customer_email=str(body.customer.email),
            customer_phone=body.customer.phone, payment_method=body.payment_method,
            customer_notes=body.customer_notes.strip(),
        )
    except commerce.CommerceError as error:
        raise _commerce_error(error) from None
    response.status_code = 201 if created else 200
    return order
