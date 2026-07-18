import pytest
from pydantic import ValidationError

from src.config import Settings


def test_demo_payment_configuration_is_fail_fast():
    with pytest.raises(ValidationError, match="PAYMENT_LINK_SECRET"):
        Settings(
            payment_provider="demo",
            payment_public_url="https://shop.example.com",
            payment_webhook_url="https://api.example.com/webhook/mercado-pago",
        )


def test_real_payment_configuration_requires_provider_credentials():
    with pytest.raises(ValidationError, match="credenciales de Mercado Pago"):
        Settings(
            payment_provider="mercado_pago",
            payment_public_url="https://shop.example.com",
            payment_webhook_url="https://api.example.com/webhook/mercado-pago",
            payment_link_secret="payment-link-secret-with-more-than-32-chars",
        )
