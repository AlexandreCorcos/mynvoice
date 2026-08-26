"""unique (user_id, invoice_number)

Revision ID: b4c5d6e7f8a9
Revises: a3b4c5d6e7f8
Create Date: 2026-08-26 00:00:00.000000

Defence-in-depth behind the per-user advisory lock (app/core/locks.py): the
database now refuses two invoices with the same number in one account, so the
numbering race can never store a duplicate even if the application lock were
somehow bypassed. Uniqueness is scoped to user_id — two accounts may each hold
INV-00001.
"""
from typing import Sequence, Union

from alembic import op


# revision identifiers, used by Alembic.
revision: str = "b4c5d6e7f8a9"
down_revision: Union[str, None] = "a3b4c5d6e7f8"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


CONSTRAINT = "uq_invoices_user_invoice_number"


def upgrade() -> None:
    # Uniquify any pre-existing duplicates before the constraint is added, so
    # the migration can never fail the deploy. There should be none once the
    # race is fixed; if any survive from before, the *later* row (by created_at)
    # is suffixed and the earliest keeps the number. A duplicate legal number is
    # already broken, so this repairs it rather than renaming good data.
    op.execute(
        """
        WITH d AS (
            SELECT id,
                   row_number() OVER (
                       PARTITION BY user_id, invoice_number
                       ORDER BY created_at, id
                   ) AS rn
            FROM invoices
        )
        UPDATE invoices i
        SET invoice_number = i.invoice_number || '-DUP' || d.rn
        FROM d
        WHERE i.id = d.id AND d.rn > 1
        """
    )
    op.create_unique_constraint(
        CONSTRAINT, "invoices", ["user_id", "invoice_number"]
    )


def downgrade() -> None:
    op.drop_constraint(CONSTRAINT, "invoices", type_="unique")
