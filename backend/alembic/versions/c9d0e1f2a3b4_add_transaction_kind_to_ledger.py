"""add transaction kind/source to the expenses ledger

Turns the expenses table into a unified income+expense ledger:
  - kind:   EXPENSE | INCOME  (existing rows backfill to EXPENSE)
  - source: MANUAL  | INVOICE (existing rows backfill to MANUAL)
  - invoice_id: link for income rows projected from a paid invoice
Also tags expense_categories with a kind so income and expense keep
separate category lists.

Revision ID: c9d0e1f2a3b4
Revises: b8c9d0e1f2a3
Create Date: 2026-08-26
"""

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision = "c9d0e1f2a3b4"
down_revision = "b8c9d0e1f2a3"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.execute("CREATE TYPE transactionkind AS ENUM ('EXPENSE', 'INCOME')")
    op.execute("CREATE TYPE transactionsource AS ENUM ('MANUAL', 'INVOICE')")

    kind = postgresql.ENUM(
        "EXPENSE", "INCOME", name="transactionkind", create_type=False
    )
    source = postgresql.ENUM(
        "MANUAL", "INVOICE", name="transactionsource", create_type=False
    )

    # expenses → unified ledger
    op.add_column(
        "expenses",
        sa.Column("kind", kind, nullable=False, server_default="EXPENSE"),
    )
    op.add_column(
        "expenses",
        sa.Column("source", source, nullable=False, server_default="MANUAL"),
    )
    op.add_column(
        "expenses",
        sa.Column("invoice_id", postgresql.UUID(as_uuid=True), nullable=True),
    )
    op.create_foreign_key(
        "fk_expenses_invoice_id",
        "expenses",
        "invoices",
        ["invoice_id"],
        ["id"],
        ondelete="SET NULL",
    )
    op.create_index("ix_expenses_kind", "expenses", ["kind"])
    op.create_index("ix_expenses_invoice_id", "expenses", ["invoice_id"])

    # expense_categories → tagged by kind
    op.add_column(
        "expense_categories",
        sa.Column("kind", kind, nullable=False, server_default="EXPENSE"),
    )
    op.create_index("ix_expense_categories_kind", "expense_categories", ["kind"])


def downgrade() -> None:
    op.drop_index("ix_expense_categories_kind", table_name="expense_categories")
    op.drop_column("expense_categories", "kind")

    op.drop_index("ix_expenses_invoice_id", table_name="expenses")
    op.drop_index("ix_expenses_kind", table_name="expenses")
    op.drop_constraint("fk_expenses_invoice_id", "expenses", type_="foreignkey")
    op.drop_column("expenses", "invoice_id")
    op.drop_column("expenses", "source")
    op.drop_column("expenses", "kind")

    op.execute("DROP TYPE transactionsource")
    op.execute("DROP TYPE transactionkind")
