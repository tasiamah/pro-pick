from __future__ import annotations

from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse


async def handle_unexpected_error(request: Request, exc: Exception) -> JSONResponse:
    """Return a consistent JSON body for otherwise unhandled exceptions."""
    return JSONResponse(status_code=500, content={"detail": "Internal server error"})


def register_exception_handlers(app: FastAPI) -> None:
    """Keep error responses consistent JSON across the API."""
    app.add_exception_handler(Exception, handle_unexpected_error)
