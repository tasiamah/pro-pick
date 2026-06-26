from __future__ import annotations

import threading
import time

from fastapi import Request
from fastapi.responses import JSONResponse
from starlette.middleware.base import BaseHTTPMiddleware, RequestResponseEndpoint
from starlette.responses import Response

from app.core.config import settings


class FixedWindowStore:
    """Counts requests per client within a fixed, rolling time window."""

    def __init__(self) -> None:
        self._lock = threading.Lock()
        self._windows: dict[str, tuple[float, int]] = {}

    def increment(self, key: str, window_seconds: float) -> int:
        now = time.monotonic()
        with self._lock:
            window_start, count = self._windows.get(key, (now, 0))
            if now - window_start >= window_seconds:
                window_start, count = now, 0
            count += 1
            self._windows[key] = (window_start, count)
            return count

    def clear(self) -> None:
        with self._lock:
            self._windows.clear()


rate_limit_store = FixedWindowStore()


class RateLimitMiddleware(BaseHTTPMiddleware):
    """Rejects clients that exceed the configured request rate per window."""

    async def dispatch(
        self, request: Request, call_next: RequestResponseEndpoint
    ) -> Response:
        if not settings.rate_limit_enabled:
            return await call_next(request)

        client = request.client.host if request.client else "unknown"
        count = rate_limit_store.increment(client, settings.rate_limit_window_seconds)
        if count > settings.rate_limit_requests:
            return JSONResponse(
                status_code=429,
                content={"detail": "Rate limit exceeded. Try again later."},
                headers={"Retry-After": str(int(settings.rate_limit_window_seconds))},
            )
        return await call_next(request)
