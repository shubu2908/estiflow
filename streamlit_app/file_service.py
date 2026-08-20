from __future__ import annotations

import base64
import io
from dataclasses import dataclass
from typing import Literal

from docx import Document as DocxDocument

IMAGE_MIME_TYPES = {"image/png", "image/jpeg", "image/jpg"}
DOCX_MIME_TYPE = "application/vnd.openxmlformats-officedocument.wordprocessingml.document"


@dataclass
class NeutralPart:
    kind: Literal["text", "image", "pdf"]
    text: str | None = None
    data: str | None = None  # base64
    mime_type: str | None = None


def files_to_neutral_parts(uploaded_files) -> list[NeutralPart]:
    """Converts Streamlit UploadedFile objects into a provider-agnostic part list.
    Each provider adapter (providers/*.py) turns these into its own SDK shape."""
    parts: list[NeutralPart] = []

    for file in uploaded_files:
        data = file.getvalue()
        mime_type = file.type

        if mime_type == "application/pdf":
            parts.append(NeutralPart(kind="pdf", data=base64.b64encode(data).decode("utf-8"), mime_type=mime_type))
        elif mime_type in IMAGE_MIME_TYPES:
            parts.append(NeutralPart(kind="image", data=base64.b64encode(data).decode("utf-8"), mime_type=mime_type))
        elif mime_type == DOCX_MIME_TYPE:
            doc = DocxDocument(io.BytesIO(data))
            text = "\n".join(p.text for p in doc.paragraphs)
            parts.append(NeutralPart(kind="text", text=f"--- Extracted from {file.name} ---\n{text}"))
        else:
            raise ValueError(f"Unsupported file type: {file.name} ({mime_type})")

    return parts
