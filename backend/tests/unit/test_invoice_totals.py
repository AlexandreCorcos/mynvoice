"""The invoice money surface (R3, R5). Pure Decimal maths + the two guards.

A wrong number here is a real invoice sent to a real client, so this is the most
important unit test in the suite. Imports only ``app.services.invoice_totals``
(decimal + fastapi), so it stays DB-free and fast.
"""
from decimal import Decimal
from types import SimpleNamespace

import pytest
from fastapi import HTTPException

from app.services.invoice_totals import calculate_totals, guard_dates, guard_total


def _item(qty, price):
    return SimpleNamespace(quantity=Decimal(qty), unit_price=Decimal(price))


class TestCalculateTotals:
    def test_single_item_no_tax_no_discount(self):
        sub, tax, total = calculate_totals([_item("2", "100.00")], Decimal("0"), Decimal("0"))
        assert (sub, tax, total) == (Decimal("200.00"), Decimal("0"), Decimal("200.00"))

    def test_tax_and_discount(self):
        # 200 subtotal, 20% tax = 40, minus 10 discount = 230.
        sub, tax, total = calculate_totals(
            [_item("2", "100.00")], Decimal("20"), Decimal("10.00")
        )
        assert sub == Decimal("200.00")
        assert tax == Decimal("40.0000")
        assert total == Decimal("230.0000")

    def test_multiple_items_sum(self):
        sub, _, total = calculate_totals(
            [_item("3", "10.00"), _item("1", "5.50")], Decimal("0"), Decimal("0")
        )
        assert sub == Decimal("35.50")
        assert total == Decimal("35.50")

    def test_stays_exact_decimal_no_binary_rounding(self):
        # 0.1 + 0.2 in float is 0.30000000000000004; Decimal keeps it exact.
        sub, _, total = calculate_totals(
            [_item("1", "0.10"), _item("1", "0.20")], Decimal("0"), Decimal("0")
        )
        assert total == Decimal("0.30")
        assert isinstance(total, Decimal)

    def test_empty_items_is_zero(self):
        sub, tax, total = calculate_totals([], Decimal("20"), Decimal("0"))
        assert sub == 0 and total == 0


class TestGuardTotal:
    def test_negative_total_rejected_422(self):
        with pytest.raises(HTTPException) as exc:
            guard_total(Decimal("-0.01"))
        assert exc.value.status_code == 422

    def test_zero_total_allowed(self):
        guard_total(Decimal("0"))  # no raise


class TestGuardDates:
    def test_due_before_issue_rejected_422(self):
        from datetime import date

        with pytest.raises(HTTPException) as exc:
            guard_dates(date(2026, 1, 10), date(2026, 1, 1))
        assert exc.value.status_code == 422

    def test_due_after_issue_ok(self):
        from datetime import date

        guard_dates(date(2026, 1, 1), date(2026, 1, 10))  # no raise

    def test_missing_dates_ok(self):
        guard_dates(None, None)
        guard_dates(None, __import__("datetime").date(2026, 1, 1))
