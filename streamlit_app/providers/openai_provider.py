from __future__ import annotations

import json

from openai import OpenAI

from file_service import NeutralPart
from models import EstimateResponse
from prompt import build_system_instruction
from retry import GenerationError, with_retries
from schema_utils import RESPONSE_JSON_SCHEMA


def _to_openai_content(parts: list[NeutralPart]) -> list[dict]:
    out = []
    for p in parts:
        if p.kind == "text":
            out.append({"type": "input_text", "text": p.text})
        elif p.kind == "image":
            out.append({"type": "input_image", "image_url": f"data:{p.mime_type};base64,{p.data}"})
        elif p.kind == "pdf":
            out.append({"type": "input_file", "filename": "document.pdf", "file_data": f"data:{p.mime_type};base64,{p.data}"})
    return out


def generate(api_key: str, model: str, input_parts: list[NeutralPart], technology: list[str], complexity_override: str | None, hours_per_day: float) -> EstimateResponse:
    client = OpenAI(api_key=api_key)
    system_instruction = build_system_instruction(technology, complexity_override, hours_per_day)

    user_content = [
        {"type": "input_text", "text": "Here is the Solution Design Document / process flow material for this project. Analyze it and produce the estimate JSON per your instructions."},
        *_to_openai_content(input_parts),
    ]

    def attempt():
        response = client.responses.create(
            model=model,
            input=[
                {"role": "system", "content": system_instruction},
                {"role": "user", "content": user_content},
            ],
            text={
                "format": {
                    "type": "json_schema",
                    "name": "automation_estimate",
                    # Not using strict:true - it requires every optional field to be
                    # forced into `required` via null-unions, which would mean hand-editing
                    # Pydantic's generated schema. We validate with Pydantic afterward
                    # regardless, same as the other providers, so schema-guided (non-strict)
                    # output plus that validation gate is the consistent approach here.
                    "strict": False,
                    "schema": RESPONSE_JSON_SCHEMA,
                }
            },
        )
        output_text = getattr(response, "output_text", None)
        if not output_text:
            raise GenerationError("OpenAI returned an empty response.", True)
        try:
            parsed = json.loads(output_text)
        except json.JSONDecodeError:
            raise GenerationError("OpenAI did not return valid JSON.", True)
        try:
            return EstimateResponse.model_validate(parsed)
        except Exception as validation_err:
            raise GenerationError(f"OpenAI's response didn't match the expected schema: {validation_err}", True)

    return with_retries(attempt)
