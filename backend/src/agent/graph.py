"""Agente ReAct: create_react_agent + AsyncPostgresSaver + Langfuse."""

import logging
import time
from datetime import datetime
from uuid import UUID
from zoneinfo import ZoneInfo

from langchain_openai import ChatOpenAI
from langgraph.prebuilt import create_react_agent

from ..config import get_settings
from ..db.pool import get_pool
from ..db.repositories import agent_threads, site_context
from ..integrations.redis_client import get_redis, key
from ..observability import AGENT_LATENCY, AGENT_TURNS
from . import events
from .state import AgentState
from .system_prompt import build_system_prompt
from .tools import ALL_TOOLS
from .tools.handoff import perform_handoff
from .guardrails import (
    MODERATION_REPLY,
    PROMPT_INJECTION_REPLY,
    is_prompt_injection,
    moderation_categories,
    pseudonymous_user_id,
    validate_output,
)

logger = logging.getLogger(__name__)


def _booking_url() -> str:
    settings = get_settings()
    if not settings.public_site_url:
        return ""
    return f"{settings.public_site_url.rstrip('/')}/{settings.public_booking_path.lstrip('/')}"


def _budget_reply() -> str:
    booking_url = _booking_url()
    return "En este momento no puedo tomar reservas por acá. " + (
        f"Podés reservar desde la web: {booking_url} 🙏"
        if booking_url
        else "Probá de nuevo en un ratito."
    )


def _agent_error_reply() -> str:
    booking_url = _booking_url()
    return "Perdón, tuve un problema técnico y no pude procesar tu mensaje. " + (
        f"Probá de nuevo en un ratito, o reservá directo desde {booking_url} 🙏"
        if booking_url
        else "Probá de nuevo en un ratito."
    )


_langfuse_handler = None


def create_agent(checkpointer):
    settings = get_settings()
    llm = ChatOpenAI(
        model=settings.openai_model,
        temperature=0.3,
        api_key=settings.openai_api_key,
        parallel_tool_calls=False,
        # Reintento nativo del SDK (backoff exponencial incluido) para 429/5xx/
        # timeouts transitorios de OpenAI, antes de que la falla se propague
        # hasta el nivel de la cola.
        max_retries=3,
        timeout=30,
    )
    return create_react_agent(
        model=llm,
        tools=ALL_TOOLS,
        state_schema=AgentState,
        prompt=lambda state: [
            {"role": "system", "content": build_system_prompt(state["business_context"])},
            *state["messages"][-get_settings().context_max_messages :],
        ],
        checkpointer=checkpointer,
    )


def _build_run_config(thread_id: str, phone: str) -> dict:
    global _langfuse_handler
    settings = get_settings()
    config: dict = {"configurable": {"thread_id": thread_id}, "recursion_limit": 12}
    if settings.langfuse_public_key and settings.langfuse_secret_key:
        try:
            if _langfuse_handler is None:
                from langfuse.langchain import CallbackHandler

                _langfuse_handler = CallbackHandler()
            config["callbacks"] = [_langfuse_handler]
            config["metadata"] = {
                "langfuse_session_id": thread_id,
                "langfuse_user_id": pseudonymous_user_id(phone),
            }
        except Exception:  # noqa: BLE001
            logger.exception("Langfuse handler no disponible")
    return config


def _budget_key() -> str:
    settings = get_settings()
    today = datetime.now(ZoneInfo(settings.timezone)).date().isoformat()
    return key(f"budget:{today}")


async def _reserve_budget() -> str | None:
    settings = get_settings()
    r = await get_redis()
    budget_key = _budget_key()
    reserved = await r.eval(
        "local v=tonumber(redis.call('GET',KEYS[1]) or '0'); "
        "local n=tonumber(ARGV[1]); local cap=tonumber(ARGV[2]); "
        "if v+n>cap then return 0 end; redis.call('INCRBYFLOAT',KEYS[1],n); "
        "redis.call('EXPIRE',KEYS[1],ARGV[3]); return 1",
        1,
        budget_key,
        settings.budget_reserve_per_turn_usd,
        settings.daily_budget_usd,
        2 * 24 * 3600,
    )
    return budget_key if reserved else None


async def _track_cost(budget_key: str, tokens_in: int, tokens_out: int) -> float:
    settings = get_settings()
    cost = (
        tokens_in * settings.model_input_price_per_million / 1e6
        + tokens_out * settings.model_output_price_per_million / 1e6
    )
    r = await get_redis()
    await r.incrbyfloat(budget_key, cost - settings.budget_reserve_per_turn_usd)
    return cost


async def _release_budget_reservation(budget_key: str) -> None:
    settings = get_settings()
    await (await get_redis()).incrbyfloat(budget_key, -settings.budget_reserve_per_turn_usd)


def _turn_usage(messages: list, user_message: str) -> tuple[int, int]:
    start = 0
    for index in range(len(messages) - 1, -1, -1):
        msg = messages[index]
        if getattr(msg, "type", None) == "human" and str(msg.content) == user_message:
            start = index + 1
            break
    tokens_in = tokens_out = 0
    for msg in messages[start:]:
        usage = getattr(msg, "usage_metadata", None)
        if usage:
            tokens_in += usage.get("input_tokens", 0)
            tokens_out += usage.get("output_tokens", 0)
    return tokens_in, tokens_out


async def run_agent(
    agent,
    conversation_id: int,
    phone: str,
    message: str,
    *,
    turn_id: UUID,
    allow_fallback: bool = False,
) -> str:
    """Corre un turno del agente y devuelve el texto de respuesta."""
    budget_key = await _reserve_budget()
    if budget_key is None:
        AGENT_TURNS.labels("budget_limited").inc()
        await events.log_event("rate_limited", conversation_id=conversation_id, phone=phone)
        return _budget_reply()

    if is_prompt_injection(message):
        AGENT_TURNS.labels("prompt_injection").inc()
        await _release_budget_reservation(budget_key)
        await events.log_event("prompt_injection", conversation_id=conversation_id, phone=phone)
        return PROMPT_INJECTION_REPLY

    flagged = await moderation_categories(message)
    if flagged:
        AGENT_TURNS.labels("moderation_blocked").inc()
        await _release_budget_reservation(budget_key)
        await events.log_event("moderation_blocked", conversation_id=conversation_id, phone=phone)
        await perform_handoff(
            f"moderación automática: {', '.join(flagged)}",
            {"conversation_id": conversation_id, "phone": phone, "turn_id": str(turn_id)},
        )
        return MODERATION_REPLY

    started = time.monotonic()

    try:
        pool = await get_pool()
        site_data = await site_context.get_site_data(pool)
        business_context = site_context.format_agent_context(site_data)
        thread_id = await agent_threads.get_thread_id(
            pool, conversation_id, get_settings().conversation_reset_after_days
        )
    except Exception:  # noqa: BLE001 — el turno conserva una respuesta útil ante datos dañados
        logger.exception("run_agent: no se pudo cargar el contexto del local")
        business_context = (
            "La información institucional no está disponible temporalmente. "
            "No inventes datos; ofrecé consultar con una persona."
        )
        thread_id = f"chatwoot_{conversation_id}"

    try:
        result = await agent.ainvoke(
            {
                "messages": [{"role": "user", "content": message}],
                "phone": phone,
                "conversation_id": conversation_id,
                "customer_name": None,
                "business_context": business_context,
                "turn_id": str(turn_id),
            },
            config=_build_run_config(thread_id, phone),
        )
    except Exception:
        # Los primeros intentos se propagan a la cola diferida. En el último,
        # allow_fallback evita dejar al cliente sin respuesta.
        logger.exception("run_agent: fallo el turno para conv %s", conversation_id)
        await _release_budget_reservation(budget_key)
        await events.log_event("agent_error", conversation_id=conversation_id, phone=phone)
        if allow_fallback:
            AGENT_TURNS.labels("fallback").inc()
            return _agent_error_reply()
        AGENT_TURNS.labels("error").inc()
        raise

    reply = ""
    tokens_in, tokens_out = _turn_usage(result["messages"], message)
    final = result["messages"][-1]
    if getattr(final, "content", None):
        reply = final.content if isinstance(final.content, str) else str(final.content)

    output_flagged = await moderation_categories(reply)
    if output_flagged:
        AGENT_TURNS.labels("output_moderation_blocked").inc()
        await events.log_event("moderation_blocked", conversation_id=conversation_id, phone=phone)
        await perform_handoff(
            f"moderación de salida: {', '.join(output_flagged)}",
            {"conversation_id": conversation_id, "phone": phone, "turn_id": str(turn_id)},
        )
        reply = MODERATION_REPLY

    evidence = [business_context]
    evidence.extend(
        str(msg.content) for msg in result["messages"] if getattr(msg, "type", None) == "tool"
    )
    reply = validate_output(reply, evidence)

    cost = await _track_cost(budget_key, tokens_in, tokens_out)
    await events.log_event(
        "message_out",
        conversation_id=conversation_id,
        phone=phone,
        tokens_in=tokens_in,
        tokens_out=tokens_out,
        cost_usd=cost,
        latency_ms=int((time.monotonic() - started) * 1000),
    )
    AGENT_TURNS.labels("success").inc()
    AGENT_LATENCY.observe(time.monotonic() - started)
    return reply or "Perdón, no te entendí. ¿Me lo repetís?"
