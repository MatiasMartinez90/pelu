"""Bootstrap transaccional de una instalación single-tenant."""

from __future__ import annotations

import hashlib
import json
import re
from dataclasses import dataclass
from datetime import time
from pathlib import Path
from typing import Any, Literal
from zoneinfo import ZoneInfo, ZoneInfoNotFoundError

import asyncpg
from pydantic import BaseModel, ConfigDict, Field, model_validator


class StrictModel(BaseModel):
    model_config = ConfigDict(extra="forbid")


class SeedService(StrictModel):
    slug: str = Field(pattern=r"^[a-z0-9][a-z0-9-]*[a-z0-9]$")
    name: str = Field(min_length=2, max_length=120)
    description: str = Field(max_length=1000)
    price: int = Field(ge=0, le=100_000_000)
    durationMinutes: int = Field(ge=5, le=1440)
    badge: str | None = None
    variablePrice: bool = False
    sortOrder: int = Field(ge=0, le=10_000)


class SeedProfessional(StrictModel):
    slug: str = Field(pattern=r"^[a-z0-9][a-z0-9-]*[a-z0-9]$")
    name: str = Field(min_length=2, max_length=100)
    role: Literal["BARBERO", "ESTILISTA"]
    photoUrl: str | None
    bio: str = Field(max_length=500)
    instagram: str = Field(max_length=100)
    email: str | None = None
    sortOrder: int = Field(ge=0, le=10_000)
    services: list[str] = Field(min_length=1)


class SeedSchedule(StrictModel):
    professional: str | None = None
    dayOfWeek: int = Field(ge=0, le=6)
    opensAt: time
    closesAt: time

    @model_validator(mode="after")
    def closes_after_opening(self):
        if self.closesAt <= self.opensAt:
            raise ValueError("closesAt debe ser posterior a opensAt")
        return self


class SeedInventory(StrictModel):
    sku: str = Field(pattern=r"^[A-Z0-9][A-Z0-9_-]{1,63}$")
    name: str = Field(min_length=2, max_length=160)
    slug: str | None = Field(default=None, pattern=r"^[a-z0-9]+(?:-[a-z0-9]+)*$")
    description: str = Field(default="", max_length=5000)
    shortDescription: str = Field(default="", max_length=240)
    categorySlug: str = Field(default="cuidado-personal", pattern=r"^[a-z0-9]+(?:-[a-z0-9]+)*$")
    categoryName: str = Field(default="Cuidado personal", min_length=2, max_length=100)
    imageUrl: str | None = Field(default=None, max_length=2000)
    gallery: list[str] = Field(default_factory=list, max_length=12)
    featured: bool = False
    sortOrder: int = Field(default=0, ge=0, le=10_000)
    quantity: int = Field(ge=0, le=1_000_000)
    minimumQuantity: int = Field(ge=0, le=1_000_000)
    price: int = Field(ge=0, le=100_000_000)


class SeedSettings(StrictModel):
    agenda_open: bool
    booking_channels: dict[str, bool] = Field(min_length=1)
    slot_granularity_min: int = Field(ge=5, le=240)
    min_lead_minutes: int = Field(ge=0, le=10_080)
    max_days_ahead: int = Field(ge=1, le=730)


class SeedConfig(StrictModel):
    schemaVersion: Literal[1]
    professionals: list[SeedProfessional] = Field(min_length=1)
    services: list[SeedService] = Field(min_length=1)
    schedules: list[SeedSchedule] = Field(min_length=1)
    settings: SeedSettings
    inventory: list[SeedInventory]

    @model_validator(mode="after")
    def references_exist_and_are_unique(self):
        professional_slugs = [item.slug for item in self.professionals]
        service_slugs = [item.slug for item in self.services]
        inventory_skus = [item.sku for item in self.inventory]
        inventory_slugs = [
            item.slug or re.sub(r"[^a-z0-9]+", "-", item.sku.lower()).strip("-")
            for item in self.inventory
        ]
        for label, values in (
            ("professional slug", professional_slugs),
            ("service slug", service_slugs),
            ("inventory SKU", inventory_skus),
            ("inventory slug", inventory_slugs),
        ):
            if len(values) != len(set(values)):
                raise ValueError(f"{label} duplicado")
        service_set = set(service_slugs)
        for professional in self.professionals:
            missing = set(professional.services) - service_set
            if missing:
                raise ValueError(
                    f"{professional.slug} referencia servicios inexistentes: {missing}"
                )
        professional_set = set(professional_slugs)
        schedule_keys: set[tuple[str | None, int]] = set()
        for schedule in self.schedules:
            if schedule.professional and schedule.professional not in professional_set:
                raise ValueError(f"horario referencia {schedule.professional} inexistente")
            key = (schedule.professional, schedule.dayOfWeek)
            if key in schedule_keys:
                raise ValueError(f"horario duplicado: {key}")
            schedule_keys.add(key)
        return self


class BootstrapConflict(RuntimeError):
    pass


@dataclass(frozen=True)
class InstallationBundle:
    public: dict[str, Any]
    seed: SeedConfig
    config_hash: str

    @property
    def installation_id(self) -> str:
        return self.public["tenant"]

    @property
    def schema_version(self) -> int:
        return self.public["schemaVersion"]


def _read_json(path: str | Path) -> dict[str, Any]:
    with Path(path).open(encoding="utf-8") as file:
        return json.load(file)


def load_bundle(public_path: str | Path, seed_path: str | Path) -> InstallationBundle:
    public = _read_json(public_path)
    seed_raw = _read_json(seed_path)
    seed_raw.pop("$schema", None)
    seed = SeedConfig.model_validate(seed_raw)
    tenant = public.get("tenant", "")
    if not re.fullmatch(r"[a-z0-9][a-z0-9-]{1,62}[a-z0-9]", tenant):
        raise ValueError("tenant inválido")
    try:
        ZoneInfo(public["localization"]["timezone"])
    except (KeyError, ZoneInfoNotFoundError) as exc:
        raise ValueError("timezone inválido") from exc
    if public.get("demo", {}).get("defaultBarberSlug") not in {
        item.slug for item in seed.professionals
    }:
        raise ValueError("demo.defaultBarberSlug no existe en professionals")
    canonical = json.dumps(
        {"public": public, "seed": seed.model_dump(mode="json")},
        ensure_ascii=False,
        sort_keys=True,
        separators=(",", ":"),
    )
    return InstallationBundle(public, seed, hashlib.sha256(canonical.encode()).hexdigest())


async def apply_installation(
    connection: asyncpg.Connection,
    bundle: InstallationBundle,
    *,
    allow_update: bool = False,
    dry_run: bool = False,
) -> dict[str, Any]:
    async with connection.transaction():
        await connection.execute("SELECT pg_advisory_xact_lock(hashtext('installation-bootstrap'))")
        previous = await connection.fetchrow(
            "SELECT installation_id, config_hash FROM installation_bootstrap WHERE singleton"
        )
        if previous and previous["config_hash"] == bundle.config_hash:
            return {"status": "unchanged", "installation": bundle.installation_id}
        if previous and not allow_update and not dry_run:
            raise BootstrapConflict(
                "la base ya tiene otra versión del bootstrap; revisá el diff y usá --apply-update"
            )
        if dry_run:
            return {
                "status": "would_update" if previous else "would_create",
                "installation": bundle.installation_id,
                "previous": previous["installation_id"] if previous else None,
            }

        public = bundle.public
        seed = bundle.seed
        await _upsert_site_profile(connection, public)
        await connection.execute("UPDATE barbers SET active = false")
        await connection.execute("UPDATE services SET active = false")
        await connection.execute("UPDATE products SET active = false")
        await _upsert_catalog(connection, seed)
        await _replace_relationships_and_schedules(connection, seed)
        await _upsert_settings_and_inventory(connection, seed)
        await connection.execute(
            """
            INSERT INTO installation_bootstrap
                (singleton, installation_id, schema_version, config_hash, applied_at, metadata)
            VALUES (true, $1, $2, $3, now(), $4::jsonb)
            ON CONFLICT (singleton) DO UPDATE SET
                installation_id = EXCLUDED.installation_id,
                schema_version = EXCLUDED.schema_version,
                config_hash = EXCLUDED.config_hash,
                applied_at = now(),
                metadata = EXCLUDED.metadata
            """,
            bundle.installation_id,
            bundle.schema_version,
            bundle.config_hash,
            json.dumps({"professionals": len(seed.professionals), "services": len(seed.services)}),
        )
    return {"status": "updated" if previous else "created", "installation": bundle.installation_id}


async def _upsert_site_profile(connection: asyncpg.Connection, public: dict[str, Any]) -> None:
    brand = public["brand"]
    contact = public["contact"]
    location = public["location"]
    payments = public["payments"]
    policies = public["policies"]
    channels = public["channels"]
    shop = public["shop"]
    additional = {
        "arrival_recommendation": policies["arrivalRecommendation"],
        "latitude": location["latitude"],
        "longitude": location["longitude"],
        "installation_id": public["tenant"],
    }
    await connection.execute(
        """
        INSERT INTO site_profile (
            singleton, name, short_name, tagline, city, description, phone_display,
            whatsapp, instagram, email, address, maps_query, directions, payment_methods,
            payment_notes, cancellation_notice_min, cancellation_notes, online_store_url,
            additional_info, updated_at
        ) VALUES (
            true, $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12,
            $13::text[], $14, $15, $16, $17, $18::jsonb, now()
        )
        ON CONFLICT (singleton) DO UPDATE SET
            name = EXCLUDED.name, short_name = EXCLUDED.short_name,
            tagline = EXCLUDED.tagline, city = EXCLUDED.city,
            description = EXCLUDED.description, phone_display = EXCLUDED.phone_display,
            whatsapp = EXCLUDED.whatsapp, instagram = EXCLUDED.instagram,
            email = EXCLUDED.email, address = EXCLUDED.address,
            maps_query = EXCLUDED.maps_query, directions = EXCLUDED.directions,
            payment_methods = EXCLUDED.payment_methods, payment_notes = EXCLUDED.payment_notes,
            cancellation_notice_min = EXCLUDED.cancellation_notice_min,
            cancellation_notes = EXCLUDED.cancellation_notes,
            online_store_url = EXCLUDED.online_store_url,
            additional_info = EXCLUDED.additional_info, updated_at = now()
        """,
        brand["name"],
        brand["shortName"],
        brand["tagline"],
        location["city"],
        brand["description"],
        contact["phoneDisplay"],
        channels["whatsapp"]["address"] if channels["whatsapp"]["enabled"] else "",
        channels["instagram"]["address"] if channels["instagram"]["enabled"] else "",
        contact["email"],
        location["address"],
        location["mapsQuery"],
        location["directions"],
        payments["methods"],
        payments["display"],
        policies["cancellationNoticeMinutes"],
        policies["cancellationNotes"],
        shop["url"] if shop["enabled"] else None,
        json.dumps(additional),
    )


async def _upsert_catalog(connection: asyncpg.Connection, seed: SeedConfig) -> None:
    for professional in seed.professionals:
        await connection.execute(
            """
            INSERT INTO barbers
                (slug, name, role, photo_url, bio, instagram, email, active, sort_order)
            VALUES ($1, $2, $3, $4, $5, $6, lower($7), true, $8)
            ON CONFLICT (slug) DO UPDATE SET
                name = EXCLUDED.name, role = EXCLUDED.role, photo_url = EXCLUDED.photo_url,
                bio = EXCLUDED.bio, instagram = EXCLUDED.instagram,
                email = EXCLUDED.email, active = true, sort_order = EXCLUDED.sort_order
            """,
            professional.slug,
            professional.name,
            professional.role,
            professional.photoUrl,
            professional.bio,
            professional.instagram,
            professional.email,
            professional.sortOrder,
        )
    for service in seed.services:
        await connection.execute(
            """
            INSERT INTO services
                (slug, name, description, price, duration_min, badge, variable_price, active, sort_order)
            VALUES ($1, $2, $3, $4, $5, $6, $7, true, $8)
            ON CONFLICT (slug) DO UPDATE SET
                name = EXCLUDED.name, description = EXCLUDED.description,
                price = EXCLUDED.price, duration_min = EXCLUDED.duration_min,
                badge = EXCLUDED.badge, variable_price = EXCLUDED.variable_price,
                active = true, sort_order = EXCLUDED.sort_order
            """,
            service.slug,
            service.name,
            service.description,
            service.price,
            service.durationMinutes,
            service.badge,
            service.variablePrice,
            service.sortOrder,
        )


async def _replace_relationships_and_schedules(
    connection: asyncpg.Connection, seed: SeedConfig
) -> None:
    await connection.execute("DELETE FROM barber_services")
    for professional in seed.professionals:
        await connection.execute(
            """
            INSERT INTO barber_services (barber_id, service_id)
            SELECT b.id, s.id
            FROM barbers b CROSS JOIN services s
            WHERE b.slug = $1 AND s.slug = ANY($2::text[])
            """,
            professional.slug,
            professional.services,
        )
    await connection.execute("DELETE FROM schedule_rules")
    for schedule in seed.schedules:
        await connection.execute(
            """
            INSERT INTO schedule_rules (barber_id, dow, opens_at, closes_at)
            SELECT b.id, $2, $3, $4 FROM (SELECT 1) seed
            LEFT JOIN barbers b ON b.slug = $1
            WHERE $1::text IS NULL OR b.id IS NOT NULL
            """,
            schedule.professional,
            schedule.dayOfWeek,
            schedule.opensAt,
            schedule.closesAt,
        )


async def _upsert_settings_and_inventory(connection: asyncpg.Connection, seed: SeedConfig) -> None:
    for key, value in seed.settings.model_dump().items():
        await connection.execute(
            """
            INSERT INTO app_settings (key, value) VALUES ($1, $2::jsonb)
            ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value
            """,
            key,
            json.dumps(value),
        )
    for product in seed.inventory:
        slug = product.slug or re.sub(r"[^a-z0-9]+", "-", product.sku.lower()).strip("-")
        category_id = await connection.fetchval(
            """
            INSERT INTO product_categories (slug, name)
            VALUES ($1, $2)
            ON CONFLICT (slug) DO UPDATE SET name = EXCLUDED.name, active = true, updated_at = now()
            RETURNING id
            """,
            product.categorySlug,
            product.categoryName,
        )
        await connection.execute(
            """
            INSERT INTO products (
                name, sku, slug, description, short_description, category_id,
                image_url, gallery, featured, sort_order, qty, min_qty, price, active
            )
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8::jsonb, $9, $10, $11, $12, $13, true)
            ON CONFLICT (sku) DO UPDATE SET
                name = EXCLUDED.name, slug = EXCLUDED.slug, description = EXCLUDED.description,
                short_description = EXCLUDED.short_description, category_id = EXCLUDED.category_id,
                image_url = EXCLUDED.image_url, gallery = EXCLUDED.gallery,
                featured = EXCLUDED.featured, sort_order = EXCLUDED.sort_order,
                qty = EXCLUDED.qty, min_qty = EXCLUDED.min_qty,
                price = EXCLUDED.price, active = true, updated_at = now()
            """,
            product.name,
            product.sku,
            slug,
            product.description,
            product.shortDescription,
            category_id,
            product.imageUrl,
            json.dumps(product.gallery),
            product.featured,
            product.sortOrder,
            product.quantity,
            product.minimumQuantity,
            product.price,
        )
