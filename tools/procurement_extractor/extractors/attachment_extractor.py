from __future__ import annotations

import logging
import re
from pathlib import Path

from ..http_client import HttpClient
from ..models import AttachmentCandidate, AttachmentConfig, FieldDefinition
from .attachment_parser import parse_attachment_text
from .detail_extractor import extract_attachment_candidates, extract_fields_from_lines, text_to_lines


logger = logging.getLogger(__name__)
PACKAGE_PATTERN = re.compile(r"_(\d+包)_|([0-9]+包)")


def _should_trigger_attachment(record: dict[str, str], trigger_fields: list[str]) -> bool:
    return any(not (record.get(field_name) or "").strip() for field_name in trigger_fields)


def _score_candidate(candidate: AttachmentCandidate, config: AttachmentConfig) -> int:
    haystack = f"{candidate.title} {candidate.text}".lower()
    score = 0
    for keyword in config.exclude_keywords:
        if keyword.lower() in haystack:
            return -100
    for keyword in config.include_keywords:
        if keyword.lower() in haystack:
            score += 10 if len(keyword) > 2 else 5
    return score


def _filter_candidates(candidates: list[AttachmentCandidate], config: AttachmentConfig) -> list[AttachmentCandidate]:
    allowed_extensions = {extension.lower().lstrip(".") for extension in config.allowed_extensions}
    ranked: list[AttachmentCandidate] = []
    for candidate in candidates:
        if candidate.extension.lower() not in allowed_extensions:
            continue
        candidate.score = _score_candidate(candidate, config)
        if candidate.score <= 0:
            continue
        ranked.append(candidate)
    ranked.sort(key=lambda item: item.score, reverse=True)
    return ranked[: config.max_candidates]


def summarize_attachments(detail_html: str, detail_url: str, attachment_config: AttachmentConfig | None) -> dict[str, str]:
    if not attachment_config or not attachment_config.enabled:
        return {"qa_count": "0", "has_tender_file": "否", "has_bill_of_quantities": "否", "has_qa_file": "否", "package_name": ""}

    candidates = _filter_candidates(extract_attachment_candidates(detail_html, base_url=detail_url), attachment_config)
    titles = [candidate.title for candidate in candidates]
    package_name = ""
    for title in titles:
        match = PACKAGE_PATTERN.search(title)
        if match:
            package_name = match.group(1) or match.group(2) or ""
            break

    qa_count = sum(1 for title in titles if ("答疑" in title or "澄清" in title or "补遗" in title or "更正" in title))
    return {
        "qa_count": str(qa_count),
        "has_tender_file": "是" if any("招标文件" in title or "采购文件" in title for title in titles) else "否",
        "has_bill_of_quantities": "是" if any("清单" in title for title in titles) else "否",
        "has_qa_file": "是" if qa_count else "否",
        "package_name": package_name,
    }


def backfill_from_attachments(client: HttpClient, detail_html: str, detail_url: str, record: dict[str, str], field_definitions: list[FieldDefinition], attachment_config: AttachmentConfig | None) -> dict[str, str]:
    if not attachment_config or not attachment_config.enabled:
        return {}
    if not attachment_config.trigger_fields:
        return {}
    if not _should_trigger_attachment(record, attachment_config.trigger_fields):
        return {}

    candidates = extract_attachment_candidates(detail_html, base_url=detail_url)
    candidates = _filter_candidates(candidates, attachment_config)
    if not candidates:
        return {}

    target_fields = {field_name for field_name in attachment_config.trigger_fields if not (record.get(field_name) or "").strip()}
    if not target_fields:
        return {}

    merged: dict[str, str] = {}
    remaining = set(target_fields)
    for candidate in candidates:
        try:
            content = client.get_bytes(candidate.url)
            if attachment_config.max_file_size_bytes is not None and len(content) > attachment_config.max_file_size_bytes:
                logger.warning("Skip oversized attachment %s (%s bytes)", candidate.url, len(content))
                continue
            extension = candidate.extension or Path(candidate.url).suffix.lower().lstrip(".")
            attachment_text = parse_attachment_text(content, extension=extension)
            extracted = extract_fields_from_lines(text_to_lines(attachment_text), field_definitions, field_names=remaining)
            extracted = {name: value for name, value in extracted.items() if value}
            merged.update(extracted)
            remaining -= set(extracted)
            if not remaining:
                break
        except Exception as exc:
            logger.warning("Failed to extract attachment %s: %s", candidate.url, exc)
    return merged
