"""Agente ReAct de NOX: create_react_agent + AsyncPostgresSaver + Langfuse."""

import logging
import time

from langchain_openai import ChatOpenAI
from langgraph.prebuilt import create_react_agent

from ..config import get_settings
from ..integrations.redis_client import get_redis, key
from . import events
from .state import AgentState
from .system_prompt import build_system_prompt
from .tools import ALL_TOOLS

logger = logging.getLogger(__name__)

# gpt-4o-mini (USD por millón de tokens) para el budget cap diario
PRICE_IN_PER_M = 0.15
PRICE_OUT_PER_M = 0.60

BUDGET_REPLY = (
    "En este momento no puedo tomar reservas por acá. "
    "Podés reservar desde la web: https://nox.cloud-it.com.ar/agendar 🙏"
)

_langfuse_handler = None


def create_agent(checkpointer):
    settings = get_settings()
    llm = ChatOpenAI(
        model=settings.openai_model,
        temperature=0.3,
        api_key=settings.openai_api_key,
        parallel_tool_calls=False,
    )
    return create_react_agent(
        model=llm,
        tools=ALL_TOOLS,
        state_schema=AgentState,
        prompt=lambda state: [
            {"role": "system", "content": build_system_prompt()},
            *state["messages"],
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
                "langfuse_user_id": phone,
            }
        except Exception:  # noqa: BLE001
            logger.exception("Langfuse handler no disponible")
    return config


async def _budget_exceeded() -> bool:
    from datetime import date

    settings = get_settings()
    r = await get_redis()
    spent = await r.get(key(f"budget:{date.today().isoformat()}"))
    return spent is not None and float(spent) >= settings.daily_budget_usd


async def _track_cost(tokens_in: int, tokens_out: int) -> float:
    from datetime import date

    cost = tokens_in * PRICE_IN_PER_M / 1e6 + tokens_out * PRICE_OUT_PER_M / 1e6
    r = await get_redis()
    k = key(f"budget:{date.today().isoformat()}")
    await r.incrbyfloat(k, cost)
    await r.expire(k, 2 * 24 * 3600)
    return cost


async def run_agent(agent, conversation_id: int, phone: str, message: str) -> str:
    """Corre un turno del agente y devuelve el texto de respuesta."""
    if await _budget_exceeded():
        await events.log_event("rate_limited", conversation_id=conversation_id, phone=phone)
        return BUDGET_REPLY

    thread_id = f"chatwoot_{conversation_id}"
    started = time.monotonic()

    result = await agent.ainvoke(
        {
            "messages": [{"role": "user", "content": message}],
            "phone": phone,
            "conversation_id": conversation_id,
            "customer_name": None,
        },
        config=_build_run_config(thread_id, phone),
    )

    reply = ""
    tokens_in = tokens_out = 0
    for msg in result["messages"]:
        usage = getattr(msg, "usage_metadata", None)
        if usage:
            tokens_in += usage.get("input_tokens", 0)
            tokens_out += usage.get("output_tokens", 0)
    final = result["messages"][-1]
    if getattr(final, "content", None):
        reply = final.content if isinstance(final.content, str) else str(final.content)

    cost = await _track_cost(tokens_in, tokens_out)
    await events.log_event(
        "message_out",
        conversation_id=conversation_id,
        phone=phone,
        tokens_in=tokens_in,
        tokens_out=tokens_out,
        cost_usd=cost,
        latency_ms=int((time.monotonic() - started) * 1000),
    )
    return reply or "Perdón, no te entendí. ¿Me lo repetís?"
