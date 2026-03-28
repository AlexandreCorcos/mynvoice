from decimal import Decimal

from fastapi import APIRouter, Depends
from sqlalchemy import case, extract, func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user
from app.db.session import get_db
from app.models.client import Client
from app.models.expense import Expense
from app.models.invoice import Invoice, InvoiceStatus
from app.models.user import User
from app.schemas.dashboard import DashboardResponse, DashboardStats, MonthlyTrend

router = APIRouter()


@router.get("/", response_model=DashboardResponse)
async def get_dashboard(
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    # Invoice stats
    invoice_result = await db.execute(
        select(
            func.count(Invoice.id).label("total"),
            func.coalesce(func.sum(Invoice.total), 0).label("revenue"),
            func.count(
                case((Invoice.status == InvoiceStatus.PAID, Invoice.id))
            ).label("paid_count"),
            func.coalesce(
                func.sum(
                    case((Invoice.status == InvoiceStatus.PAID, Invoice.total))
                ),
                0,
            ).label("paid_amount"),
            func.count(
                case(
                    (
                        Invoice.status.in_(
                            [InvoiceStatus.SENT, InvoiceStatus.DRAFT]
                        ),
                        Invoice.id,
                    )
                )
            ).label("unpaid_count"),
            func.coalesce(
                func.sum(
                    case(
                        (
                            Invoice.status.in_(
                                [InvoiceStatus.SENT, InvoiceStatus.DRAFT]
                            ),
                            Invoice.total,
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
            Expense.user_id == user.id
        )
    )
    total_expenses = expense_result.scalar() or Decimal("0.00")

    stats = DashboardStats(
        total_revenue=inv.revenue,
        total_paid=inv.paid_amount,
        total_unpaid=inv.unpaid_amount,
        total_overdue=inv.overdue_amount,
        invoices_count=inv.total,
        invoices_paid_count=inv.paid_count,
        invoices_unpaid_count=inv.unpaid_count,
        invoices_overdue_count=inv.overdue_count,
        clients_count=clients_count,
        total_expenses=total_expenses,
    )

    # Monthly trends (last 12 months)
    monthly_revenue = await db.execute(
        select(
            func.to_char(Invoice.issue_date, "YYYY-MM").label("month"),
            func.coalesce(func.sum(Invoice.total), 0).label("revenue"),
        )
        .where(Invoice.user_id == user.id, Invoice.status == InvoiceStatus.PAID)
        .group_by(func.to_char(Invoice.issue_date, "YYYY-MM"))
        .order_by(func.to_char(Invoice.issue_date, "YYYY-MM").desc())
        .limit(12)
    )
    revenue_rows = {r.month: r.revenue for r in monthly_revenue.all()}

    monthly_expenses = await db.execute(
        select(
            func.to_char(Expense.expense_date, "YYYY-MM").label("month"),
            func.coalesce(func.sum(Expense.amount), 0).label("expenses"),
        )
        .where(Expense.user_id == user.id)
        .group_by(func.to_char(Expense.expense_date, "YYYY-MM"))
        .order_by(func.to_char(Expense.expense_date, "YYYY-MM").desc())
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

    return DashboardResponse(stats=stats, monthly_trends=trends)
