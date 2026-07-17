"""Small, deterministic guardrails around the model boundary."""

from __future__ import annotations

import hashlib
import logging
import re
import unicodedata
from typing import Iterable

from openai import AsyncOpenAI

from ..config import get_settings

logger = logging.getLogger(__name__)

PROMPT_INJECTION_REPLY = (
    "No puedo cambiar mis reglas internas. Sí puedo ayudarte con servicios, horarios o turnos."
)
MODERATION_REPLY = (
    "No puedo seguir esa conversación automáticamente. La voy a derivar al equipo para que te ayude."
)

_INJECTION_PATTERNS = [
    re.compile(pattern, re.IGNORECASE)
    for pattern in (
        r"ignor(?:á|a|e) (?:todas? )?(?:las )?instrucciones",
        r"revel(?:á|a|e).{0,30}(?:system prompt|prompt del sistema|instrucciones internas)",
        r"(?:system|developer) message",
        r"mostr(?:á|a|e).{0,20}(?:secretos|api key|variables de entorno)",
    )
]
_SECRET = re.compile(r"\b(?:sk-[A-Za-z0-9_-]{16,}|Bearer\s+[A-Za-z0-9._-]{16,})\b")
_PRICE = re.compile(r"\$\s?\d+(?:\.\d{3})*")
_TIME = re.compile(r"\b(?:[01]?\d|2[0-3]):[0-5]\d\b")
_GROOMING_ACTION = re.compile(
    r"\b(?:cort\w*|corte\w*|recort\w*|rap\w*|afeit\w*|arregl\w*)\b"
)
_GROOMING_TARGET = re.compile(
    r"\b(?:pelo|cabello|cabellera|barba|bigote|flequillo|patillas?)\b"
)
_SELF_HARM_CONTEXT = re.compile(
    r"\b(?:suicid\w*|matarme|morir|autoles\w*|venas?|munecas?|brazos?|"
    r"sangre|lastimarme|danarme|hacerme\s+dano|no\s+quiero\s+vivir|"
    r"kill\s+myself|self\s*harm)\b"
)


def pseudonymous_user_id(phone: str) -> str:
    return hashlib.sha256(phone.encode()).hexdigest()[:24] if phone else "anonymous"


def is_prompt_injection(text: str) -> bool:
    return any(pattern.search(text) for pattern in _INJECTION_PATTERNS)


def _normalized_text(text: str) -> str:
    normalized = unicodedata.normalize("NFKD", text.casefold())
    return "".join(char for char in normalized if not unicodedata.combining(char))


def filter_moderation_categories(text: str, categories: Iterable[str]) -> list[str]:
    """Suppress a narrow self-harm false positive for explicit grooming requests.

    Spanish phrases such as ``cortarme el pelo`` may be classified as self-harm
    when the verb is read without its object. The override only applies when all
    flagged categories are self-harm variants, a grooming action and target are
    both explicit, and no self-harm context is present.
    """
    flagged = list(categories)
    normalized_categories = {
        category.casefold().replace("-", "_").replace("/", "_")
        for category in flagged
    }
    if not flagged or not all(
        category.startswith("self_harm") for category in normalized_categories
    ):
        return flagged

    normalized = _normalized_text(text)
    if (
        _GROOMING_ACTION.search(normalized)
        and _GROOMING_TARGET.search(normalized)
        and not _SELF_HARM_CONTEXT.search(normalized)
    ):
        logger.info("moderation override: explicit grooming intent")
        return []
    return flagged


async def moderation_categories(text: str) -> list[str]:
    settings = get_settings()
    if not settings.moderation_enabled or not settings.openai_api_key:
        return []
    client = AsyncOpenAI(api_key=settings.openai_api_key)
    try:
        result = await client.moderations.create(
            model="omni-moderation-latest", input=text
        )
        categories = result.results[0].categories.model_dump()
        flagged = [name for name, is_flagged in categories.items() if is_flagged]
        return filter_moderation_categories(text, flagged)
    except Exception:
        if settings.moderation_fail_closed:
            return ["moderation_unavailable"]
        return []
    finally:
        await client.close()


def validate_output(reply: str, evidence: Iterable[str]) -> str:
    """Remove secrets and reject unsupported concrete prices/times."""
    settings = get_settings()
    cleaned = _SECRET.sub("[dato protegido]", reply).strip()
    joined_evidence = "\n".join(evidence)
    unsupported = [
        claim
        for regex in (_PRICE, _TIME)
        for claim in regex.findall(cleaned)
        if claim not in joined_evidence
    ]
    if unsupported:
        cleaned = (
            "Para no darte un dato incorrecto, necesito volver a consultar esa información. "
            "¿Querés que revise disponibilidad o servicios?"
        )
    if len(cleaned) > settings.output_max_chars:
        cleaned = cleaned[: settings.output_max_chars].rsplit(" ", 1)[0].rstrip() + "…"
    return cleaned
