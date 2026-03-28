import uuid
from datetime import datetime, timezone
from decimal import Decimal

from sqlalchemy import DateTime, Numeric, String, Text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base


class DonationConfig(Base):
    """Admin-managed config for donation system (single row)."""

    __tablename__ = "donation_config"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    monthly_target: Mapped[Decimal] = mapped_column(
        Numeric(10, 2), default=Decimal("1000.00")
    )
    currency: Mapped[str] = mapped_column(String(3), default="GBP")
    message: Mapped[str | None] = mapped_column(Text, nullable=True)

    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
    )


class Donation(Base):
    """Records individual donations."""

    __tablename__ = "donations"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    amount: Mapped[Decimal] = mapped_column(Numeric(10, 2), nullable=False)
    currency: Mapped[str] = mapped_column(String(3), default="GBP")
    donor_name: Mapped[str | None] = mapped_column(String(255), nullable=True)
    donor_email: Mapped[str | None] = mapped_column(String(255), nullable=True)
    payment_provider: Mapped[str | None] = mapped_column(
        String(50), nullable=True
    )  # stripe, paypal, buymeacoffee
    payment_reference: Mapped[str | None] = mapped_column(String(255), nullable=True)
    message: Mapped[str | None] = mapped_column(Text, nullable=True)

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc)
    )
