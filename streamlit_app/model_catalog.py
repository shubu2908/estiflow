# Verified against provider docs (Aug 2026): ai.google.dev/gemini-api/docs/models,
# developers.openai.com/api/docs, platform.claude.com/docs. All three lineups move
# fast - this table is the single place to add/remove/re-default a model.
from dataclasses import dataclass


@dataclass
class ModelOption:
    id: str
    label: str
    provider: str  # "gemini" | "openai" | "anthropic"
    tier: str
    is_default: bool = False


PROVIDER_LABELS = {"gemini": "Google Gemini", "openai": "OpenAI", "anthropic": "Anthropic Claude"}
PROVIDER_ICONS = {"gemini": "🔵", "openai": "🟢", "anthropic": "🟠"}

MODEL_CATALOG: list[ModelOption] = [
    # Gemini
    ModelOption("gemini-3.7-flash", "Gemini 3.7 Flash — recommended", "gemini", "flash", is_default=True),
    ModelOption("gemini-3.1-pro-preview", "Gemini 3.1 Pro (Preview) — deepest reasoning, slower", "gemini", "pro"),
    ModelOption("gemini-3.5-flash", "Gemini 3.5 Flash", "gemini", "flash"),
    ModelOption("gemini-3.5-flash-lite", "Gemini 3.5 Flash-Lite — fastest, lowest cost", "gemini", "flash-lite"),
    ModelOption("gemini-2.5-pro", "Gemini 2.5 Pro (stable fallback)", "gemini", "pro"),
    ModelOption("gemini-2.5-flash", "Gemini 2.5 Flash (stable fallback)", "gemini", "flash"),
    # OpenAI
    ModelOption("gpt-5.6", "GPT-5.6 — flagship", "openai", "flagship"),
    ModelOption("gpt-5.4", "GPT-5.4", "openai", "standard"),
    ModelOption("gpt-5.4-mini", "GPT-5.4 Mini — fast, low cost", "openai", "mini"),
    ModelOption("o4-mini", "o4-mini — deep reasoning", "openai", "reasoning"),
    # Anthropic
    ModelOption("claude-sonnet-5", "Claude Sonnet 5 — best speed/intelligence balance", "anthropic", "standard"),
    ModelOption("claude-opus-5", "Claude Opus 5 — complex agentic work", "anthropic", "flagship"),
    ModelOption("claude-fable-5", "Claude Fable 5 — most capable, slower", "anthropic", "premium"),
    ModelOption("claude-haiku-4-5", "Claude Haiku 4.5 — fastest", "anthropic", "fast"),
]


def get_default_model() -> ModelOption:
    return next((m for m in MODEL_CATALOG if m.is_default), MODEL_CATALOG[0])


def get_model(model_id: str) -> ModelOption | None:
    return next((m for m in MODEL_CATALOG if m.id == model_id), None)


def models_by_provider() -> dict[str, list[ModelOption]]:
    grouped: dict[str, list[ModelOption]] = {}
    for m in MODEL_CATALOG:
        grouped.setdefault(m.provider, []).append(m)
    return grouped
