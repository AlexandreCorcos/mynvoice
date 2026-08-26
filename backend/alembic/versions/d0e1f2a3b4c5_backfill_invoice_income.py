"""backfill ledger income rows from invoices already paid

Cash-basis revenue reads income rows from the ledger. Existing invoices that
have received money predate the projection, so seed one income row each
(kind=income, source=invoice) equal to their amount_paid. Idempotent: skips any
invoice that already has its projected row.

Revision ID: d0e1f2a3b4c5
Revises: c9d0e1f2a3b4
Create Date: 2026-08-26
"""

from alembic import op

revision = "d0e1f2a3b4c5"
down_revision = "c9d0e1f2a3b4"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.execute(
        """
        INSERT INTO expenses (
            id, user_id, kind, source, invoice_id, client_id,
            description, amount, currency, expense_type, expense_date,
            is_billable, created_at, updated_at
        )
        SELECT
            gen_random_uuid(), i.user_id,
            'INCOME'::transactionkind, 'INVOICE'::transactionsource,
            i.id, i.client_id,
            'Invoice ' || i.invoice_number, i.amount_paid, i.currency,
            'VARIABLE'::expensetype,
            COALESCE(i.payment_date, i.issue_date, CURRENT_DATE),
            false, now(), now()
        FROM invoices i
        WHERE i.amount_paid > 0
          AND NOT EXISTS (
              SELECT 1 FROM expenses e
              WHERE e.invoice_id = i.id
                AND e.source = 'INVOICE'::transactionsource
          );
        """
    )


def downgrade() -> None:
    op.execute(
        "DELETE FROM expenses WHERE source = 'INVOICE'::transactionsource;"
    )
