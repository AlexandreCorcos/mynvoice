"""Ledger projection: keep the transactions ledger in step with invoices.

Revenue in MYNVOICE is cash-basis — the money actually received. Rather than
sum invoices in one place and manual income in another, every invoice projects
a single income row into the ledger (`expenses` table, kind=income,
source=invoice) equal to the money received on it. Dashboards and reports then
read one number: the ledger's income.

The projection is derived state, never edited by hand. Call `sync_invoice_income`
after anything that changes how much has been received on an invoice (a
payment, a status change, a reopen, a delete).
"""

from datetime import date
from decimal import Decimal

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.expense import Expense, TransactionKind, TransactionSource
from app.models.invoice import Invoice


async def sync_invoice_income(db: AsyncSession, invoice: Invoice) -> None:
    """Create, update or remove the ledger income row for one invoice so it
    equals the money received on it (`amount_paid`)."""
    result = await db.execute(
        select(Expense).where(
            Expense.invoice_id == invoice.id,
            Expense.source == TransactionSource.INVOICE,
        )
    )
    existing = result.scalar_one_or_none()

    received = invoice.amount_paid or Decimal("0.00")

    # Nothing received (unpaid, or fully reversed) → there is no income to show.
    if received <= 0:
        if existing is not None:
            await db.delete(existing)
        return

    # Cash-basis dating: the income lands on the day the money arrived.
    when = invoice.payment_date or invoice.issue_date or date.today()
    description = f"Invoice {invoice.invoice_number}"

    if existing is not None:
        existing.kind = TransactionKind.INCOME
        existing.amount = received
        existing.currency = invoice.currency
        existing.expense_date = when
        existing.description = description
        existing.client_id = invoice.client_id
    else:
        db.add(
            Expense(
                user_id=invoice.user_id,
                kind=TransactionKind.INCOME,
                source=TransactionSource.INVOICE,
                invoice_id=invoice.id,
                client_id=invoice.client_id,
                description=description,
                amount=received,
                currency=invoice.currency,
                expense_date=when,
            )
        )
