import uuid
from datetime import datetime, timezone

from sqlalchemy import BigInteger, Boolean, DateTime, Integer, String, Text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base


class User(Base):
    __tablename__ = "users"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    email: Mapped[str] = mapped_column(
        String(255), unique=True, index=True, nullable=False
    )
    hashed_password: Mapped[str | None] = mapped_column(String(255), nullable=True)
    first_name: Mapped[str] = mapped_column(String(100), nullable=False)
    last_name: Mapped[str] = mapped_column(String(100), nullable=False)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    is_admin: Mapped[bool] = mapped_column(Boolean, default=False)
    is_verified: Mapped[bool] = mapped_column(Boolean, default=False)

    # OAuth
    auth_provider: Mapped[str] = mapped_column(
        String(50), default="email"
    )  # email, google, apple
    auth_provider_id: Mapped[str | None] = mapped_column(String(255), nullable=True)

    # Profile
    phone: Mapped[str | None] = mapped_column(String(50), nullable=True)
    avatar_url: Mapped[str | None] = mapped_column(Text, nullable=True)

    # Locale
    language: Mapped[str] = mapped_column(String(10), default="en-GB")
    currency: Mapped[str] = mapped_column(String(3), default="GBP")

    # Email verification
    verification_token: Mapped[str | None] = mapped_column(
        String(128), nullable=True, index=True
    )
    verification_token_expires_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )

    # Password reset
    password_reset_token: Mapped[str | None] = mapped_column(
        String(128), nullable=True, index=True
    )
    password_reset_token_expires_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )

    # Brute-force throttling, per account.
    #
    # In the database rather than in process memory because this is exactly
    # the case memory cannot cover: the same account tried from many
    # addresses, across four uvicorn workers. The lock is deliberately short
    # — a long one turns "guess a password" into "lock someone out of their
    # own account", which is a nastier attack than the one it prevents.
    failed_login_attempts: Mapped[int] = mapped_column(
        Integer, default=0, nullable=False, server_default="0"
    )
    login_locked_until: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )

    # Admin step-up (TOTP)
    #
    # Only admins ever populate these. The secret is the authenticator's
    # shared secret; `confirmed_at` is null between generating one and proving
    # you can read a code off it, so a half-finished enrolment never counts.
    # `last_step` is the time step of the last accepted code, which is what
    # stops the same code being replayed inside its 30-second window.
    admin_totp_secret: Mapped[str | None] = mapped_column(String(64), nullable=True)
    admin_totp_confirmed_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    admin_totp_last_step: Mapped[int | None] = mapped_column(BigInteger, nullable=True)

    # A verified code opens a short window rather than being demanded once per
    # click. The token is held only by the browser that passed the check, so a
    # session stolen onto another device does not inherit the unlock; only its
    # hash is stored, so the database does not hold the bearer value.
    admin_stepup_hash: Mapped[str | None] = mapped_column(String(128), nullable=True)
    admin_stepup_expires_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )

    # Timestamps
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc)
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
    )
    last_login_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    # Touched by authenticated requests, so it can answer "who is using this
    # right now" — which last_login_at cannot, since it only moves at sign-in.
    last_seen_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True, index=True
    )

    # Relationships
    company = relationship("Company", back_populates="user", uselist=False)
    clients = relationship("Client", back_populates="user")
    invoices = relationship("Invoice", back_populates="user")
    expenses = relationship("Expense", back_populates="user")
    expense_categories = relationship("ExpenseCategory", back_populates="user")
    items = relationship("Item", back_populates="user")
    payments = relationship("Payment", back_populates="user")
