from __future__ import annotations

import time
from collections.abc import Callable
from typing import Any

import httpx

from .log import log

RETRY_STATUSES = {429, 500, 502, 503, 504}

# (status, lower-cased headers, parsed body or text)
Response = tuple[int, dict[str, str], Any]

CallHook = Callable[[str, str, int | None, int, int | None], None]


class Http:
    """Small polite HTTP client: per-source minimum spacing, retries with backoff, call hook."""

    def __init__(self, user_agent: str, on_call: CallHook | None = None) -> None:
        self.client = httpx.Client(
            timeout=httpx.Timeout(45.0, connect=15.0),
            headers={"User-Agent": user_agent, "Accept": "application/json"},
            follow_redirects=True,
        )
        self.on_call = on_call
        self._last_call: dict[str, float] = {}
        self.requests_made = 0

    def close(self) -> None:
        self.client.close()

    def get(
        self,
        source: str,
        url: str,
        *,
        params: dict[str, Any] | None = None,
        headers: dict[str, str] | None = None,
        min_interval: float = 0.0,
        retries: int = 3,
        ratelimit_header: str | None = None,
    ) -> Response:
        attempt = 0
        while True:
            self._pace(source, min_interval)
            t0 = time.monotonic()
            status: int | None = None
            remaining: int | None = None
            try:
                r = self.client.get(url, params=params, headers=headers)
                status = r.status_code
                hdrs = {k.lower(): v for k, v in r.headers.items()}
                if ratelimit_header and hdrs.get(ratelimit_header, "").isdigit():
                    remaining = int(hdrs[ratelimit_header])
                body: Any
                try:
                    body = r.json()
                except ValueError:
                    body = r.text
            except httpx.HTTPError as exc:
                hdrs, body = {}, str(exc)
            finally:
                ms = int((time.monotonic() - t0) * 1000)
                self.requests_made += 1
                self._last_call[source] = time.monotonic()
                if self.on_call:
                    self.on_call(source, str(httpx.URL(url, params=params)), status, ms, remaining)

            if status is not None and status not in RETRY_STATUSES:
                return status, hdrs, body
            attempt += 1
            if attempt > retries:
                return status or 0, hdrs, body
            retry_after = hdrs.get("retry-after")
            delay = min(300.0, float(retry_after)) if retry_after and retry_after.isdigit() else min(120.0, 2.0 ** attempt * 5)
            log.warning("%s → %s from %s; retry %d/%d in %.0fs", source, status, url, attempt, retries, delay)
            time.sleep(delay)

    def _pace(self, source: str, min_interval: float) -> None:
        if min_interval <= 0:
            return
        last = self._last_call.get(source)
        if last is None:
            return
        wait = min_interval - (time.monotonic() - last)
        if wait > 0:
            time.sleep(wait)
