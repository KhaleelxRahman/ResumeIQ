from __future__ import annotations

import math
import time
from collections import deque
from threading import Lock

from flask import current_app, g, request

from app.api.auth_workspace import ApiError, hash_workspace_token


class SlidingWindowRateLimiter:
    """Thread-safe in-memory sliding-window rate limiter for single-worker Flask deployments."""

    def __init__(self) -> None:
        self._lock = Lock()
        self._buckets: dict[str, deque[float]] = {}

    def check(self, key: str, limit: int, window_seconds: int = 60) -> tuple[bool, int]:
        """Record an attempt and return `(allowed, retry_after_seconds)`."""
        if limit <= 0:
            return True, 0

        now = time.monotonic()
        cutoff = now - window_seconds

        with self._lock:
            entries = self._buckets.setdefault(key, deque())
            while entries and entries[0] <= cutoff:
                entries.popleft()

            if len(entries) >= limit:
                retry_after = max(1, math.ceil(entries[0] + window_seconds - now))
                return False, retry_after

            entries.append(now)

            # Bound dictionary growth by pruning empty keys opportunistically.
            if len(self._buckets) > 2048:
                stale = [k for k, q in self._buckets.items() if not q or q[-1] <= cutoff]
                for k in stale:
                    del self._buckets[k]

        return True, 0

    def reset(self) -> None:
        with self._lock:
            self._buckets.clear()


def _client_identity() -> str:
    ws = getattr(g, "workspace", None)
    if ws is not None:
        return f"ws:{ws.id}"

    raw_token = (request.headers.get("X-Workspace-Token") or "").strip()
    if len(raw_token) >= 32:
        return f"tok:{hash_workspace_token(raw_token)[:16]}"

    forwarded = (request.headers.get("X-Forwarded-For") or "").split(",")[0].strip()
    return f"ip:{forwarded or request.remote_addr or 'local'}"


def enforce_rate_limit(scope: str, limit: int, window_seconds: int = 60) -> None:
    """Enforce per-app rate limits and raise 429 RATE_LIMIT_EXCEEDED on abuse."""
    cfg = current_app.config["APP_CONFIG"]
    if not cfg.RATE_LIMIT_ENABLED:
        return

    limiter: SlidingWindowRateLimiter | None = current_app.config.get("RATE_LIMITER")
    if limiter is None:
        return

    key = f"{scope}:{_client_identity()}"
    allowed, retry_after = limiter.check(key, limit=limit, window_seconds=window_seconds)
    if not allowed:
        raise ApiError(
            status_code=429,
            code="RATE_LIMIT_EXCEEDED",
            message=f"Too many requests for this operation. Please retry in {retry_after} seconds.",
            details={"retry_after_seconds": retry_after, "limit": limit, "window_seconds": window_seconds},
        )
