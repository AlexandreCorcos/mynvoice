from datetime import datetime, timezone
from decimal import Decimal

from fastapi import APIRouter, Depends
from pydantic import BaseModel
from sqlalchemy import extract, func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_admin
from app.db.session import get_db
from app.schemas.types import Money
from app.models.donation import Donation, DonationConfig
from app.models.user import User

# This module used to also expose GET /metrics, a second admin-metrics surface
# alongside /sys/metrics that computed "total_revenue_processed" differently
# (sum of paid-invoice totals here, sum of amount_paid there) under the same
# name. There is one admin panel — /sys/ctrl — and it reads /sys/*, so the
# duplicate was removed to keep a single source of truth. What remains is the
# donation progress, which feeds the public support bar and is intentionally
# reachable without a session.
router = APIRouter()


class DonationConfigUpdate(BaseModel):
    monthly_target: Decimal | None = None
    currency: str | None = None
    message: str | None = None


class DonationProgress(BaseModel):
    monthly_target: Money
    current_month_total: Money
    percentage: float
    currency: str
    message: str | None


async def _donation_progress(db: AsyncSession) -> DonationProgress:
    result = await db.execute(select(DonationConfig).limit(1))
    config = result.scalar_one_or_none()
    if not config:
        config = DonationConfig()
        db.add(config)
        await db.flush()

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


@router.get("/donations", response_model=DonationProgress)
async def get_donation_progress(db: AsyncSession = Depends(get_db)):
    return await _donation_progress(db)


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
    return await _donation_progress(db)
