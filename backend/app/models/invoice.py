import enum
import uuid
from datetime import date, datetime, timezone
from decimal import Decimal

from sqlalchemy import (
    Date,
    DateTime,
    Enum,
    ForeignKey,
    Numeric,
    String,
    Text,
    UniqueConstraint,
)
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base


class InvoiceStatus(str, enum.Enum):
    DRAFT = "draft"
    SENT = "sent"
    PAID = "paid"
    OVERDUE = "overdue"
    CANCELLED = "cancelled"


class PaymentMethod(str, enum.Enum):
    BANK_TRANSFER = "bank_transfer"
    CARD = "card"
    CASH = "cash"
    OTHER = "other"


class Invoice(Base):
    __tablename__ = "invoices"
    # The database itself refuses two invoices with the same number in one
    # account — a backstop behind the per-user advisory lock in
    # app/core/locks.py. Numbers are per-user, so the uniqueness is scoped to
    # user_id, not global (two accounts may legitimately both hold INV-00001).
    __table_args__ = (
        UniqueConstraint(
            "user_id", "invoice_number", name="uq_invoices_user_invoice_number"
        ),
    )

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), index=True
    )
    client_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("clients.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )

    # Invoice identity
    invoice_number: Mapped[str] = mapped_column(String(50), nullable=False, index=True)
    reference: Mapped[str | None] = mapped_column(String(255), nullable=True)

    # Status
    status: Mapped[InvoiceStatus] = mapped_column(
        Enum(InvoiceStatus), default=InvoiceStatus.DRAFT, index=True
    )

    # Dates
    issue_date: Mapped[date] = mapped_column(Date, nullable=False)
    due_date: Mapped[date] = mapped_column(Date, nullable=False)

    # Amounts (stored as computed totals)
    subtotal: Mapped[Decimal] = mapped_column(
        Numeric(12, 2), default=Decimal("0.00")
    )
    tax_rate: Mapped[Decimal] = mapped_column(
        Numeric(5, 2), default=Decimal("0.00")
    )  # percentage
    tax_amount: Mapped[Decimal] = mapped_column(
        Numeric(12, 2), default=Decimal("0.00")
    )
    discount_amount: Mapped[Decimal] = mapped_column(
        Numeric(12, 2), default=Decimal("0.00")
    )
    total: Mapped[Decimal] = mapped_column(Numeric(12, 2), default=Decimal("0.00"))
    amount_paid: Mapped[Decimal] = mapped_column(Numeric(12, 2), default=Decimal("0.00"))
    balance_due: Mapped[Decimal] = mapped_column(Numeric(12, 2), default=Decimal("0.00"))

    # Currency
    currency: Mapped[str] = mapped_column(String(3), default="GBP")

    # Payment
    payment_method: Mapped[PaymentMethod | None] = mapped_column(
        Enum(PaymentMethod), nullable=True
    )
    payment_date: Mapped[date | None] = mapped_column(Date, nullable=True)

    # Content
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    terms: Mapped[str | None] = mapped_column(Text, nullable=True)
    footer: Mapped[str | None] = mapped_column(Text, nullable=True)

    # PDF template: "classic" | "minimal" | "bold"
    pdf_template: Mapped[str] = mapped_column(String(50), default="classic")

    # The document as it was originally issued, for invoices imported from
    # another system. When set, it is served instead of generating one: the
    # generator would print today's company profile onto a historical record,
    # and the original is the copy the client holds. A storage key rather than
    # a public URL, so access still goes through the authenticated PDF route.
    source_pdf_key: Mapped[str | None] = mapped_column(Text, nullable=True)
    source_pdf_name: Mapped[str | None] = mapped_column(String(255), nullable=True)

    # Email tracking
    sent_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    sent_to_email: Mapped[str | None] = mapped_column(String(255), nullable=True)

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
    user = relationship("User", back_populates="invoices")
    client = relationship("Client", back_populates="invoices")
    items = relationship(
        "InvoiceItem",
        back_populates="invoice",
        cascade="all, delete-orphan",
        order_by="InvoiceItem.sort_order",
    )
    payments = relationship("Payment", back_populates="invoice")
