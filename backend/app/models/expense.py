import enum
import uuid
from datetime import date, datetime, timezone
from decimal import Decimal

from sqlalchemy import Boolean, Date, DateTime, Enum, ForeignKey, Numeric, String, Text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base


class ExpenseType(str, enum.Enum):
    FIXED = "fixed"
    VARIABLE = "variable"


class TransactionKind(str, enum.Enum):
    """A ledger row is either money out (expense) or money in (income).

    The table is historically named `expenses`, but since the ledger unifies
    both sides every money aggregation MUST filter by `kind` — an unguarded
    `SUM(amount)` would add income and expense together."""

    EXPENSE = "expense"
    INCOME = "income"


class TransactionSource(str, enum.Enum):
    """Where the row came from. `manual` is user-entered; `invoice` is an
    income row projected from a paid invoice (kept in sync, never edited by
    hand) so the ledger is the single source of truth for money received."""

    MANUAL = "manual"
    INVOICE = "invoice"


class Expense(Base):
    __tablename__ = "expenses"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), index=True
    )
    category_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("expense_categories.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )
    # Optional catalogue item this row was logged from (the leaf under a
    # category). Kept alongside category_id so breakdowns still group by group.
    item_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("transaction_items.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )

    # Ledger side + provenance. `kind` splits income from expense; `source`
    # distinguishes a hand-entered row from one projected off a paid invoice.
    kind: Mapped[TransactionKind] = mapped_column(
        Enum(TransactionKind),
        default=TransactionKind.EXPENSE,
        server_default="EXPENSE",
        nullable=False,
        index=True,
    )
    source: Mapped[TransactionSource] = mapped_column(
        Enum(TransactionSource),
        default=TransactionSource.MANUAL,
        server_default="MANUAL",
        nullable=False,
    )
    invoice_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("invoices.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )

    # Details
    description: Mapped[str] = mapped_column(String(255), nullable=False)
    amount: Mapped[Decimal] = mapped_column(Numeric(12, 2), nullable=False)
    currency: Mapped[str] = mapped_column(String(3), default="GBP")
    # Only meaningful for expenses; income rows keep the default and hide it.
    expense_type: Mapped[ExpenseType] = mapped_column(
        Enum(ExpenseType), default=ExpenseType.VARIABLE
    )
    expense_date: Mapped[date] = mapped_column(Date, nullable=False)

    # Reconciliation: set when this row is ticked off against the bank
    # statement inside a closing period. Null = not yet reconciled.
    reconciled_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )

    # Optional
    vendor: Mapped[str | None] = mapped_column(String(255), nullable=True)
    receipt_url: Mapped[str | None] = mapped_column(Text, nullable=True)
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)

    # Billable
    is_billable: Mapped[bool] = mapped_column(Boolean, default=False)
    client_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("clients.id", ondelete="SET NULL"), nullable=True
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

    # Relationships
    user = relationship("User", back_populates="expenses")
    category = relationship("ExpenseCategory", back_populates="expenses")
