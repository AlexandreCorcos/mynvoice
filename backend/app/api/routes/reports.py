from datetime import date
from decimal import Decimal
from enum import Enum
from typing import Literal

from fastapi import APIRouter, Depends, Query
from sqlalchemy import case, func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user
from app.db.session import get_db
from app.models.client import Client
from app.models.expense import Expense
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

    # Common filters for invoices in the given year owned by the user
    invoice_filters = [
        Invoice.user_id == user.id,
        Invoice.issue_date >= year_start,
        Invoice.issue_date <= year_end,
    ]

    # Common filters for expenses in the given year owned by the user
    expense_filters = [
        Expense.user_id == user.id,
        Expense.expense_date >= year_start,
        Expense.expense_date <= year_end,
    ]

    # ---- Revenue by Period ----
    fmt = _period_format(period)
    period_label = func.to_char(Invoice.issue_date, fmt).label("period")

    revenue_by_period_result = await db.execute(
        select(
            period_label,
            func.coalesce(func.sum(Invoice.total), 0).label("invoiced"),
            func.coalesce(func.sum(Invoice.amount_paid), 0).label("received"),
            func.coalesce(func.sum(Invoice.balance_due), 0).label("outstanding"),
        )
        .where(*invoice_filters)
        .group_by(period_label)
        .order_by(period_label)
    )

    revenue_by_period = [
        RevenueByPeriod(
            period=row.period,
            invoiced=row.invoiced,
            received=row.received,
            outstanding=row.outstanding,
        )
        for row in revenue_by_period_result.all()
    ]

    # ---- Revenue by Client ----
    revenue_by_client_result = await db.execute(
        select(
            Invoice.client_id,
            func.coalesce(Client.company_name, "Unknown Client").label("client_name"),
            func.coalesce(func.sum(Invoice.total), 0).label("invoiced"),
            func.coalesce(func.sum(Invoice.amount_paid), 0).label("received"),
            func.coalesce(func.sum(Invoice.balance_due), 0).label("outstanding"),
        )
        .outerjoin(Client, Invoice.client_id == Client.id)
        .where(*invoice_filters)
        .group_by(Invoice.client_id, Client.company_name)
        .order_by(func.sum(Invoice.total).desc())
    )

    revenue_by_client = [
        RevenueByClient(
            client_id=row.client_id,
            client_name=row.client_name,
            invoiced=row.invoiced,
            received=row.received,
            outstanding=row.outstanding,
        )
        for row in revenue_by_client_result.all()
        if row.client_id is not None
    ]

    # ---- Expenses by Category ----
    expenses_by_category_result = await db.execute(
        select(
            Expense.category_id,
            func.coalesce(ExpenseCategory.name, "Uncategorised").label("category_name"),
            func.coalesce(func.sum(Expense.amount), 0).label("total"),
            func.count(Expense.id).label("count"),
        )
        .outerjoin(ExpenseCategory, Expense.category_id == ExpenseCategory.id)
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
            func.coalesce(func.sum(Invoice.amount_paid), 0).label("total_received"),
            func.coalesce(func.sum(Invoice.balance_due), 0).label("total_outstanding"),
        ).where(*invoice_filters)
    )
    inv_summary = invoice_summary_result.one()

    expense_summary_result = await db.execute(
        select(
            func.coalesce(func.sum(Expense.amount), 0).label("total_expenses"),
        ).where(*expense_filters)
    )
    total_expenses = expense_summary_result.scalar() or Decimal("0.00")

    summary = ReportSummary(
        total_invoiced=inv_summary.total_invoiced,
        total_received=inv_summary.total_received,
        total_outstanding=inv_summary.total_outstanding,
        total_expenses=total_expenses,
        net_profit=inv_summary.total_received - total_expenses,
    )

    return ReportsResponse(
        revenue_by_period=revenue_by_period,
        revenue_by_client=revenue_by_client,
        expenses_by_category=expenses_by_category,
        summary=summary,
    )
