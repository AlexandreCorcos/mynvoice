"""Session cookies.

The session used to live in `localStorage`, which meant any injected script
could read it and post it somewhere else. `HttpOnly` puts it out of reach of
JavaScript entirely.

Be precise about what that buys, because it is easy to oversell: an XSS on the
page can still *make* authenticated requests, since the browser attaches the
cookie for it. What it can no longer do is take the session away — read the
token, send it elsewhere, and keep using the account after the tab is closed.
That is the difference between a compromised page and a compromised account.

Two decisions worth the explanation:

**Host-only, on the API's own hostname.** No `Domain` attribute, so the cookie
belongs to `api.mynvoice.com` and nothing else. The obvious alternative —
`Domain=.mynvoice.com`, so the app and the API "share" it — would send the
session to *every* subdomain, and DNS currently resolves all of them to an
unrelated site. That is the same hole the CORS regex had, re-opened in a worse
place. The frontend does not need to read the cookie, only to send it, and
`credentials: "include"` does that across origins as long as CORS allows it.

**`SameSite=Lax` is enough.** `app.mynvoice.com` and `api.mynvoice.com` share
a registrable domain, so requests between them are *same-site* even though
they are cross-origin. `SameSite=None` would be a needless loosening.

The refresh cookie is scoped to the auth routes: it is only useful there, and
a cookie that is not sent cannot be stolen from a request that did not need
it.
"""

import secrets

from fastapi import Response

from app.core.config import settings

ACCESS_COOKIE = "mynv_session"
REFRESH_COOKIE = "mynv_refresh"

# Readable by design — the CSRF half of a double-submit pair. It is not a
# secret; it proves the request came from a page that can read our cookies,
# which a cross-site attacker cannot.
CSRF_COOKIE = "mynv_csrf"
CSRF_HEADER = "x-csrf-token"

REFRESH_PATH = f"{settings.API_PREFIX}/auth"


def _secure() -> bool:
    """Off in development, where the app is served over plain http and a
    `Secure` cookie would simply never be stored."""
    return not settings.DEBUG


def set_session(response: Response, access_token: str, refresh_token: str) -> None:
    response.set_cookie(
        ACCESS_COOKIE,
        access_token,
        max_age=settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60,
        httponly=True,
        secure=_secure(),
        samesite="lax",
        path="/",
    )
    response.set_cookie(
        REFRESH_COOKIE,
        refresh_token,
        max_age=settings.REFRESH_TOKEN_EXPIRE_DAYS * 24 * 60 * 60,
        httponly=True,
        secure=_secure(),
        samesite="lax",
        path=REFRESH_PATH,
    )
    issue_csrf(response)


def issue_csrf(response: Response) -> str:
    """Mint a CSRF token and return it.

    Not `HttpOnly` by convention, but the app cannot read it anyway — it is a
    cookie on the API's hostname and the app is served from another. The value
    reaches the page through `GET /auth/csrf`; the cookie exists so the server
    has something to compare the header against.

    Same lifetime as the refresh cookie: the page needs it for as long as the
    session can be renewed.
    """
    token = secrets.token_urlsafe(24)
    response.set_cookie(
        CSRF_COOKIE,
        token,
        max_age=settings.REFRESH_TOKEN_EXPIRE_DAYS * 24 * 60 * 60,
        httponly=False,
        secure=_secure(),
        samesite="lax",
        path="/",
    )
    return token


def clear_session(response: Response) -> None:
    """Delete all three. The paths must match what `set_session` used, or the
    browser keeps the originals and the user stays signed in."""
    response.delete_cookie(ACCESS_COOKIE, path="/", samesite="lax", secure=_secure())
    response.delete_cookie(
        REFRESH_COOKIE, path=REFRESH_PATH, samesite="lax", secure=_secure()
    )
    response.delete_cookie(CSRF_COOKIE, path="/", samesite="lax", secure=_secure())
