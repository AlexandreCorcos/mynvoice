"""two-level catalogue: categories (groups) -> items

The ready-made amount moves from the category to a new item level, so a
category like "Software" can hold items "Claude Code", "Heygen"… each with its
own amount. Transactions gain an optional item_id.

Revision ID: a3b4c5d6e7f8
Revises: f2a3b4c5d6e7
Create Date: 2026-08-26
"""

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision = "a3b4c5d6e7f8"
down_revision = "f2a3b4c5d6e7"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "transaction_items",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column(
            "user_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("users.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column(
            "category_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("expense_categories.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("name", sa.String(length=100), nullable=False),
        sa.Column("default_amount", sa.Numeric(12, 2), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
    )
    op.create_index(
        "ix_transaction_items_user_id", "transaction_items", ["user_id"]
    )
    op.create_index(
        "ix_transaction_items_category_id", "transaction_items", ["category_id"]
    )

    op.add_column(
        "expenses",
        sa.Column("item_id", postgresql.UUID(as_uuid=True), nullable=True),
    )
    op.create_foreign_key(
        "fk_expenses_item_id",
        "expenses",
        "transaction_items",
        ["item_id"],
        ["id"],
        ondelete="SET NULL",
    )
    op.create_index("ix_expenses_item_id", "expenses", ["item_id"])

    # The ready-made amount now lives on items.
    op.drop_column("expense_categories", "default_amount")


def downgrade() -> None:
    op.add_column(
        "expense_categories",
        sa.Column("default_amount", sa.Numeric(12, 2), nullable=True),
    )
    op.drop_index("ix_expenses_item_id", table_name="expenses")
    op.drop_constraint("fk_expenses_item_id", "expenses", type_="foreignkey")
    op.drop_column("expenses", "item_id")
    op.drop_index("ix_transaction_items_category_id", table_name="transaction_items")
    op.drop_index("ix_transaction_items_user_id", table_name="transaction_items")
    op.drop_table("transaction_items")
