from __future__ import annotations

from fastapi import Response

from app.core.config import settings


def set_cache_headers(response: Response) -> None:
    """Mark a heavy GET response as cacheable for `cache_ttl_seconds`."""
    response.headers["Cache-Control"] = f"public, max-age={settings.cache_ttl_seconds}"
