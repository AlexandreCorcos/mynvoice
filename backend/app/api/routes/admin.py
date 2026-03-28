from datetime import datetime, timedelta, timezone
from decimal import Decimal

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy import extract, func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_admin
from app.db.session import get_db
from app.models.donation import Donation, DonationConfig
from app.models.expense import Expense
from app.models.invoice import Invoice, InvoiceStatus
from app.models.user import User

router = APIRouter()


class AdminMetrics(BaseModel):
    total_users: int
    active_users: int  # logged in within 30 days
    total_invoices: int
    total_invoices_paid: int
    total_revenue_processed: Decimal
    total_expenses_recorded: int
    new_users_this_month: int


class DonationConfigUpdate(BaseModel):
    monthly_target: Decimal | None = None
    currency: str | None = None
    message: str | None = None


class DonationProgress(BaseModel):
    monthly_target: Decimal
    current_month_total: Decimal
    percentage: float
    currency: str
    message: str | None


@router.get("/metrics", response_model=AdminMetrics)
async def get_admin_metrics(
    admin: User = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
):
    now = datetime.now(timezone.utc)
    thirty_days_ago = now - timedelta(days=30)

    total_users = await db.execute(select(func.count(User.id)))
    active_users = await db.execute(
        select(func.count(User.id)).where(User.last_login_at >= thirty_days_ago)
    )
    total_invoices = await db.execute(select(func.count(Invoice.id)))
    paid_invoices = await db.execute(
        select(func.count(Invoice.id)).where(Invoice.status == InvoiceStatus.PAID)
    )
    revenue = await db.execute(
        select(func.coalesce(func.sum(Invoice.total), 0)).where(
            Invoice.status == InvoiceStatus.PAID
        )
    )
    total_expenses = await db.execute(select(func.count(Expense.id)))
    new_users = await db.execute(
        select(func.count(User.id)).where(
            extract("year", User.created_at) == now.year,
            extract("month", User.created_at) == now.month,
        )
    )

    return AdminMetrics(
        total_users=total_users.scalar() or 0,
        active_users=active_users.scalar() or 0,
        total_invoices=total_invoices.scalar() or 0,
        total_invoices_paid=paid_invoices.scalar() or 0,
        total_revenue_processed=revenue.scalar() or Decimal("0.00"),
        total_expenses_recorded=total_expenses.scalar() or 0,
        new_users_this_month=new_users.scalar() or 0,
    )


@router.get("/donations", response_model=DonationProgress)
async def get_donation_progress(db: AsyncSession = Depends(get_db)):
    # Get config
    result = await db.execute(select(DonationConfig).limit(1))
    config = result.scalar_one_or_none()

    if not config:
        config = DonationConfig()
        db.add(config)
        await db.flush()

    # Current month donations
    now = datetime.now(timezone.utc)
    month_total = await db.execute(
        select(func.coalesce(func.sum(Donation.amount), 0)).where(
            extract("year", Donation.created_at) == now.year,
            extract("month", Donation.created_at) == now.month,
        )
    )
    current = month_total.scalar() or Decimal("0.00")
    target = config.monthly_target or Decimal("1000.00")

    return DonationProgress(
        monthly_target=target,
        current_month_total=current,
        percentage=float(current / target * 100) if target > 0 else 0,
        currency=config.currency,
        message=config.message,
    )


@router.put("/donations/config", response_model=DonationProgress)
async def update_donation_config(
    data: DonationConfigUpdate,
    admin: User = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(DonationConfig).limit(1))
    config = result.scalar_one_or_none()

    if not config:
        config = DonationConfig()
        db.add(config)

    for field, value in data.model_dump(exclude_unset=True).items():
        setattr(config, field, value)

    await db.flush()

    # Return progress
    now = datetime.now(timezone.utc)
    month_total = await db.execute(
        select(func.coalesce(func.sum(Donation.amount), 0)).where(
            extract("year", Donation.created_at) == now.year,
            extract("month", Donation.created_at) == now.month,
        )
    )
    current = month_total.scalar() or Decimal("0.00")
    target = config.monthly_target or Decimal("1000.00")

    return DonationProgress(
        monthly_target=target,
        current_month_total=current,
        percentage=float(current / target * 100) if target > 0 else 0,
        currency=config.currency,
        message=config.message,
    )
