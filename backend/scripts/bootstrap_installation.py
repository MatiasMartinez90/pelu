#!/usr/bin/env python3
"""Aplica un paquete de instalación sobre una base migrada."""

import argparse
import asyncio
import json
import os

import asyncpg

from src.services.installation_bootstrap import apply_installation, load_bundle


async def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--public-config", default="config/installation.json")
    parser.add_argument("--seed-config", default="config/installation.seed.json")
    parser.add_argument("--database-url", default=os.getenv("DATABASE_URL", ""))
    parser.add_argument("--dry-run", action="store_true")
    parser.add_argument("--apply-update", action="store_true")
    args = parser.parse_args()
    if not args.database_url:
        parser.error("--database-url o DATABASE_URL es obligatorio")
    bundle = load_bundle(args.public_config, args.seed_config)
    connection = await asyncpg.connect(args.database_url)
    try:
        result = await apply_installation(
            connection,
            bundle,
            allow_update=args.apply_update,
            dry_run=args.dry_run,
        )
    finally:
        await connection.close()
    print(json.dumps(result, ensure_ascii=False, sort_keys=True))


if __name__ == "__main__":
    asyncio.run(main())
