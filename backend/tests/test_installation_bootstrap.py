import os
from dataclasses import replace
from pathlib import Path

import asyncpg
import pytest

from src.services.installation_bootstrap import (
    BootstrapConflict,
    apply_installation,
    load_bundle,
)

ROOT = Path(__file__).resolve().parents[2]
AURORA_PUBLIC = ROOT / "tests/fixtures/installation.aurora.json"
AURORA_SEED = ROOT / "tests/fixtures/installation.aurora.seed.json"


def test_second_installation_bundle_is_valid_and_brand_independent():
    aurora = load_bundle(AURORA_PUBLIC, AURORA_SEED)
    sample = load_bundle(ROOT / "config/installation.json", ROOT / "config/installation.seed.json")

    assert aurora.installation_id == "aurora"
    assert aurora.public["brand"]["name"] == "Estudio Aurora"
    assert {professional.name for professional in aurora.seed.professionals} == {"Sofía", "Mara"}
    assert aurora.config_hash != sample.config_hash


@pytest.mark.skipif(not os.getenv("TEST_DATABASE_URL"), reason="requires disposable PostgreSQL")
@pytest.mark.asyncio
async def test_bootstrap_is_transactional_idempotent_and_requires_explicit_updates():
    connection = await asyncpg.connect(os.environ["TEST_DATABASE_URL"])
    bundle = load_bundle(AURORA_PUBLIC, AURORA_SEED)
    try:
        await connection.execute("DELETE FROM installation_bootstrap")
        first = await apply_installation(connection, bundle)
        second = await apply_installation(connection, bundle)

        assert first == {"status": "created", "installation": "aurora"}
        assert second == {"status": "unchanged", "installation": "aurora"}
        assert (
            await connection.fetchval("SELECT name FROM site_profile WHERE singleton")
            == "Estudio Aurora"
        )
        assert await connection.fetchval("SELECT count(*) FROM barbers WHERE active") == 2
        assert await connection.fetchval("SELECT count(*) FROM services WHERE active") == 3
        assert await connection.fetchval("SELECT count(*) FROM schedule_rules") == 5
        assert (
            await connection.fetchval(
                "SELECT count(*) FROM products WHERE active AND sku = 'AUR-TRAT-01'"
            )
            == 1
        )

        changed = replace(bundle, config_hash="0" * 64)
        assert (await apply_installation(connection, changed, dry_run=True))[
            "status"
        ] == "would_update"
        with pytest.raises(BootstrapConflict):
            await apply_installation(connection, changed)
        updated = await apply_installation(connection, changed, allow_update=True)
        assert updated == {"status": "updated", "installation": "aurora"}
    finally:
        await connection.close()
