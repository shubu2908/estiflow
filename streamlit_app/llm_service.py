from __future__ import annotations

from file_service import NeutralPart
from models import EstimateResponse
from retry import GenerationError
from providers import gemini, openai_provider, anthropic_provider

_GENERATORS = {
    "gemini": gemini.generate,
    "openai": openai_provider.generate,
    "anthropic": anthropic_provider.generate,
}


def generate_estimate(
    provider: str,
    model: str,
    api_key: str,
    input_parts: list[NeutralPart],
    technology: list[str],
    complexity_override: str | None,
    hours_per_day: float,
) -> EstimateResponse:
    if not api_key:
        raise GenerationError(f"No API key configured for {provider}. Add one below or in Settings.", False)

    fn = _GENERATORS.get(provider)
    if not fn:
        raise GenerationError(f"Unknown provider: {provider}", False)

    return fn(
        api_key=api_key,
        model=model,
        input_parts=input_parts,
        technology=technology,
        complexity_override=complexity_override,
        hours_per_day=hours_per_day,
    )
