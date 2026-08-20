from __future__ import annotations

import json

from google import genai

from file_service import NeutralPart
from models import EstimateResponse
from prompt import build_system_instruction
from retry import GenerationError, with_retries
from schema_utils import RESPONSE_JSON_SCHEMA


def _to_gemini_parts(parts: list[NeutralPart]) -> list[dict]:
    out = []
    for p in parts:
        if p.kind == "text":
            out.append({"type": "text", "text": p.text})
        elif p.kind == "image":
            out.append({"type": "image", "data": p.data, "mime_type": p.mime_type})
        elif p.kind == "pdf":
            out.append({"type": "document", "data": p.data, "mime_type": p.mime_type})
    return out


def generate(api_key: str, model: str, input_parts: list[NeutralPart], technology: list[str], complexity_override: str | None, hours_per_day: float) -> EstimateResponse:
    client = genai.Client(api_key=api_key)
    system_instruction = build_system_instruction(technology, complexity_override, hours_per_day)

    input_content = [
        {"type": "text", "text": "Here is the Solution Design Document / process flow material for this project. Analyze it and produce the estimate JSON per your instructions."},
        *_to_gemini_parts(input_parts),
    ]

    def attempt():
        interaction = client.interactions.create(
            model=model,
            system_instruction=system_instruction,
            input=input_content,
            response_format={"type": "text", "mime_type": "application/json", "schema": RESPONSE_JSON_SCHEMA},
        )
        output_text = getattr(interaction, "output_text", None)
        if not output_text:
            raise GenerationError("Gemini returned an empty response.", True)
        try:
            parsed = json.loads(output_text)
        except json.JSONDecodeError:
            raise GenerationError("Gemini did not return valid JSON.", True)
        try:
            return EstimateResponse.model_validate(parsed)
        except Exception as validation_err:
            raise GenerationError(f"Gemini's response didn't match the expected schema: {validation_err}", True)

    return with_retries(attempt)
