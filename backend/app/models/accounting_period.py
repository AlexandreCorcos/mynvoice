import uuid
from datetime import date, datetime, timezone
from decimal import Decimal

from sqlalchemy import (
    CheckConstraint,
    Date,
    DateTime,
    ForeignKey,
    Integer,
    Numeric,
    String,
)
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base


class AccountingPeriod(Base):
    """A closing period: a date window over the transactions ledger that you
    reconcile against your bank statement, then close.

    It is a *lens*, not a container — entries belong to a period purely by
    their date, so there is no FK from a transaction to a period. Closing is
    soft and reversible: it stamps a snapshot of the totals at the moment of
    close so later edits surface as drift, and a period can be reopened and
    adjusted at any time. Nothing is ever hard-locked.
    """

    __tablename__ = "accounting_periods"
    __table_args__ = (
        CheckConstraint("end_date >= start_date", name="ck_period_dates"),
    )

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), index=True
    )

    name: Mapped[str] = mapped_column(String(100), nullable=False)
    start_date: Mapped[date] = mapped_column(Date, nullable=False)
    end_date: Mapped[date] = mapped_column(Date, nullable=False)

    # Set when the period is closed; cleared when reopened.
    closed_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )

    # Totals stamped at the moment of close, so drift is detectable afterwards.
    snapshot_income: Mapped[Decimal | None] = mapped_column(
        Numeric(12, 2), nullable=True
    )
    snapshot_expense: Mapped[Decimal | None] = mapped_column(
        Numeric(12, 2), nullable=True
    )
    snapshot_net: Mapped[Decimal | None] = mapped_column(
        Numeric(12, 2), nullable=True
    )
    snapshot_entry_count: Mapped[int | None] = mapped_column(Integer, nullable=True)
    snapshot_reconciled_count: Mapped[int | None] = mapped_column(
        Integer, nullable=True
    )

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc)
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
    )

    user = relationship("User", back_populates="accounting_periods")
