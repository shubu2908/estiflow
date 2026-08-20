from __future__ import annotations

import copy

from models import EstimateResponse


def inline_json_schema(schema: dict) -> dict:
    """Pydantic's model_json_schema() emits $defs/$ref for nested models. Gemini's
    and OpenAI's structured-output modes only support a subset of JSON Schema and
    may not resolve $ref, so inline every definition in place."""
    defs = schema.get("$defs", {})

    def resolve(node):
        if isinstance(node, dict):
            if "$ref" in node:
                ref_name = node["$ref"].rsplit("/", 1)[-1]
                resolved = copy.deepcopy(defs[ref_name])
                extra = {k: v for k, v in node.items() if k != "$ref"}
                resolved.update(extra)
                return resolve(resolved)
            return {k: resolve(v) for k, v in node.items() if k != "$defs"}
        if isinstance(node, list):
            return [resolve(item) for item in node]
        return node

    result = resolve(schema)
    result.pop("$defs", None)
    return result


RESPONSE_JSON_SCHEMA = inline_json_schema(EstimateResponse.model_json_schema())
