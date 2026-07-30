"""Step-up authentication for destructive admin actions.

The session proves you are an admin. It does not prove you are *there* — an
unlocked laptop is enough to hand someone else your session. Granting admin,
deactivating an account and forcing a password reset are worth a second
factor; reading the panel is not.

Shape of it:

* A verified code opens a five-minute window rather than being demanded once
  per click, so a run of admin work costs one code, not six.
* The window is bound to the browser that passed the check, via a random
  token returned only to it. A session copied onto another device does not
  inherit the unlock.
* Only a hash of that token is stored, so the database never holds the bearer
  value.
* An accepted code's time step is recorded, so the same six digits cannot be
  replayed inside their own thirty seconds.

Losing your authenticator is recoverable, but only with a shell on the
server: `python -m app.cli reset-totp <email>`.
"""

import hashlib
import secrets
import time
from datetime import datetime, timedelta, timezone

import pyotp

from app.core.config import settings
from app.models.user import User

STEP_UP_WINDOW = timedelta(minutes=5)

# Accept the neighbouring time steps, for clocks that drift.
VALID_WINDOW = 1

# Per-process, so it resets on deploy and does not span replicas. That is
# acceptable here: the throttle exists to make guessing six digits pointless,
# and an attacker must already hold an admin session to reach it at all.
MAX_ATTEMPTS = 5
LOCKOUT = timedelta(minutes=5)
_attempts: dict[str, tuple[int, float]] = {}


def new_secret() -> str:
    return pyotp.random_base32()


def provisioning_uri(user: User, secret: str) -> str:
    """The otpauth:// URI an authenticator app reads out of a QR code."""
    return pyotp.TOTP(secret).provisioning_uri(
        name=user.email, issuer_name=f"{settings.APP_NAME} admin"
    )


def is_enrolled(user: User) -> bool:
    return bool(user.admin_totp_secret and user.admin_totp_confirmed_at)


def locked_for(user: User) -> int:
    """Seconds until this account may try a code again. 0 when it may now."""
    record = _attempts.get(str(user.id))
    if not record:
        return 0
    count, until = record
    if count < MAX_ATTEMPTS:
        return 0
    remaining = until - time.monotonic()
    if remaining <= 0:
        _attempts.pop(str(user.id), None)
        return 0
    return int(remaining) + 1


def _note_failure(user: User) -> None:
    key = str(user.id)
    count = _attempts.get(key, (0, 0.0))[0] + 1
    _attempts[key] = (count, time.monotonic() + LOCKOUT.total_seconds())


def verify_code(user: User, code: str, *, secret: str | None = None) -> bool:
    """Check a code against the user's secret, or a pending one during enrolment.

    Mutates `admin_totp_last_step` on success; the caller commits.
    """
    secret = secret or user.admin_totp_secret
    if not secret:
        return False

    code = (code or "").strip().replace(" ", "")
    if not code.isdigit() or len(code) != 6:
        _note_failure(user)
        return False

    totp = pyotp.TOTP(secret)
    if not totp.verify(code, valid_window=VALID_WINDOW):
        _note_failure(user)
        return False

    step = int(time.time()) // totp.interval
    # Reject anything at or before the last accepted step: the six digits are
    # valid for thirty seconds, and one use is all they get.
    if user.admin_totp_last_step is not None and step <= user.admin_totp_last_step:
        _note_failure(user)
        return False

    user.admin_totp_last_step = step
    _attempts.pop(str(user.id), None)
    return True


def _hash(token: str) -> str:
    return hashlib.sha256(token.encode()).hexdigest()


def open_window(user: User) -> tuple[str, datetime]:
    """Start a step-up window. Returns the token to hand the browser."""
    token = secrets.token_urlsafe(32)
    expires = datetime.now(timezone.utc) + STEP_UP_WINDOW
    user.admin_stepup_hash = _hash(token)
    user.admin_stepup_expires_at = expires
    return token, expires


def window_is_open(user: User, token: str | None) -> bool:
    if not token or not user.admin_stepup_hash or not user.admin_stepup_expires_at:
        return False

    expires = user.admin_stepup_expires_at
    if expires.tzinfo is None:
        expires = expires.replace(tzinfo=timezone.utc)
    if expires <= datetime.now(timezone.utc):
        return False

    return secrets.compare_digest(user.admin_stepup_hash, _hash(token))


def close_window(user: User) -> None:
    user.admin_stepup_hash = None
    user.admin_stepup_expires_at = None
