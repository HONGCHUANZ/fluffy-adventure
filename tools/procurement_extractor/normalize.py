from __future__ import annotations

import re
from datetime import datetime
from decimal import Decimal, InvalidOperation


AMOUNT_WITH_UNIT_PATTERN = re.compile(r"([0-9][0-9,\.]*)\s*(亿元|万元|元)")
LEADING_TAG_PATTERN = re.compile(r"^(?:\s*【[^】]+】)+\s*")


def normalize_whitespace(value: str) -> str:
    value = value.replace("\xa0", " ").replace("　", " ").replace("\r", " ").replace("\n", " ")
    return re.sub(r"\s+", " ", value).strip()


def _format_wanyuan(value: Decimal) -> str:
    normalized = value.quantize(Decimal("0.01")).normalize()
    text = format(normalized, "f")
    if "." in text:
        text = text.rstrip("0").rstrip(".")
    return f"{text}万元"


def normalize_amount(value: str) -> str:
    text = normalize_whitespace(value).replace(" ，", "，")
    match = AMOUNT_WITH_UNIT_PATTERN.search(text)
    if not match:
        return ""

    raw_number, unit = match.groups()
    try:
        amount = Decimal(raw_number.replace(",", ""))
    except InvalidOperation:
        return ""

    if unit == "元":
        amount = amount / Decimal("10000")
    elif unit == "亿元":
        amount = amount * Decimal("10000")

    return _format_wanyuan(amount)


def normalize_amount_value(value: str) -> str:
    normalized = normalize_amount(value)
    if not normalized:
        return ""
    return normalized.removesuffix("万元")


def normalize_region(value: str) -> str:
    text = normalize_whitespace(value)
    text = text.replace("安徽省", "").replace("合肥市", "")
    return text.strip(" ，,。；;")


def normalize_bid_region(value: str) -> str:
    text = normalize_whitespace(value)
    text = text.lstrip("☑☐□■▪•·")
    text = re.split(r"[☑☐□■▪•·]\s*本招标项目采用|本招标项目采用", text, maxsplit=1)[0]
    return text.strip(" ，,。；;")


def normalize_notice_title(value: str) -> str:
    text = normalize_whitespace(value)
    text = LEADING_TAG_PATTERN.sub("", text)
    text = re.sub(r"(?:公开招标)?公告$", "", text)
    return text.strip()


def normalize_datetime_text(value: str) -> str:
    value = normalize_whitespace(value)
    return value.replace(".0", "")


def normalize_cn_datetime_text(value: str) -> str:
    text = normalize_whitespace(value)
    text = re.sub(r"(\d{1,2}\s*月\s*\d{1,2}).{0,80}?(?=\s*日\s*\d{1,2}\s*(?:[:：]|时))", r"\1", text)
    text = re.sub(r"(?<=\d)\s+(?=\d)", "", text)
    text = re.sub(r"\s*([年月日时分秒])\s*", r"\1", text)
    text = re.sub(r"\s*:\s*", ":", text)
    return text.strip(" ，,。；;")


def mark_present(value: str) -> str:
    return "是" if normalize_whitespace(value) else ""


def date_prefix_for_filter(target_date: str) -> str:
    dt = datetime.strptime(target_date, "%Y-%m-%d")
    return f"{dt.year}-{dt.month}-{dt.day}"
