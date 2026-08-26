from datetime import date, timedelta
from decimal import Decimal

from fastapi import APIRouter, Depends
from sqlalchemy import and_, case, func, select, text
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user
from app.db.session import get_db
from app.models.client import Client
from app.models.expense import Expense, TransactionKind
from app.models.invoice import Invoice, InvoiceStatus
from app.models.user import User
from app.schemas.dashboard import (
    AgingBucket,
    DashboardResponse,
    DashboardStats,
    MonthlyTrend,
    PeriodSummary,
)

router = APIRouter()


@router.get("/", response_model=DashboardResponse)
async def get_dashboard(
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    today = date.today()

    # Invoice stats
    invoice_result = await db.execute(
        select(
            func.count(Invoice.id).label("total"),
            func.count(
                case((Invoice.status == InvoiceStatus.PAID, Invoice.id))
            ).label("paid_count"),
            # Outstanding means money you have asked for and not received:
            # SENT + OVERDUE. Drafts are excluded because the client has
            # never seen them, and overdue invoices are the most outstanding
            # money there is. This now matches the ageing buckets below and
            # the per-client receivables.
            func.count(
                case(
                    (
                        Invoice.status.in_(
                            [InvoiceStatus.SENT, InvoiceStatus.OVERDUE]
                        ),
                        Invoice.id,
                    )
                )
            ).label("unpaid_count"),
            # balance_due, not total: a part-paid invoice is only outstanding
            # for what is left on it.
            func.coalesce(
                func.sum(
                    case(
                        (
                            Invoice.status.in_(
                                [InvoiceStatus.SENT, InvoiceStatus.OVERDUE]
                            ),
                            Invoice.balance_due,
                        )
                    )
                ),
                0,
            ).label("unpaid_amount"),
            func.count(
                case((Invoice.status == InvoiceStatus.OVERDUE, Invoice.id))
            ).label("overdue_count"),
            func.coalesce(
                func.sum(
                    case((Invoice.status == InvoiceStatus.OVERDUE, Invoice.total))
                ),
                0,
            ).label("overdue_amount"),
        ).where(Invoice.user_id == user.id)
    )
    inv = invoice_result.one()

    # Client count
    client_result = await db.execute(
        select(func.count(Client.id)).where(Client.user_id == user.id)
    )
    clients_count = client_result.scalar() or 0

    # Total expenses
    expense_result = await db.execute(
        select(func.coalesce(func.sum(Expense.amount), 0)).where(
            Expense.user_id == user.id,
            Expense.kind == TransactionKind.EXPENSE,
        )
    )
    total_expenses = expense_result.scalar() or Decimal("0.00")

    # Revenue is cash-basis: money actually received. That lives in the ledger
    # as income rows — manual income plus a row projected from each invoice's
    # amount_paid — so a single sum captures both without touching invoices.
    income_result = await db.execute(
        select(func.coalesce(func.sum(Expense.amount), 0)).where(
            Expense.user_id == user.id,
            Expense.kind == TransactionKind.INCOME,
        )
    )
    total_income = income_result.scalar() or Decimal("0.00")

    stats = DashboardStats(
        total_revenue=total_income,
        total_paid=total_income,
        total_unpaid=inv.unpaid_amount,
        total_overdue=inv.overdue_amount,
        invoices_count=inv.total,
        invoices_paid_count=inv.paid_count,
        invoices_unpaid_count=inv.unpaid_count,
        invoices_overdue_count=inv.overdue_count,
        clients_count=clients_count,
        total_expenses=total_expenses,
    )

    # --- Receivables Aging ---
    unpaid_statuses = [InvoiceStatus.SENT, InvoiceStatus.OVERDUE]
    aging_buckets = []

    for label, min_days, max_days in [
        ("Current", None, 0),
        ("1-15 Days", 1, 15),
        ("16-30 Days", 16, 30),
        ("31-45 Days", 31, 45),
        ("Above 45 Days", 46, None),
    ]:
        conditions = [
            Invoice.user_id == user.id,
            Invoice.status.in_(unpaid_statuses),
        ]
        if min_days is not None and max_days is not None:
            conditions.append(today - Invoice.due_date >= min_days)
            conditions.append(today - Invoice.due_date <= max_days)
        elif min_days is not None:
            conditions.append(today - Invoice.due_date >= min_days)
        else:
            # Current = not yet due
            conditions.append(Invoice.due_date >= today)

        result = await db.execute(
            select(
                func.count(Invoice.id),
                func.coalesce(func.sum(Invoice.balance_due), 0),
            ).where(and_(*conditions))
        )
        row = result.one()
        aging_buckets.append(
            AgingBucket(label=label, amount=row[1], count=row[0])
        )

    # --- Period Summary (Sales / Receipts / Due) ---
    week_start = today - timedelta(days=today.weekday())
    month_start = today.replace(day=1)
    quarter_month = ((today.month - 1) // 3) * 3 + 1
    quarter_start = today.replace(month=quarter_month, day=1)
    year_start = today.replace(month=1, day=1)

    period_summary = []
    for label, start_date in [
        ("Today", today),
        ("This Week", week_start),
        ("This Month", month_start),
        ("This Quarter", quarter_start),
        ("This Year", year_start),
    ]:
        # Sales (billed) and due come from invoices by issue date.
        result = await db.execute(
            select(
                func.coalesce(
                    func.sum(Invoice.total), 0
                ).label("sales"),
                func.coalesce(
                    func.sum(
                        case(
                            (
                                Invoice.status.in_(unpaid_statuses),
                                Invoice.total,
                            )
                        )
                    ),
                    0,
                ).label("due"),
            ).where(
                Invoice.user_id == user.id,
                Invoice.issue_date >= start_date,
            )
        )
        row = result.one()
        # Receipts (cash in) come from the ledger's income rows by their date.
        receipts_result = await db.execute(
            select(func.coalesce(func.sum(Expense.amount), 0)).where(
                Expense.user_id == user.id,
                Expense.kind == TransactionKind.INCOME,
                Expense.expense_date >= start_date,
            )
        )
        receipts = receipts_result.scalar() or Decimal("0.00")
        period_summary.append(
            PeriodSummary(
                label=label,
                sales=row.sales,
                receipts=receipts,
                due=row.due,
            )
        )

    # --- Monthly Trends ---
    # Revenue trend is cash-basis too: income received per month.
    monthly_revenue = await db.execute(
        select(
            func.to_char(Expense.expense_date, "YYYY-MM").label("month"),
            func.coalesce(func.sum(Expense.amount), 0).label("revenue"),
        )
        .where(
            Expense.user_id == user.id,
            Expense.kind == TransactionKind.INCOME,
        )
        .group_by(text("1"))
        .order_by(text("1 DESC"))
        .limit(12)
    )
    revenue_rows = {r.month: r.revenue for r in monthly_revenue.all()}

    monthly_expenses = await db.execute(
        select(
            func.to_char(Expense.expense_date, "YYYY-MM").label("month"),
            func.coalesce(func.sum(Expense.amount), 0).label("expenses"),
        )
        .where(
            Expense.user_id == user.id,
            Expense.kind == TransactionKind.EXPENSE,
        )
        .group_by(text("1"))
        .order_by(text("1 DESC"))
        .limit(12)
    )
    expense_rows = {r.month: r.expenses for r in monthly_expenses.all()}

    all_months = sorted(set(revenue_rows.keys()) | set(expense_rows.keys()))
    trends = [
        MonthlyTrend(
            month=m,
            revenue=revenue_rows.get(m, Decimal("0.00")),
            expenses=expense_rows.get(m, Decimal("0.00")),
        )
        for m in all_months[-12:]
    ]

    return DashboardResponse(
        stats=stats,
        monthly_trends=trends,
        aging=aging_buckets,
        period_summary=period_summary,
        currency=user.currency,
    )
