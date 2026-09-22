from __future__ import annotations

import base64
import io
from dataclasses import dataclass
from typing import Literal

from docx import Document as DocxDocument
from docx.document import Document as DocxDocumentType

IMAGE_MIME_TYPES = {"image/png", "image/jpeg", "image/jpg"}
DOCX_MIME_TYPE = "application/vnd.openxmlformats-officedocument.wordprocessingml.document"

# DTP/process-doc style Word files are often mostly step-by-step screenshots (real
# examples seen: 17-127 embedded images per file, up to ~18MB of raw image data in
# one file). Cap per file so one huge doc - or several combined in one upload -
# doesn't blow past a provider's request size limit (all three providers cap
# requests somewhere in the 20-32MB range). 12MB raw is a soft ceiling: none of
# the smaller real-world files hit it at all, and the couple of larger ones lose
# only their last few screenshots rather than most of the document.
MAX_DOCX_IMAGE_BYTES = 12 * 1024 * 1024
MAX_IMAGES_PER_DOCX = 150  # backstop against a pathological doc with huge counts of tiny images
# Word embeds some pasted content (charts, SmartArt) as EMF/WMF vector metafiles,
# which none of the three providers can read as an image - skip those rather
# than send bytes that won't be understood.
SUPPORTED_DOCX_IMAGE_CONTENT_TYPES = {"image/png", "image/jpeg", "image/jpg", "image/gif", "image/webp"}


@dataclass
class NeutralPart:
    kind: Literal["text", "image", "pdf"]
    text: str | None = None
    data: str | None = None  # base64
    mime_type: str | None = None


def _extract_docx_text(document: DocxDocumentType) -> str:
    """Paragraph text plus table cell text - DTP/process docs are frequently laid
    out as step-number/action/screenshot tables, so paragraphs alone miss most
    of the actual content."""
    lines = [p.text for p in document.paragraphs if p.text.strip()]
    for table in document.tables:
        for row in table.rows:
            cells = [cell.text.strip() for cell in row.cells if cell.text.strip()]
            if cells:
                lines.append(" | ".join(cells))
    return "\n".join(lines)


def _extract_docx_images(document: DocxDocumentType) -> tuple[list[tuple[bytes, str]], bool]:
    """Every embedded image via the document part's relationships (not just
    document.inline_shapes), so floating/anchored screenshots - common in
    step-by-step process docs - are caught too, not just simple inline ones.
    Returns (images, truncated) - truncated is True if the byte/count cap cut
    off any images so callers can surface that to the user."""
    images: list[tuple[bytes, str]] = []
    total_bytes = 0
    truncated = False

    for rel in document.part.rels.values():
        if "image" not in rel.reltype or rel.is_external:
            continue  # external (linked, not embedded) images have no local bytes to read
        content_type = rel.target_part.content_type
        if content_type not in SUPPORTED_DOCX_IMAGE_CONTENT_TYPES:
            continue

        blob = rel.target_part.blob
        if len(images) >= MAX_IMAGES_PER_DOCX or total_bytes + len(blob) > MAX_DOCX_IMAGE_BYTES:
            truncated = True
            continue

        images.append((blob, content_type))
        total_bytes += len(blob)

    return images, truncated


def files_to_neutral_parts(uploaded_files) -> tuple[list[NeutralPart], list[str]]:
    """Converts Streamlit UploadedFile objects into a provider-agnostic part list.
    Each provider adapter (providers/*.py) turns these into its own SDK shape.
    Also returns a list of user-facing warnings (e.g. image truncation) to
    surface in the UI rather than silently dropping content."""
    parts: list[NeutralPart] = []
    warnings: list[str] = []

    for file in uploaded_files:
        data = file.getvalue()
        mime_type = file.type

        if mime_type == "application/pdf":
            parts.append(NeutralPart(kind="pdf", data=base64.b64encode(data).decode("utf-8"), mime_type=mime_type))
        elif mime_type in IMAGE_MIME_TYPES:
            parts.append(NeutralPart(kind="image", data=base64.b64encode(data).decode("utf-8"), mime_type=mime_type))
        elif mime_type == DOCX_MIME_TYPE:
            doc = DocxDocument(io.BytesIO(data))
            text = _extract_docx_text(doc)
            parts.append(NeutralPart(kind="text", text=f"--- Extracted from {file.name} ---\n{text}"))

            images, truncated = _extract_docx_images(doc)
            if images:
                parts.append(NeutralPart(kind="text", text=f"--- {len(images)} screenshot(s) embedded in {file.name} follow ---"))
                for img_bytes, content_type in images:
                    parts.append(NeutralPart(kind="image", data=base64.b64encode(img_bytes).decode("utf-8"), mime_type=content_type))
            if truncated:
                warnings.append(f"{file.name}: only the first {len(images)} embedded screenshots were sent (the rest were skipped to stay within request size limits).")
        else:
            raise ValueError(f"Unsupported file type: {file.name} ({mime_type})")

    return parts, warnings
