from __future__ import annotations

from io import BytesIO

from pypdf import PdfReader


def parse_attachment_text(content: bytes, *, extension: str) -> str:
    normalized_extension = extension.lower().lstrip(".")
    if normalized_extension != "pdf":
        raise ValueError(f"Unsupported attachment type: {extension}")

    reader = PdfReader(BytesIO(content))
    pages: list[str] = []
    for page in reader.pages:
        text = page.extract_text() or ""
        if text.strip():
            pages.append(text)
    return "\n".join(pages)
