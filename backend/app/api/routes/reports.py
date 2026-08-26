from datetime import date
from decimal import Decimal
from enum import Enum
from typing import Literal

from fastapi import APIRouter, Depends, Query
from sqlalchemy import and_, case, func, select, text
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user
from app.db.session import get_db
from app.models.client import Client
from app.models.expense import Expense, TransactionKind
from app.models.expense_category import ExpenseCategory
from app.models.invoice import Invoice, InvoiceStatus
from app.models.user import User
from app.schemas.report import (
    ExpensesByCategory,
    ReportSummary,
    ReportsResponse,
    RevenueByClient,
    RevenueByPeriod,
)

router = APIRouter()


def _period_format(period: str) -> str:
    """Return a PostgreSQL to_char format string for the given period."""
    if period == "month":
        return "YYYY-MM"
    elif period == "quarter":
        return '"Q"Q YYYY'
    else:  # year
        return "YYYY"


@router.get("/", response_model=ReportsResponse)
async def get_reports(
    period: Literal["month", "quarter", "year"] = Query(default="month"),
    year: int = Query(default_factory=lambda: date.today().year),
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> ReportsResponse:
    year_start = date(year, 1, 1)
    year_end = date(year, 12, 31)

    # Common filters for invoices in the given year owned by the user.
    # Drafts and cancelled invoices are excluded throughout: you have not
    # billed anything until it is sent, and a voided invoice is money you are
    # no longer asking for, so counting either would inflate "invoiced",
    # inflate "outstanding" and understate the collection rate. Same rule as
    # the dashboard.
    invoice_filters = [
        Invoice.user_id == user.id,
        Invoice.issue_date >= year_start,
        Invoice.issue_date <= year_end,
        Invoice.status.not_in([InvoiceStatus.DRAFT, InvoiceStatus.CANCELLED]),
    ]

    # Common filters for expenses in the given year owned by the user.
    # kind=expense keeps income rows (which share the ledger table) out of
    # every expense figure.
    expense_filters = [
        Expense.user_id == user.id,
        Expense.kind == TransactionKind.EXPENSE,
        Expense.expense_date >= year_start,
        Expense.expense_date <= year_end,
    ]

    # Received money is cash-basis: the ledger's income rows (manual income
    # plus a row projected from each invoice's amount_paid), dated when the
    # money arrived. "Invoiced" and "outstanding" still come from invoices.
    income_filters = [
        Expense.user_id == user.id,
        Expense.kind == TransactionKind.INCOME,
        Expense.expense_date >= year_start,
        Expense.expense_date <= year_end,
    ]

    # ---- Revenue by Period ----
    fmt = _period_format(period)

    invoiced_by_period = (
        await db.execute(
            select(
                func.to_char(Invoice.issue_date, fmt).label("period"),
                func.coalesce(func.sum(Invoice.total), 0).label("invoiced"),
                func.coalesce(func.sum(Invoice.balance_due), 0).label("outstanding"),
            )
            .where(*invoice_filters)
            .group_by(text("1"))
        )
    ).all()

    received_by_period = (
        await db.execute(
            select(
                func.to_char(Expense.expense_date, fmt).label("period"),
                func.coalesce(func.sum(Expense.amount), 0).label("received"),
            )
            .where(*income_filters)
            .group_by(text("1"))
        )
    ).all()

    periods: dict[str, dict] = {}

    def _period(key: str) -> dict:
        return periods.setdefault(
            key,
            {
                "invoiced": Decimal("0.00"),
                "received": Decimal("0.00"),
                "outstanding": Decimal("0.00"),
            },
        )

    for row in invoiced_by_period:
        p = _period(row.period)
        p["invoiced"] = row.invoiced
        p["outstanding"] = row.outstanding
    for row in received_by_period:
        _period(row.period)["received"] = row.received

    revenue_by_period = [
        RevenueByPeriod(
            period=key,
            invoiced=v["invoiced"],
            received=v["received"],
            outstanding=v["outstanding"],
        )
        for key, v in sorted(periods.items())
    ]

    # ---- Revenue by Client ----
    invoiced_by_client = (
        await db.execute(
            select(
                Invoice.client_id,
                func.coalesce(Client.company_name, "Unknown Client").label(
                    "client_name"
                ),
                func.coalesce(func.sum(Invoice.total), 0).label("invoiced"),
                func.coalesce(func.sum(Invoice.balance_due), 0).label("outstanding"),
            )
            .outerjoin(
                Client,
                and_(Invoice.client_id == Client.id, Client.user_id == user.id),
            )
            .where(*invoice_filters)
            .group_by(Invoice.client_id, Client.company_name)
        )
    ).all()

    received_by_client = {
        row.client_id: row.received
        for row in (
            await db.execute(
                select(
                    Expense.client_id,
                    func.coalesce(func.sum(Expense.amount), 0).label("received"),
                )
                .where(*income_filters)
                .group_by(Expense.client_id)
            )
        ).all()
    }

    revenue_by_client = sorted(
        [
            RevenueByClient(
                client_id=row.client_id,
                client_name=row.client_name,
                invoiced=row.invoiced,
                received=received_by_client.get(row.client_id, Decimal("0.00")),
                outstanding=row.outstanding,
            )
            for row in invoiced_by_client
            if row.client_id is not None
        ],
        key=lambda r: r.invoiced,
        reverse=True,
    )

    # ---- Expenses by Category ----
    expenses_by_category_result = await db.execute(
        select(
            Expense.category_id,
            func.coalesce(ExpenseCategory.name, "Uncategorised").label("category_name"),
            func.coalesce(func.sum(Expense.amount), 0).label("total"),
            func.count(Expense.id).label("count"),
        )
        .outerjoin(
            ExpenseCategory,
            and_(
                Expense.category_id == ExpenseCategory.id,
                ExpenseCategory.user_id == user.id,
            ),
        )
        .where(*expense_filters)
        .group_by(Expense.category_id, ExpenseCategory.name)
        .order_by(func.sum(Expense.amount).desc())
    )

    expenses_by_category = [
        ExpensesByCategory(
            category_id=row.category_id,
            category_name=row.category_name,
            total=row.total,
            count=row.count,
        )
        for row in expenses_by_category_result.all()
    ]

    # ---- Summary ----
    invoice_summary_result = await db.execute(
        select(
            func.coalesce(func.sum(Invoice.total), 0).label("total_invoiced"),
            func.coalesce(func.sum(Invoice.balance_due), 0).label("total_outstanding"),
        ).where(*invoice_filters)
    )
    inv_summary = invoice_summary_result.one()

    total_received = (
        await db.execute(
            select(func.coalesce(func.sum(Expense.amount), 0)).where(*income_filters)
        )
    ).scalar() or Decimal("0.00")

    expense_summary_result = await db.execute(
        select(
            func.coalesce(func.sum(Expense.amount), 0).label("total_expenses"),
        ).where(*expense_filters)
    )
    total_expenses = expense_summary_result.scalar() or Decimal("0.00")

    summary = ReportSummary(
        total_invoiced=inv_summary.total_invoiced,
        total_received=total_received,
        total_outstanding=inv_summary.total_outstanding,
        total_expenses=total_expenses,
        net_profit=total_received - total_expenses,
    )

    return ReportsResponse(
        revenue_by_period=revenue_by_period,
        revenue_by_client=revenue_by_client,
        expenses_by_category=expenses_by_category,
        summary=summary,
    )
