from __future__ import annotations

import anthropic

from file_service import NeutralPart
from models import EstimateResponse
from prompt import build_system_instruction
from retry import GenerationError, with_retries

MAX_OUTPUT_TOKENS = 16000


def _to_anthropic_content(parts: list[NeutralPart]) -> list[dict]:
    out = []
    for p in parts:
        if p.kind == "text":
            out.append({"type": "text", "text": p.text})
        elif p.kind == "image":
            out.append({"type": "image", "source": {"type": "base64", "media_type": p.mime_type, "data": p.data}})
        elif p.kind == "pdf":
            out.append({"type": "document", "source": {"type": "base64", "media_type": p.mime_type, "data": p.data}})
    return out


def generate(api_key: str, model: str, input_parts: list[NeutralPart], technology: list[str], complexity_override: str | None, hours_per_day: float) -> EstimateResponse:
    client = anthropic.Anthropic(api_key=api_key)
    system_instruction = build_system_instruction(technology, complexity_override, hours_per_day)

    content = [
        {"type": "text", "text": "Here is the Solution Design Document / process flow material for this project. Analyze it and produce the estimate JSON per your instructions."},
        *_to_anthropic_content(input_parts),
    ]

    def attempt():
        response = client.messages.parse(
            model=model,
            max_tokens=MAX_OUTPUT_TOKENS,
            system=system_instruction,
            messages=[{"role": "user", "content": content}],
            output_format=EstimateResponse,
        )
        parsed = getattr(response, "parsed_output", None)
        if parsed is None:
            raise GenerationError("Claude returned no parsed output.", True)
        if isinstance(parsed, EstimateResponse):
            return parsed
        try:
            return EstimateResponse.model_validate(parsed)
        except Exception as validation_err:
            raise GenerationError(f"Claude's response didn't match the expected schema: {validation_err}", True)

    return with_retries(attempt)
