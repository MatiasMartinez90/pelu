import os
from datetime import date, timedelta

import asyncpg
import pytest

from src.db.repositories import agent_delivery
from src.db.repositories import agent_threads, catalog
from src.services import availability_service, booking_service


pytestmark = pytest.mark.skipif(
    not os.getenv("TEST_DATABASE_URL"), reason="requires disposable PostgreSQL"
)


@pytest.mark.asyncio
async def test_inbox_outbox_dedup_claim_and_durable_reply():
    pool = await asyncpg.create_pool(os.environ["TEST_DATABASE_URL"], min_size=1, max_size=2)
    try:
        await pool.execute("TRUNCATE agent_replies, agent_outbox, agent_inbox")
        first = await agent_delivery.enqueue_message(
            pool,
            message_id="chatwoot-100",
            conversation_id=77,
            phone="+5491100000000",
            content="quiero un turno",
            source_id="wamid.100",
        )
        duplicate = await agent_delivery.enqueue_message(
            pool,
            message_id="chatwoot-100",
            conversation_id=77,
            phone="+5491100000000",
            content="quiero un turno",
            source_id="wamid.100",
        )
        assert first is not None
        assert duplicate is None
        leased_outbox = await agent_delivery.pending_outbox(pool)
        assert len(leased_outbox) == 1
        assert await agent_delivery.pending_outbox(pool) == []
        await agent_delivery.mark_outbox_failed(pool, leased_outbox[0]["id"], "test retry")

        claimed = await agent_delivery.claim_batch(pool, 77, lease_seconds=60)
        assert claimed is not None
        batch_id, messages = claimed
        assert [message["content"] for message in messages] == ["quiero un turno"]

        reply = await agent_delivery.complete_batch_with_reply(
            pool, batch_id=batch_id, conversation_id=77, content="¿Qué servicio querés?"
        )
        pending = await agent_delivery.get_pending_reply(pool, 77)
        assert pending["id"] == reply["id"]
        await agent_delivery.mark_reply_sent(pool, reply["id"], "chatwoot-out-1")
        assert await agent_delivery.get_pending_reply(pool, 77) is None
    finally:
        await pool.close()


@pytest.mark.asyncio
async def test_thread_is_stable_until_retention_rotation():
    pool = await asyncpg.create_pool(os.environ["TEST_DATABASE_URL"], min_size=1, max_size=2)
    try:
        await pool.execute("DELETE FROM agent_threads WHERE conversation_id = 501")
        first = await agent_threads.get_thread_id(pool, 501, 30)
        second = await agent_threads.get_thread_id(pool, 501, 30)
        assert first == second
        assert first.startswith("chatwoot_501_")
    finally:
        await pool.close()


@pytest.mark.asyncio
async def test_reschedule_is_atomic_and_command_idempotent():
    pool = await asyncpg.create_pool(os.environ["TEST_DATABASE_URL"], min_size=1, max_size=3)
    try:
        await pool.execute("TRUNCATE appointments, customers CASCADE")
        barber = await catalog.get_barber_by_slug(pool, "thiago")
        service = await catalog.get_service_by_slug(pool, "corte-masculino")
        chosen_day = None
        slots = []
        for offset in range(2, 30):
            candidate = date.today() + timedelta(days=offset)
            current = await availability_service.get_slots(pool, barber, service, candidate)
            if len(current) >= 3:
                chosen_day, slots = candidate, current
                break
        assert chosen_day is not None

        original = await booking_service.create_booking(
            pool,
            barber_slug="thiago",
            service_slug="corte-masculino",
            day=chosen_day,
            hhmm=slots[0],
            phone="+5491100000001",
            customer_name="Cliente Uno",
            idempotency_key="create-original",
        )
        occupied = await booking_service.create_booking(
            pool,
            barber_slug="thiago",
            service_slug="corte-masculino",
            day=chosen_day,
            hhmm=slots[1],
            phone="+5491100000002",
            customer_name="Cliente Dos",
            idempotency_key="create-occupied",
        )
        with pytest.raises(booking_service.BookingError):
            await booking_service.reschedule_booking(
                pool,
                original["id"],
                day=chosen_day,
                hhmm=slots[1],
                phone="+5491100000001",
                command_key="reschedule-failed",
            )
        assert await pool.fetchval(
            "SELECT status FROM appointments WHERE id = $1", original["id"]
        ) == "active"

        moved = await booking_service.reschedule_booking(
            pool,
            original["id"],
            day=chosen_day,
            hhmm=slots[2],
            phone="+5491100000001",
            command_key="reschedule-success",
        )
        repeated = await booking_service.reschedule_booking(
            pool,
            original["id"],
            day=chosen_day,
            hhmm=slots[2],
            phone="+5491100000001",
            command_key="reschedule-success",
        )
        assert moved["id"] == repeated["id"]
        assert occupied["id"] != moved["id"]
        assert await pool.fetchval(
            "SELECT status FROM appointments WHERE id = $1", original["id"]
        ) == "cancelled"
    finally:
        await pool.close()
