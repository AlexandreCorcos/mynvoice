from datetime import datetime, timedelta, timezone

from fastapi import Depends, Header, HTTPException, Request, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core import stepup
from app.core.cookies import ACCESS_COOKIE
from app.core.security import decode_token
from app.db.session import get_db
from app.models.user import User

# `auto_error=False` so a request carrying only the session cookie is not
# rejected before it is looked at. The header is still accepted, for clients
# that have no cookie jar — a future mobile app, or curl.
security = HTTPBearer(auto_error=False)

# How stale last_seen_at may get before a request bothers to update it.
PRESENCE_WRITE_INTERVAL = timedelta(minutes=1)


async def get_current_user(
    request: Request,
    credentials: HTTPAuthorizationCredentials | None = Depends(security),
    db: AsyncSession = Depends(get_db),
) -> User:
    # Cookie first: it is what the browser sends, and it is the one an
    # injected script cannot read.
    token = request.cookies.get(ACCESS_COOKIE) or (
        credentials.credentials if credentials else None
    )
    if not token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Not authenticated",
        )

    payload = decode_token(token)
    if payload is None or payload.get("type") != "access":
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token",
        )

    user_id = payload.get("sub")
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()

    if user is None or not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found or inactive",
        )

    # Presence, cheaply: only write when the stored value is more than a
    # minute stale, so a burst of requests is one UPDATE rather than twenty.
    now = datetime.now(timezone.utc)
    if user.last_seen_at is None or (now - user.last_seen_at) > PRESENCE_WRITE_INTERVAL:
        user.last_seen_at = now

    return user


async def assert_owned(db: AsyncSession, model, obj_id, user_id, detail: str) -> None:
    """Reject a foreign-key reference that points outside the caller's account.

    The one boundary in this system is ``user_id`` and it is enforced by hand.
    A row-owning endpoint scopes its own lookups, but a *reference* carried in a
    create/update body — an invoice's ``client_id``, a payment's ``invoice_id``,
    an expense's ``category_id`` — is only safe if the referenced row is checked
    to belong to the same account. A missing check let one account attach
    another's client to its own invoice, whose PDF then rendered that client's
    name, address and bank details. 404 (not 403) so a foreign id is
    indistinguishable from one that does not exist.
    """
    if obj_id is None:
        return
    result = await db.execute(
        select(model.id).where(model.id == obj_id, model.user_id == user_id)
    )
    if result.scalar_one_or_none() is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=detail)


async def get_current_admin(
    user: User = Depends(get_current_user),
) -> User:
    if not user.is_admin:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin access required",
        )
    return user


async def require_step_up(
    admin: User = Depends(get_current_admin),
    x_admin_step_up: str | None = Header(default=None),
) -> User:
    """Guards the admin actions that are hard to take back.

    The details are machine-readable on purpose — the panel branches on them
    to offer enrolment or a code prompt. 403 rather than 401 throughout: a 401
    would send the API client into its "session is dead" path and sign the
    admin out mid-action.
    """
    if not stepup.is_enrolled(admin):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN, detail="totp_enrolment_required"
        )

    if not stepup.window_is_open(admin, x_admin_step_up):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="totp_required")

    return admin
