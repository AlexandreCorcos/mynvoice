import uuid
from decimal import Decimal

from sqlalchemy import ForeignKey, Integer, Numeric, String, Text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base


class InvoiceItem(Base):
    __tablename__ = "invoice_items"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    invoice_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("invoices.id", ondelete="CASCADE"), index=True
    )

    # Item details
    description: Mapped[str] = mapped_column(Text, nullable=False)
    quantity: Mapped[Decimal] = mapped_column(
        Numeric(10, 2), default=Decimal("1.00")
    )
    unit_price: Mapped[Decimal] = mapped_column(
        Numeric(12, 2), nullable=False
    )
    amount: Mapped[Decimal] = mapped_column(
        Numeric(12, 2), nullable=False
    )  # quantity * unit_price

    # Optional unit label (e.g., "hours", "items", "days")
    unit: Mapped[str | None] = mapped_column(String(50), nullable=True)

    # Ordering for drag & drop
    sort_order: Mapped[int] = mapped_column(Integer, default=0)

    # Relationships
    invoice = relationship("Invoice", back_populates="items")
