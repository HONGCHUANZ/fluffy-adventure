from __future__ import annotations

from typing import Any

from ..models import FieldDefinition
from ..normalize import normalize_datetime_text, normalize_notice_title, normalize_whitespace


def extract_list_fields(item: dict[str, Any], field_definitions: list[FieldDefinition]) -> dict[str, str]:
    extracted: dict[str, str] = {}
    for field in field_definitions:
        if field.source != "list":
            continue
        if field.strategy != "list_key":
            continue
        raw_value = item.get(field.key or "", "")
        value = "" if raw_value is None else str(raw_value)
        value = normalize_whitespace(value)
        for step in field.postprocess:
            if step == "normalize_datetime":
                value = normalize_datetime_text(value)
            elif step == "normalize_notice_title":
                value = normalize_notice_title(value)
        extracted[field.name] = value
    return extracted
