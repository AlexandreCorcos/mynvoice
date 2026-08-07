"""CSRF protection.

Bearer tokens gave this for free: another site cannot make your browser attach
an `Authorization` header. Cookies are attached automatically, so moving the
session into one re-opens the door and it has to be closed deliberately.

Two locks, and the second exists because the first has a gap:

**CORS.** Any request carrying JSON or a custom header is preflighted, and the
allowlist rejects unknown origins before the real request is sent. That covers
almost everything this API accepts.

**Double-submit token.** The gap is "simple" requests — a plain HTML form POST
sends no preflight at all. Those would reach the endpoint with the session
cookie attached. They would then fail to parse as JSON, which is an accident
of the content type rather than a control, so instead: every state-changing
request must echo the readable `mynv_csrf` cookie back in a header. A
cross-site attacker can cause a request but cannot read our cookies, so cannot
produce the header.

Requests authenticated by `Authorization` are skipped — a header the attacker
cannot set is already proof enough, and demanding a cookie from a client that
has no cookie jar would break every non-browser caller.
"""

import secrets

from fastapi import Request
from fastapi.responses import JSONResponse

from app.core.cookies import ACCESS_COOKIE, CSRF_COOKIE, CSRF_HEADER

UNSAFE_METHODS = {"POST", "PUT", "PATCH", "DELETE"}

# Signing in is where the session cookie comes *from*, so these cannot require
# one. They are safe without it: none of them act on an existing session, and
# each is guarded by something else — a password, or a single-use token from
# an email.
EXEMPT_SUFFIXES = (
    "/auth/login",
    "/auth/register",
    "/auth/refresh",
    "/auth/logout",
    "/auth/forgot-password",
    "/auth/reset-password",
    "/auth/set-password",
    "/auth/google",
)


def _exempt(path: str) -> bool:
    return any(path.endswith(suffix) for suffix in EXEMPT_SUFFIXES)


async def csrf_middleware(request: Request, call_next):
    if request.method not in UNSAFE_METHODS or _exempt(request.url.path):
        return await call_next(request)

    # No session cookie means this is not a cookie-authenticated request.
    if not request.cookies.get(ACCESS_COOKIE):
        return await call_next(request)

    expected = request.cookies.get(CSRF_COOKIE)
    provided = request.headers.get(CSRF_HEADER)

    if not expected or not provided or not secrets.compare_digest(expected, provided):
        return JSONResponse(
            status_code=403,
            content={"detail": "csrf_failed"},
        )

    return await call_next(request)
