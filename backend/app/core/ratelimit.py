"""Rate limiting.

Two mechanisms, because they fail in different directions and neither alone
is enough:

* **In-memory, per process.** Cheap, no infrastructure, and good against a
  burst from one place. Production runs uvicorn with four workers, so the
  real allowance is four times what a limit says, and it resets on deploy.
  Stated plainly rather than hidden: turning "unlimited" into "roughly forty
  attempts per quarter hour" is most of the value, and the honest number
  matters more than a flattering one.

* **In the database, per account.** Correct across workers and across
  restarts, which is exactly the case in-memory cannot cover — the same
  account attacked from many addresses. Lives on the `users` row; see
  `record_failed_login`.

Swapping the in-memory half for Redis is a drop-in replacement of `_Window`
if this ever runs on more than one host.
"""

import time
from dataclasses import dataclass, field

from fastapi import HTTPException, Request, status


@dataclass
class _Window:
    """Fixed-window counter. Keys are opaque strings."""

    hits: dict[str, list[float]] = field(default_factory=dict)

    def check(self, key: str, limit: int, per_seconds: float) -> int:
        """Record a hit. Returns seconds to wait, or 0 if allowed."""
        now = time.monotonic()
        cutoff = now - per_seconds

        recent = [t for t in self.hits.get(key, []) if t > cutoff]
        if len(recent) >= limit:
            self.hits[key] = recent
            return int(recent[0] + per_seconds - now) + 1

        recent.append(now)
        self.hits[key] = recent

        # Opportunistic sweep: without it a long-running process accumulates a
        # key per address seen, forever.
        if len(self.hits) > 4096:
            self.hits = {
                k: v
                for k, v in self.hits.items()
                if v and v[-1] > cutoff
            }

        return 0

    def clear(self, key: str) -> None:
        self.hits.pop(key, None)


_window = _Window()


def client_ip(request: Request) -> str:
    """The caller's address, as well as it can be known.

    Traefik terminates TLS and appends the peer to `X-Forwarded-For`, so the
    **last** entry is the one it observed. Anything to the left was supplied
    by the client and is worth nothing — reading the first entry, which is
    the common mistake, would let an attacker rotate their own limit key by
    inventing a header.
    """
    forwarded = request.headers.get("x-forwarded-for")
    if forwarded:
        parts = [p.strip() for p in forwarded.split(",") if p.strip()]
        if parts:
            return parts[-1]
    return request.client.host if request.client else "unknown"


def limit(key: str, *, limit_count: int, per_seconds: float) -> None:
    """Raise 429 if `key` has been seen too often. Otherwise record the hit."""
    wait = _window.check(key, limit_count, per_seconds)
    if wait:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail=f"Too many attempts. Try again in {wait} seconds.",
            headers={"Retry-After": str(wait)},
        )


def forget(key: str) -> None:
    """Drop a key's history — call after a success, so a legitimate user who
    fumbled their password twice is not still carrying it."""
    _window.clear(key)
