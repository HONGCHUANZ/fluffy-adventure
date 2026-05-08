from __future__ import annotations

import re
from urllib.parse import urljoin

from bs4 import BeautifulSoup

from .http_client import HttpClient
from .models import SiteConfig
from .normalize import date_prefix_for_filter, normalize_datetime_text, normalize_whitespace


def _build_detail_url(base_url: str, infourl: str) -> str:
    base = base_url.rstrip("/")
    if infourl.startswith("http://") or infourl.startswith("https://"):
        return infourl
    if infourl.startswith("/"):
        return f"{base}{infourl}"
    return f"{base}/{infourl}"


def _fetch_json_list_items(client: HttpClient, site_config: SiteConfig, target_date: str) -> list[dict]:
    request_config = site_config.list_request
    payload = dict(request_config.static_params)
    date_prefix = date_prefix_for_filter(target_date)
    payload[request_config.date_param_names["start"]] = date_prefix
    payload[request_config.date_param_names["end"]] = f"{date_prefix} 23:59:59"

    result = client.post_json(
        request_config.url,
        data=payload,
        headers=request_config.headers or None,
    )

    items = result
    for segment in request_config.list_path.split('.'):
        items = items[segment]

    filtered: list[dict] = []
    date_key = site_config.date_filter.list_date_key
    for item in items:
        value = normalize_datetime_text(str(item.get(date_key, "")))
        if value.startswith(target_date):
            normalized_item = dict(item)
            infourl = str(normalized_item.get("infourl", ""))
            normalized_item["detail_url"] = _build_detail_url(site_config.base_url, infourl)
            normalized_item[date_key] = value
            filtered.append(normalized_item)
    return filtered


def _fetch_html_list_items(client: HttpClient, site_config: SiteConfig, target_date: str) -> list[dict]:
    request_config = site_config.list_request
    html = client.get_text(request_config.url, headers=request_config.headers or None)
    soup = BeautifulSoup(html, "lxml")
    pattern = re.compile(request_config.html_date_pattern)
    filtered: list[dict] = []
    seen_urls: set[str] = set()

    for anchor in soup.select(request_config.link_selector or "a[href]"):
        href = (anchor.get("href") or "").strip()
        if not href:
            continue
        title = normalize_whitespace(anchor.get(request_config.html_title_attr) or anchor.get_text(" ", strip=True))
        if not title:
            continue
        if request_config.title_keywords and not any(keyword in title for keyword in request_config.title_keywords):
            continue

        detail_url = urljoin(site_config.base_url, href)
        if detail_url in seen_urls:
            continue

        match = pattern.search(detail_url)
        if not match:
            continue
        raw_date = match.group(1)
        publish_time = f"{raw_date[:4]}-{raw_date[4:6]}-{raw_date[6:8]}"
        if publish_time != target_date:
            continue

        seen_urls.add(detail_url)
        filtered.append(
            {
                "title": title,
                "detail_url": detail_url,
                "publish_time": publish_time,
            }
        )
    return filtered


def fetch_list_items(client: HttpClient, site_config: SiteConfig, target_date: str) -> list[dict]:
    if site_config.list_request.response_type == "html":
        return _fetch_html_list_items(client, site_config, target_date)
    return _fetch_json_list_items(client, site_config, target_date)
