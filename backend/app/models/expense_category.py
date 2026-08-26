import uuid
from datetime import datetime, timezone
from decimal import Decimal

from sqlalchemy import DateTime, Enum, ForeignKey, Numeric, String
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base
from app.models.expense import TransactionKind


class ExpenseCategory(Base):
    __tablename__ = "expense_categories"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), index=True
    )

    # A category buckets either income or expense rows, never both.
    kind: Mapped[TransactionKind] = mapped_column(
        Enum(TransactionKind),
        default=TransactionKind.EXPENSE,
        server_default="EXPENSE",
        nullable=False,
        index=True,
    )

    name: Mapped[str] = mapped_column(String(100), nullable=False)
    colour: Mapped[str | None] = mapped_column(String(7), nullable=True)  # hex
    icon: Mapped[str | None] = mapped_column(String(50), nullable=True)

    # An optional ready-made amount. When this category is picked on a new
    # transaction, the amount field is pre-filled with it (no auto-repeat).
    default_amount: Mapped[Decimal | None] = mapped_column(
        Numeric(12, 2), nullable=True
    )

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc)
    )

    # Relationships
    user = relationship("User", back_populates="expense_categories")
    expenses = relationship("Expense", back_populates="category")
