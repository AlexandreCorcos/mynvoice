import uuid
from datetime import datetime, timezone
from decimal import Decimal

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user
from app.db.session import get_db
from app.models.accounting_period import AccountingPeriod
from app.models.expense import Expense, TransactionKind
from app.models.user import User
from app.schemas.accounting_period import (
    AccountingPeriodCreate,
    AccountingPeriodResponse,
    AccountingPeriodUpdate,
)

router = APIRouter()


async def _live_totals(
    db: AsyncSession, user: User, period: AccountingPeriod
) -> dict:
    """The period's totals from the ledger as it stands right now — the figures
    that are compared against the snapshot to detect drift after a close."""
    result = await db.execute(
        select(
            func.coalesce(
                func.sum(Expense.amount).filter(
                    Expense.kind == TransactionKind.INCOME
                ),
                0,
            ).label("income"),
            func.coalesce(
                func.sum(Expense.amount).filter(
                    Expense.kind == TransactionKind.EXPENSE
                ),
                0,
            ).label("expense"),
            func.count(Expense.id).label("entry_count"),
            func.count(Expense.id)
            .filter(Expense.reconciled_at.isnot(None))
            .label("reconciled_count"),
        ).where(
            Expense.user_id == user.id,
            Expense.expense_date >= period.start_date,
            Expense.expense_date <= period.end_date,
        )
    )
    row = result.one()
    income = row.income or Decimal("0.00")
    expense = row.expense or Decimal("0.00")
    return {
        "income": income,
        "expense": expense,
        "net": income - expense,
        "entry_count": row.entry_count or 0,
        "reconciled_count": row.reconciled_count or 0,
    }


async def _to_response(
    db: AsyncSession, user: User, period: AccountingPeriod
) -> AccountingPeriodResponse:
    live = await _live_totals(db, user, period)
    return AccountingPeriodResponse(
        id=period.id,
        name=period.name,
        start_date=period.start_date,
        end_date=period.end_date,
        closed_at=period.closed_at,
        is_closed=period.closed_at is not None,
        snapshot_income=period.snapshot_income,
        snapshot_expense=period.snapshot_expense,
        snapshot_net=period.snapshot_net,
        snapshot_entry_count=period.snapshot_entry_count,
        snapshot_reconciled_count=period.snapshot_reconciled_count,
        created_at=period.created_at,
        **live,
    )


async def _get_owned(
    period_id: uuid.UUID, user: User, db: AsyncSession
) -> AccountingPeriod:
    result = await db.execute(
        select(AccountingPeriod).where(
            AccountingPeriod.id == period_id,
            AccountingPeriod.user_id == user.id,
        )
    )
    period = result.scalar_one_or_none()
    if not period:
        raise HTTPException(status_code=404, detail="Period not found")
    return period


async def _reject_overlap(
    db: AsyncSession,
    user: User,
    start,
    end,
    exclude_id: uuid.UUID | None = None,
) -> None:
    query = select(AccountingPeriod).where(
        AccountingPeriod.user_id == user.id,
        AccountingPeriod.start_date <= end,
        AccountingPeriod.end_date >= start,
    )
    if exclude_id:
        query = query.where(AccountingPeriod.id != exclude_id)
    clash = (await db.execute(query)).scalars().first()
    if clash:
        raise HTTPException(
            status_code=400,
            detail=f"That range overlaps the period \"{clash.name}\".",
        )


@router.get("/", response_model=list[AccountingPeriodResponse])
async def list_periods(
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(AccountingPeriod)
        .where(AccountingPeriod.user_id == user.id)
        .order_by(AccountingPeriod.start_date.desc())
    )
    periods = result.scalars().all()
    return [await _to_response(db, user, p) for p in periods]


@router.post("/", response_model=AccountingPeriodResponse, status_code=201)
async def create_period(
    data: AccountingPeriodCreate,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    await _reject_overlap(db, user, data.start_date, data.end_date)
    period = AccountingPeriod(
        user_id=user.id,
        name=data.name,
        start_date=data.start_date,
        end_date=data.end_date,
    )
    db.add(period)
    await db.flush()
    return await _to_response(db, user, period)


@router.get("/{period_id}", response_model=AccountingPeriodResponse)
async def get_period(
    period_id: uuid.UUID,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    period = await _get_owned(period_id, user, db)
    return await _to_response(db, user, period)


@router.patch("/{period_id}", response_model=AccountingPeriodResponse)
async def update_period(
    period_id: uuid.UUID,
    data: AccountingPeriodUpdate,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    period = await _get_owned(period_id, user, db)
    if period.closed_at is not None:
        raise HTTPException(
            status_code=400, detail="Reopen the period before editing it."
        )
    updates = data.model_dump(exclude_unset=True)
    start = updates.get("start_date", period.start_date)
    end = updates.get("end_date", period.end_date)
    if end < start:
        raise HTTPException(
            status_code=400, detail="End date must be on or after the start date."
        )
    await _reject_overlap(db, user, start, end, exclude_id=period.id)
    for field, value in updates.items():
        setattr(period, field, value)
    await db.flush()
    return await _to_response(db, user, period)


@router.delete("/{period_id}", status_code=204)
async def delete_period(
    period_id: uuid.UUID,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    period = await _get_owned(period_id, user, db)
    if period.closed_at is not None:
        raise HTTPException(
            status_code=400, detail="Reopen the period before deleting it."
        )
    await db.delete(period)


@router.post("/{period_id}/close", response_model=AccountingPeriodResponse)
async def close_period(
    period_id: uuid.UUID,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    period = await _get_owned(period_id, user, db)
    live = await _live_totals(db, user, period)
    period.closed_at = datetime.now(timezone.utc)
    period.snapshot_income = live["income"]
    period.snapshot_expense = live["expense"]
    period.snapshot_net = live["net"]
    period.snapshot_entry_count = live["entry_count"]
    period.snapshot_reconciled_count = live["reconciled_count"]
    await db.flush()
    return await _to_response(db, user, period)


@router.post("/{period_id}/reopen", response_model=AccountingPeriodResponse)
async def reopen_period(
    period_id: uuid.UUID,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    period = await _get_owned(period_id, user, db)
    period.closed_at = None
    period.snapshot_income = None
    period.snapshot_expense = None
    period.snapshot_net = None
    period.snapshot_entry_count = None
    period.snapshot_reconciled_count = None
    await db.flush()
    return await _to_response(db, user, period)
