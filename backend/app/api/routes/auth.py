import secrets
from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Request, Response, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.security import (
    create_access_token,
    create_refresh_token,
    decode_token,
    hash_password,
    verify_password,
)
from app.core import ratelimit
from app.core.cookies import REFRESH_COOKIE, clear_session, set_session
from app.db.session import get_db
from app.models.user import User
from app.schemas.auth import (
    LoginRequest,
    RefreshRequest,
    TokenResponse,
)
from app.services.email import send_password_reset_email, send_verification_email

router = APIRouter()

VERIFICATION_TOKEN_EXPIRE_HOURS = 24
PASSWORD_RESET_TOKEN_EXPIRE_HOURS = 1


class RegisterRequest(BaseModel):
    email: str
    first_name: str
    last_name: str


class SetPasswordRequest(BaseModel):
    token: str
    password: str


def _issue_session(response: Response, user: User) -> TokenResponse:
    """Plant the session cookies and hand the tokens back.

    The body still carries them so that clients without a cookie jar — a
    future mobile app, curl — have a way in. The web app ignores them: it
    never touches a token, which is the entire point of the move.
    """
    access = create_access_token(str(user.id))
    refresh = create_refresh_token(str(user.id))
    set_session(response, access, refresh)
    return TokenResponse(access_token=access, refresh_token=refresh)


@router.post("/register", status_code=201)
async def register(data: RegisterRequest, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(User).where(User.email == data.email))
    if result.scalar_one_or_none():
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Email already registered")

    token = secrets.token_urlsafe(32)
    expires_at = datetime.now(timezone.utc) + timedelta(hours=VERIFICATION_TOKEN_EXPIRE_HOURS)

    user = User(
        email=data.email,
        first_name=data.first_name,
        last_name=data.last_name,
        is_verified=False,
        verification_token=token,
        verification_token_expires_at=expires_at,
    )
    db.add(user)
    await db.commit()

    await send_verification_email(
        to_email=data.email,
        first_name=data.first_name,
        token=token,
    )

    return {"message": "Check your email to set your password and activate your account."}


@router.post("/set-password", response_model=TokenResponse)
async def set_password(
    data: SetPasswordRequest,
    response: Response,
    db: AsyncSession = Depends(get_db),
):
    if len(data.password) < 8:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="Password must be at least 8 characters")

    result = await db.execute(select(User).where(User.verification_token == data.token))
    user = result.scalar_one_or_none()

    if not user:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid or expired link")

    if user.verification_token_expires_at and user.verification_token_expires_at < datetime.now(timezone.utc):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Link has expired. Please register again.")

    user.hashed_password = hash_password(data.password)
    user.is_verified = True
    user.verification_token = None
    user.verification_token_expires_at = None
    user.last_login_at = datetime.now(timezone.utc)
    await db.commit()

    return _issue_session(response, user)


class ForgotPasswordRequest(BaseModel):
    email: str


# Unthrottled, this endpoint is a mail cannon: it sends a real email to any
# address on demand. The per-address limit stops one machine spraying; the
# per-recipient limit stops a chosen victim's inbox being filled from many.
RESET_PER_IP = 5
RESET_PER_EMAIL = 3
RESET_WINDOW = 60 * 60


@router.post("/forgot-password", status_code=200)
async def forgot_password(
    data: ForgotPasswordRequest,
    request: Request,
    db: AsyncSession = Depends(get_db),
):
    ratelimit.limit(
        f"reset:ip:{ratelimit.client_ip(request)}",
        limit_count=RESET_PER_IP,
        per_seconds=RESET_WINDOW,
    )
    ratelimit.limit(
        f"reset:email:{data.email.strip().lower()}",
        limit_count=RESET_PER_EMAIL,
        per_seconds=RESET_WINDOW,
    )

    result = await db.execute(select(User).where(User.email == data.email))
    user = result.scalar_one_or_none()

    # Always return success to avoid email enumeration
    if user:
        if not user.is_verified:
            # Account exists but was never activated — resend the activation email
            token = secrets.token_urlsafe(32)
            user.verification_token = token
            user.verification_token_expires_at = datetime.now(timezone.utc) + timedelta(hours=VERIFICATION_TOKEN_EXPIRE_HOURS)
            await db.commit()
            await send_verification_email(
                to_email=user.email,
                first_name=user.first_name,
                token=token,
            )
        else:
            # Normal password reset flow
            token = secrets.token_urlsafe(32)
            user.password_reset_token = token
            user.password_reset_token_expires_at = datetime.now(timezone.utc) + timedelta(hours=PASSWORD_RESET_TOKEN_EXPIRE_HOURS)
            await db.commit()
            await send_password_reset_email(
                to_email=user.email,
                first_name=user.first_name,
                token=token,
            )

    return {"message": "If an account exists for that email, you'll receive a reset link shortly."}


@router.post("/reset-password", response_model=TokenResponse)
async def reset_password(
    data: SetPasswordRequest,
    response: Response,
    db: AsyncSession = Depends(get_db),
):
    if len(data.password) < 8:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="Password must be at least 8 characters")

    result = await db.execute(select(User).where(User.password_reset_token == data.token))
    user = result.scalar_one_or_none()

    if not user:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid or expired link")

    if user.password_reset_token_expires_at and user.password_reset_token_expires_at < datetime.now(timezone.utc):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Link has expired. Please request a new one.")

    user.hashed_password = hash_password(data.password)
    user.password_reset_token = None
    user.password_reset_token_expires_at = None
    user.last_login_at = datetime.now(timezone.utc)
    await db.commit()

    return _issue_session(response, user)


# Two guards, because they cover different attacks. The per-address one stops
# a burst from one machine; the per-account one, held in the database, stops
# the same account being ground down from many addresses across four workers.
LOGIN_PER_IP = 12
LOGIN_PER_IP_WINDOW = 15 * 60
LOGIN_FAILURES_BEFORE_LOCK = 6
LOGIN_LOCK = timedelta(minutes=5)


@router.post("/login", response_model=TokenResponse)
async def login(
    data: LoginRequest,
    request: Request,
    response: Response,
    db: AsyncSession = Depends(get_db),
):
    ip = ratelimit.client_ip(request)
    ratelimit.limit(
        f"login:ip:{ip}", limit_count=LOGIN_PER_IP, per_seconds=LOGIN_PER_IP_WINDOW
    )

    result = await db.execute(select(User).where(User.email == data.email))
    user = result.scalar_one_or_none()

    now = datetime.now(timezone.utc)

    if user and user.login_locked_until:
        locked_until = user.login_locked_until
        if locked_until.tzinfo is None:
            locked_until = locked_until.replace(tzinfo=timezone.utc)
        if locked_until > now:
            wait = int((locked_until - now).total_seconds()) + 1
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail=f"Too many failed attempts. Try again in {wait} seconds.",
                headers={"Retry-After": str(wait)},
            )

    if not user or not user.hashed_password or not verify_password(data.password, user.hashed_password):
        # Count the failure against the account when there is one. The reply
        # stays identical either way — the point of the generic message is
        # that it does not say whether the address exists.
        if user:
            user.failed_login_attempts = (user.failed_login_attempts or 0) + 1
            if user.failed_login_attempts >= LOGIN_FAILURES_BEFORE_LOCK:
                user.login_locked_until = now + LOGIN_LOCK
                user.failed_login_attempts = 0
            await db.commit()
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid email or password")

    if not user.is_active:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Account is deactivated")

    if not user.is_verified:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Please verify your email before logging in")

    user.last_login_at = now
    user.failed_login_attempts = 0
    user.login_locked_until = None
    await db.commit()

    # Someone who fumbled their password twice should not still be carrying
    # it against them for the next quarter of an hour.
    ratelimit.forget(f"login:ip:{ip}")

    return _issue_session(response, user)


@router.post("/refresh", response_model=TokenResponse)
async def refresh_token(
    request: Request,
    response: Response,
    db: AsyncSession = Depends(get_db),
):
    """Renew the session.

    Two ways in, so the body is read by hand rather than declared: browsers
    send the cookie and no body at all, other clients POST the token. Declaring
    it as an optional model looked right but rejected `{}` with a 422 before
    the cookie was ever looked at — the validation fired first.
    """
    # The cookie is scoped to this path precisely so it arrives here and
    # nowhere else.
    token = request.cookies.get(REFRESH_COOKIE)

    if not token:
        try:
            body = await request.json()
            token = (body or {}).get("refresh_token")
        except Exception:
            token = None

    if not token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, detail="No refresh token"
        )

    payload = decode_token(token)
    if not payload or payload.get("type") != "refresh":
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid refresh token")

    user_id = payload.get("sub")
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()

    if not user or not user.is_active:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="User not found or inactive")

    return _issue_session(response, user)


@router.post("/logout", status_code=200)
async def logout(response: Response):
    """Sign out.

    This has to be a round trip now. The session cookie is `HttpOnly`, so the
    page cannot delete it — only the server that set it can, and it does so by
    matching the same name, path and flags.
    """
    clear_session(response)
    return {"ok": True}
