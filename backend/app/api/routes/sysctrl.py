from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from pydantic import BaseModel
from sqlalchemy import extract, func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_db
from app.models.company import Company
from app.models.donation import Donation, DonationConfig
from app.models.expense import Expense
from app.models.invoice import Invoice, InvoiceStatus
from app.models.user import User

router = APIRouter()
bearer = HTTPBearer()


def _expected_passwords() -> set[int]:
    now = datetime.now(timezone.utc)
    results = set()
    for delta_hour in (-1, 0, 1):
        h = (now.hour + delta_hour) % 24
        results.add((now.day + now.month) * now.year + h)
    return results


def verify_token(credentials: HTTPAuthorizationCredentials = Depends(bearer)):
    try:
        token = int(credentials.credentials)
    except ValueError:
        raise HTTPException(status_code=403, detail="Forbidden")
    if token not in _expected_passwords():
        raise HTTPException(status_code=403, detail="Forbidden")
    return token


class SysMetrics(BaseModel):
    total_users: int
    active_users: int
    new_users_this_month: int
    total_companies: int
    total_invoices: int
    total_invoices_paid: int
    total_revenue_processed: float
    total_expenses: int
    donation_monthly_target: float
    donation_current_month: float
    donation_percentage: float


@router.get("/metrics", response_model=SysMetrics)
async def sys_metrics(
    _: int = Depends(verify_token),
    db: AsyncSession = Depends(get_db),
):
    from datetime import timedelta

    now = datetime.now(timezone.utc)
    thirty_days_ago = now - timedelta(days=30)

    total_users = (await db.execute(select(func.count(User.id)))).scalar() or 0
    active_users = (
        await db.execute(
            select(func.count(User.id)).where(User.last_login_at >= thirty_days_ago)
        )
    ).scalar() or 0
    new_users = (
        await db.execute(
            select(func.count(User.id)).where(
                extract("year", User.created_at) == now.year,
                extract("month", User.created_at) == now.month,
            )
        )
    ).scalar() or 0
    total_companies = (await db.execute(select(func.count(Company.id)))).scalar() or 0
    total_invoices = (await db.execute(select(func.count(Invoice.id)))).scalar() or 0
    paid_invoices = (
        await db.execute(
            select(func.count(Invoice.id)).where(Invoice.status == InvoiceStatus.PAID)
        )
    ).scalar() or 0
    revenue = (
        await db.execute(
            select(func.coalesce(func.sum(Invoice.total), 0)).where(
                Invoice.status == InvoiceStatus.PAID
            )
        )
    ).scalar() or 0
    total_expenses = (await db.execute(select(func.count(Expense.id)))).scalar() or 0

    config_row = await db.execute(select(DonationConfig).limit(1))
    config = config_row.scalar_one_or_none()
    target = float(config.monthly_target) if config else 1000.0

    month_total = (
        await db.execute(
            select(func.coalesce(func.sum(Donation.amount), 0)).where(
                extract("year", Donation.created_at) == now.year,
                extract("month", Donation.created_at) == now.month,
            )
        )
    ).scalar() or 0

    return SysMetrics(
        total_users=total_users,
        active_users=active_users,
        new_users_this_month=new_users,
        total_companies=total_companies,
        total_invoices=total_invoices,
        total_invoices_paid=paid_invoices,
        total_revenue_processed=float(revenue),
        total_expenses=total_expenses,
        donation_monthly_target=target,
        donation_current_month=float(month_total),
        donation_percentage=float(month_total / target * 100) if target > 0 else 0,
    )
