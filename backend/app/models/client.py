import uuid
from datetime import datetime, timezone

from sqlalchemy import DateTime, ForeignKey, String, Text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base


class Client(Base):
    __tablename__ = "clients"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), index=True
    )

    # Company info
    company_name: Mapped[str] = mapped_column(String(255), nullable=False)
    contact_person: Mapped[str | None] = mapped_column(String(255), nullable=True)
    email: Mapped[str] = mapped_column(String(255), nullable=False)
    phone: Mapped[str | None] = mapped_column(String(50), nullable=True)

    # Address
    address_line1: Mapped[str | None] = mapped_column(String(255), nullable=True)
    address_line2: Mapped[str | None] = mapped_column(String(255), nullable=True)
    city: Mapped[str | None] = mapped_column(String(100), nullable=True)
    county: Mapped[str | None] = mapped_column(String(100), nullable=True)
    postcode: Mapped[str | None] = mapped_column(String(20), nullable=True)
    country: Mapped[str] = mapped_column(String(100), default="United Kingdom")

    # Tax
    vat_number: Mapped[str | None] = mapped_column(String(100), nullable=True)

    # Invoice settings (per-client)
    invoice_prefix: Mapped[str | None] = mapped_column(String(10), nullable=True)
    next_invoice_number: Mapped[int] = mapped_column(default=1)
    use_year_in_number: Mapped[bool] = mapped_column(default=False)
    default_payment_terms_days: Mapped[int | None] = mapped_column(nullable=True)
    default_notes: Mapped[str | None] = mapped_column(Text, nullable=True)

    # Bank details (for invoices to this client)
    bank_name: Mapped[str | None] = mapped_column(String(255), nullable=True)
    bank_account_name: Mapped[str | None] = mapped_column(String(255), nullable=True)
    bank_account_number: Mapped[str | None] = mapped_column(String(50), nullable=True)
    bank_sort_code: Mapped[str | None] = mapped_column(String(20), nullable=True)
    bank_iban: Mapped[str | None] = mapped_column(String(50), nullable=True)
    bank_swift: Mapped[str | None] = mapped_column(String(20), nullable=True)

    # Notes
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)

    # Timestamps
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc)
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
    )

    # Relationships
    user = relationship("User", back_populates="clients")
    invoices = relationship("Invoice", back_populates="client")
