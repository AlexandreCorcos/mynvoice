"""Pure invoice money maths and validation guards.

Kept out of the route so the money surface — where a wrong number is a real
invoice sent to a real client — can be unit-tested without importing the whole
app (R3). Behaviour is identical to the inline versions it replaced; the route
imports from here. Tested in ``tests/unit/test_invoice_totals.py``.
"""
from __future__ import annotations

from decimal import Decimal

from fastapi import HTTPException


def calculate_totals(items_data, tax_rate: Decimal, discount: Decimal):
    """Subtotal, tax and grand total for a set of line items.

    ``subtotal = Σ quantity·unit_price``; ``tax = subtotal · rate / 100``;
    ``total = subtotal + tax − discount``. All Decimal, so no binary rounding.
    """
    subtotal = sum(item.quantity * item.unit_price for item in items_data)
    tax_amount = subtotal * tax_rate / Decimal("100")
    total = subtotal + tax_amount - discount
    return subtotal, tax_amount, total


def guard_dates(issue_date, due_date) -> None:
    """An invoice cannot fall due before it is issued."""
    if issue_date and due_date and due_date < issue_date:
        raise HTTPException(
            status_code=422, detail="Due date cannot be before the issue date."
        )


def guard_total(total: Decimal) -> None:
    """A discount larger than the taxed subtotal would drive the total below
    zero — a negative invoice is not a document this app issues."""
    if total < 0:
        raise HTTPException(
            status_code=422,
            detail="Invoice total cannot be negative — reduce the discount.",
        )
