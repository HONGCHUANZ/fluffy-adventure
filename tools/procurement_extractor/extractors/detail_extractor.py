from __future__ import annotations

import re
from pathlib import Path
from typing import Sequence
from urllib.parse import urljoin

from bs4 import BeautifulSoup

from ..models import AttachmentCandidate, FieldDefinition
from ..normalize import (
    mark_present,
    normalize_amount,
    normalize_amount_value,
    normalize_bid_region,
    normalize_cn_datetime_text,
    normalize_notice_title,
    normalize_region,
    normalize_whitespace,
)


AMOUNT_PATTERN = re.compile(r"([0-9][0-9,\.]*\s*[万亿]?元)")
ATTACHMENT_HINT_PATTERN = re.compile(r"attach|download", re.I)
ATTACHMENT_ONCLICK_PATTERN = re.compile(r"['\"](?P<url>/[^'\"]*download[^'\"]+)['\"]", re.I)
EXPLICIT_NONE_VALUES = {"无", "无需", "不接受", "未要求", "不要求", "无要求", "不采用"}
LABEL_PREFIX_PATTERN = re.compile(r"^\d+(?:\.\d+)*(?:[、.）)]+\s*)")
SECTION_HEADING_PATTERN = re.compile(r"^(?:第[一二三四五六七八九十]+章|\d+(?:\.\d+){0,3}\s)")
RAW_NUMBERED_LINE_PATTERN = re.compile(r"^\d+(?:\.\d+){1,3}(?:[^0-9]|$)")


def text_to_lines(text: str) -> list[str]:
    return [normalize_whitespace(line) for line in text.split("\n") if normalize_whitespace(line)]


def _html_to_lines(html: str) -> list[str]:
    soup = BeautifulSoup(html, "lxml")
    return text_to_lines(soup.get_text("\n", strip=True))


def _is_explicit_none(value: str) -> bool:
    normalized = normalize_whitespace(value).rstrip("。；;")
    return normalized in EXPLICIT_NONE_VALUES or normalized.startswith(tuple(EXPLICIT_NONE_VALUES))


def _clean_alias_value(value: str, alias: str) -> str:
    cleaned = normalize_whitespace(value)
    cleaned = cleaned.lstrip(":： )）】]}")
    cleaned = LABEL_PREFIX_PATTERN.sub("", cleaned)
    if alias and alias in cleaned:
        cleaned = cleaned.split(alias, 1)[-1].lstrip(":： ")
    return normalize_whitespace(cleaned)


def _collect_following_lines(lines: Sequence[str], start_index: int) -> list[str]:
    collected: list[str] = []
    for next_line in lines[start_index + 1:start_index + 6]:
        raw_line = normalize_whitespace(next_line)
        if RAW_NUMBERED_LINE_PATTERN.match(raw_line):
            break
        cleaned = _clean_alias_value(next_line, "")
        if not cleaned or cleaned in {"#", "# ", "#-"}:
            continue
        if SECTION_HEADING_PATTERN.match(cleaned):
            break
        collected.append(cleaned)
    return collected


def _extract_by_alias(lines: Sequence[str], aliases: list[str]) -> str:
    for index, line in enumerate(lines):
        for alias in aliases:
            if alias not in line:
                continue
            candidate = _clean_alias_value(line.split(alias, 1)[1], alias)
            if candidate:
                following = _collect_following_lines(lines, index)
                if following:
                    return normalize_whitespace(" ".join([candidate, *following]))
                return candidate
            following = _collect_following_lines(lines, index)
            if not following:
                continue
            amount_match = AMOUNT_PATTERN.search(following[0])
            if amount_match:
                return normalize_whitespace(amount_match.group(1))
            if _is_explicit_none(following[0]):
                return following[0].rstrip("。；;")
            return normalize_whitespace(" ".join(following))
    return ""


def _extract_by_regex(text: str, pattern: str) -> str:
    match = re.search(pattern, text, re.I | re.S)
    if not match:
        return ""
    if match.groups():
        for group in match.groups():
            if group:
                return normalize_whitespace(group)
        return ""
    return normalize_whitespace(match.group(0))


def _postprocess_value(value: str, postprocess: list[str]) -> str:
    if not value:
        return ""
    if _is_explicit_none(value):
        return normalize_whitespace(value).rstrip("。；;")

    processed = value
    for step in postprocess:
        if step == "normalize_amount":
            processed = normalize_amount(processed)
        elif step == "normalize_amount_value":
            processed = normalize_amount_value(processed)
        elif step == "normalize_region":
            processed = normalize_region(processed)
        elif step == "normalize_bid_region":
            processed = normalize_bid_region(processed)
        elif step == "normalize_notice_title":
            processed = normalize_notice_title(processed)
        elif step == "normalize_cn_datetime_text":
            processed = normalize_cn_datetime_text(processed)
        elif step == "mark_present":
            processed = mark_present(processed)
        if not processed:
            return ""
    return normalize_whitespace(processed).strip(" ，,。；;")


def extract_fields_from_lines(lines: list[str], field_definitions: list[FieldDefinition], *, source: str = "detail", field_names: set[str] | None = None) -> dict[str, str]:
    flattened = normalize_whitespace("\n".join(lines))
    extracted: dict[str, str] = {}

    for field in field_definitions:
        if field.source != source:
            continue
        if field_names is not None and field.name not in field_names:
            continue

        value = ""
        if field.strategy == "label_value":
            value = _extract_by_alias(lines, field.aliases)
        elif field.strategy == "regex" and field.pattern:
            value = _extract_by_regex(flattened, field.pattern)

        extracted[field.name] = _postprocess_value(value, field.postprocess)
    return extracted


def extract_detail_fields(html: str, field_definitions: list[FieldDefinition]) -> dict[str, str]:
    return extract_fields_from_lines(_html_to_lines(html), field_definitions)


def extract_attachment_candidates(html: str, *, base_url: str) -> list[AttachmentCandidate]:
    soup = BeautifulSoup(html, "lxml")
    candidates: list[AttachmentCandidate] = []
    seen_urls: set[str] = set()

    for element in soup.select("a[href], [onclick]"):
        href = ""
        title = normalize_whitespace(element.get("title") or "")
        text = normalize_whitespace(element.get_text(" ", strip=True))
        onclick = element.get("onclick") or ""
        classes = " ".join(element.get("class", []))

        raw_href = (element.get("href") or "").strip()
        if raw_href and raw_href.lower() != "javascript:void(0);":
            href = raw_href
        elif onclick:
            match = ATTACHMENT_ONCLICK_PATTERN.search(onclick)
            if match:
                href = match.group("url")

        if not href:
            continue
        if "ewb-enclosure" not in classes and not ATTACHMENT_HINT_PATTERN.search(href) and not ATTACHMENT_HINT_PATTERN.search(onclick):
            continue
        if not title and not text:
            continue

        url = urljoin(base_url, href)
        if url in seen_urls:
            continue
        seen_urls.add(url)

        name_hint = title or text or Path(href).name
        extension = Path(name_hint).suffix.lower().lstrip(".") or Path(href).suffix.lower().lstrip(".")
        candidates.append(
            AttachmentCandidate(
                url=url,
                title=title or text or Path(href).name,
                text=text,
                extension=extension,
            )
        )
    return candidates
