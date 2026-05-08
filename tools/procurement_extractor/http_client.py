from __future__ import annotations

import logging
import time
from typing import Any, Dict, Optional

import requests


class HttpClient:
    def __init__(self, default_headers: Optional[Dict[str, str]] = None, timeout: int = 30) -> None:
        self.session = requests.Session()
        self.timeout = timeout
        self.logger = logging.getLogger(__name__)
        if default_headers:
            self.session.headers.update(default_headers)

    def request(self, method: str, url: str, *, params: Optional[Dict[str, Any]] = None, data: Optional[Dict[str, Any]] = None, headers: Optional[Dict[str, str]] = None, retries: int = 2, allow_redirects: bool = True) -> requests.Response:
        last_error: Exception | None = None
        for attempt in range(retries + 1):
            try:
                response = self.session.request(
                    method=method,
                    url=url,
                    params=params,
                    data=data,
                    headers=headers,
                    timeout=self.timeout,
                    allow_redirects=allow_redirects,
                )
                response.raise_for_status()
                if not response.encoding:
                    response.encoding = response.apparent_encoding or "utf-8"
                return response
            except Exception as exc:
                last_error = exc
                self.logger.warning("Request failed (%s %s) attempt %s/%s: %s", method, url, attempt + 1, retries + 1, exc)
                if attempt < retries:
                    time.sleep(1 + attempt)
        assert last_error is not None
        raise last_error

    def get_text(self, url: str, *, headers: Optional[Dict[str, str]] = None) -> str:
        return self.request("GET", url, headers=headers).text

    def get_bytes(self, url: str, *, headers: Optional[Dict[str, str]] = None) -> bytes:
        response = self.request("GET", url, headers=headers)
        content_type = response.headers.get("content-type", "").lower()
        if "text/html" in content_type and "downloadztbattach" in url.lower() and b"ztbAttachDownloadAction.action?cmd=getContent" in response.content:
            match = response.text.split('form.action = "', 1)
            if len(match) == 2:
                action = match[1].split('"', 1)[0]
                download_url = requests.compat.urljoin(response.url, action)
                response = self.request("POST", download_url, headers=headers, allow_redirects=True)
        return response.content

    def post_json(self, url: str, *, data: Dict[str, Any], headers: Optional[Dict[str, str]] = None) -> Any:
        response = self.request("POST", url, data=data, headers=headers)
        return response.json()
