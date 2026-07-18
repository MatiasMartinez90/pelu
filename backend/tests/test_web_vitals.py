from src.observability import normalize_rum_path


def test_normalize_rum_path_keeps_bounded_public_routes():
    assert normalize_rum_path("/agendar?servicio=corte") == "/agendar"
    assert normalize_rum_path("/servicios/corte-masculino") == "/servicios/:slug"
    assert normalize_rum_path("admin") == "/admin"


def test_normalize_rum_path_collapses_unknown_and_sensitive_paths():
    assert normalize_rum_path("/api/me/private-customer-id") == "/other"
    assert normalize_rum_path("/anything/user-123") == "/other"
