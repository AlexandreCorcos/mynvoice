"""accounting periods (closing) + reconciled_at on the ledger

Revision ID: e1f2a3b4c5d6
Revises: d0e1f2a3b4c5
Create Date: 2026-08-26
"""

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision = "e1f2a3b4c5d6"
down_revision = "d0e1f2a3b4c5"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "expenses",
        sa.Column("reconciled_at", sa.DateTime(timezone=True), nullable=True),
    )

    op.create_table(
        "accounting_periods",
        sa.Column(
            "id",
            postgresql.UUID(as_uuid=True),
            primary_key=True,
        ),
        sa.Column(
            "user_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("users.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("name", sa.String(length=100), nullable=False),
        sa.Column("start_date", sa.Date(), nullable=False),
        sa.Column("end_date", sa.Date(), nullable=False),
        sa.Column("closed_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("snapshot_income", sa.Numeric(12, 2), nullable=True),
        sa.Column("snapshot_expense", sa.Numeric(12, 2), nullable=True),
        sa.Column("snapshot_net", sa.Numeric(12, 2), nullable=True),
        sa.Column("snapshot_entry_count", sa.Integer(), nullable=True),
        sa.Column("snapshot_reconciled_count", sa.Integer(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.CheckConstraint("end_date >= start_date", name="ck_period_dates"),
    )
    op.create_index(
        "ix_accounting_periods_user_id", "accounting_periods", ["user_id"]
    )


def downgrade() -> None:
    op.drop_index(
        "ix_accounting_periods_user_id", table_name="accounting_periods"
    )
    op.drop_table("accounting_periods")
    op.drop_column("expenses", "reconciled_at")
