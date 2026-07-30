from datetime import datetime, timedelta, timezone

from fastapi import Depends, Header, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core import stepup
from app.core.security import decode_token
from app.db.session import get_db
from app.models.user import User

security = HTTPBearer()

# How stale last_seen_at may get before a request bothers to update it.
PRESENCE_WRITE_INTERVAL = timedelta(minutes=1)


async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: AsyncSession = Depends(get_db),
) -> User:
    payload = decode_token(credentials.credentials)
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
