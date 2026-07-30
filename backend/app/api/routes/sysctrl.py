"""Admin control panel.

Authentication note
-------------------
This module used to carry its own `verify_token`, which accepted a short
integer derived from the current UTC date and hour. That bypassed the
application's login entirely: no account was needed, the keyspace was
trivially small, and it granted the right to list every user, flip anyone's
admin flag and trigger password resets. Hiding the derivation would not have
helped — obscurity is not a control.

It now uses the same bearer token as the rest of the API, plus `is_admin`.
Admin is granted out of band with `python -m app.cli grant-admin <email>` on
the server, so nothing in this repository confers access.

Every state-changing action writes an `AdminAuditLog` row.
"""

import secrets
import uuid
from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_admin
from app.db.session import get_db
from app.models.audit import AdminAuditLog
from app.models.client import Client
from app.models.company import Company
from app.models.donation import Donation, DonationConfig
from app.models.expense import Expense
from app.models.invoice import Invoice, InvoiceStatus
from app.models.user import User
from app.schemas.types import Money
from app.services.email import send_password_reset_email

router = APIRouter()

# Someone with a request in the last five minutes counts as here now.
ONLINE_WINDOW = timedelta(minutes=5)
ACTIVE_WINDOW = timedelta(days=30)


async def _record(
    db: AsyncSession,
    actor: User,
    action: str,
    target: User | None = None,
    detail: str | None = None,
) -> None:
    db.add(
        AdminAuditLog(
            actor_id=actor.id,
            actor_email=actor.email,
            action=action,
            target_user_id=target.id if target else None,
            target_email=target.email if target else None,
            detail=detail,
        )
    )


async def _get_target(db: AsyncSession, user_id: str) -> User:
    try:
        parsed = uuid.UUID(user_id)
    except ValueError:
        raise HTTPException(status_code=404, detail="User not found")
    result = await db.execute(select(User).where(User.id == parsed))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return user


# ---------------------------------------------------------------- metrics


class SysMetrics(BaseModel):
    total_users: int
    active_users: int
    online_now: int
    new_users_this_month: int
    total_companies: int
    total_invoices: int
    total_invoices_paid: int
    total_revenue_processed: Money
    total_expenses: int
    donation_monthly_target: Money
    donation_current_month: Money
    donation_percentage: float


@router.get("/metrics", response_model=SysMetrics)
async def sys_metrics(
    _: User = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
):
    now = datetime.now(timezone.utc)
    month_start = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)

    async def scalar(stmt):
        return (await db.execute(stmt)).scalar() or 0

    total_users = await scalar(select(func.count(User.id)))
    active_users = await scalar(
        select(func.count(User.id)).where(User.last_login_at >= now - ACTIVE_WINDOW)
    )
    online_now = await scalar(
        select(func.count(User.id)).where(User.last_seen_at >= now - ONLINE_WINDOW)
    )
    new_users = await scalar(
        select(func.count(User.id)).where(User.created_at >= month_start)
    )
    total_companies = await scalar(select(func.count(Company.id)))
    total_invoices = await scalar(select(func.count(Invoice.id)))
    total_paid = await scalar(
        select(func.count(Invoice.id)).where(Invoice.status == InvoiceStatus.PAID)
    )
    revenue = await scalar(select(func.coalesce(func.sum(Invoice.amount_paid), 0)))
    total_expenses = await scalar(select(func.count(Expense.id)))

    config = (await db.execute(select(DonationConfig))).scalars().first()
    target = config.monthly_target if config else 0
    month_total = await scalar(
        select(func.coalesce(func.sum(Donation.amount), 0)).where(
            Donation.created_at >= month_start
        )
    )

    return SysMetrics(
        total_users=total_users,
        active_users=active_users,
        online_now=online_now,
        new_users_this_month=new_users,
        total_companies=total_companies,
        total_invoices=total_invoices,
        total_invoices_paid=total_paid,
        total_revenue_processed=revenue,
        total_expenses=total_expenses,
        donation_monthly_target=target,
        donation_current_month=month_total,
        donation_percentage=float(month_total / target * 100) if target else 0.0,
    )


# ------------------------------------------------------------------ users


class SysUser(BaseModel):
    id: str
    email: str
    first_name: str
    last_name: str
    company_name: str | None
    is_verified: bool
    is_active: bool
    is_admin: bool
    auth_provider: str
    created_at: str
    last_login_at: str | None
    last_seen_at: str | None
    is_online: bool
    invoice_count: int
    client_count: int
    expense_count: int
    revenue: Money


@router.get("/users", response_model=list[SysUser])
async def sys_list_users(
    _: User = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
):
    """Every user with what they have actually done.

    The per-user counts come from grouped queries rather than a subquery per
    row, so the cost stays flat as the table grows.
    """
    now = datetime.now(timezone.utc)
    online_cutoff = now - ONLINE_WINDOW

    users = (
        (await db.execute(select(User).order_by(User.created_at.desc())))
        .scalars()
        .all()
    )

    async def counts_by_user(model):
        rows = await db.execute(
            select(model.user_id, func.count(model.id)).group_by(model.user_id)
        )
        return {row[0]: row[1] for row in rows.all()}

    invoice_counts = await counts_by_user(Invoice)
    client_counts = await counts_by_user(Client)
    expense_counts = await counts_by_user(Expense)

    revenue_rows = await db.execute(
        select(
            Invoice.user_id, func.coalesce(func.sum(Invoice.amount_paid), 0)
        ).group_by(Invoice.user_id)
    )
    revenues = {row[0]: row[1] for row in revenue_rows.all()}

    company_rows = await db.execute(select(Company.user_id, Company.name))
    companies = {row[0]: row[1] for row in company_rows.all()}

    return [
        SysUser(
            id=str(u.id),
            email=u.email,
            first_name=u.first_name,
            last_name=u.last_name,
            company_name=companies.get(u.id),
            is_verified=u.is_verified,
            is_active=u.is_active,
            is_admin=u.is_admin,
            auth_provider=u.auth_provider,
            created_at=u.created_at.isoformat(),
            last_login_at=u.last_login_at.isoformat() if u.last_login_at else None,
            last_seen_at=u.last_seen_at.isoformat() if u.last_seen_at else None,
            is_online=bool(u.last_seen_at and u.last_seen_at >= online_cutoff),
            invoice_count=invoice_counts.get(u.id, 0),
            client_count=client_counts.get(u.id, 0),
            expense_count=expense_counts.get(u.id, 0),
            revenue=revenues.get(u.id, 0),
        )
        for u in users
    ]


# ---------------------------------------------------------------- actions


@router.post("/users/{user_id}/verify")
async def sys_verify_user(
    user_id: str,
    admin: User = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
):
    user = await _get_target(db, user_id)
    user.is_verified = True
    user.verification_token = None
    user.verification_token_expires_at = None
    await _record(db, admin, "verify_user", user)
    await db.commit()
    return {"ok": True}


@router.post("/users/{user_id}/toggle-active")
async def sys_toggle_active(
    user_id: str,
    admin: User = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
):
    user = await _get_target(db, user_id)

    # Locking yourself out would need a database session to undo.
    if user.id == admin.id:
        raise HTTPException(
            status_code=400, detail="You cannot deactivate your own account."
        )

    user.is_active = not user.is_active
    await _record(
        db, admin, "activate_user" if user.is_active else "deactivate_user", user
    )
    await db.commit()
    return {"ok": True, "is_active": user.is_active}


@router.post("/users/{user_id}/toggle-admin")
async def sys_toggle_admin(
    user_id: str,
    admin: User = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
):
    user = await _get_target(db, user_id)

    if user.id == admin.id:
        raise HTTPException(
            status_code=400, detail="You cannot change your own admin access."
        )

    # Never let the last admin disappear — the panel would become unreachable
    # without shell access to the server.
    if user.is_admin:
        remaining = (
            await db.execute(
                select(func.count(User.id)).where(
                    User.is_admin.is_(True), User.id != user.id
                )
            )
        ).scalar() or 0
        if remaining == 0:
            raise HTTPException(
                status_code=400,
                detail="This is the only admin. Promote someone else first.",
            )

    user.is_admin = not user.is_admin
    await _record(db, admin, "grant_admin" if user.is_admin else "revoke_admin", user)
    await db.commit()
    return {"ok": True, "is_admin": user.is_admin}


@router.post("/users/{user_id}/send-reset")
async def sys_send_reset(
    user_id: str,
    admin: User = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
):
    user = await _get_target(db, user_id)

    token = secrets.token_urlsafe(32)
    user.password_reset_token = token
    user.password_reset_token_expires_at = datetime.now(timezone.utc) + timedelta(
        hours=24
    )
    await _record(db, admin, "send_password_reset", user)
    await db.commit()

    delivered = await send_password_reset_email(
        to_email=user.email,
        first_name=user.first_name,
        token=token,
    )
    # The token is live either way; say so honestly rather than claiming an
    # email went out when SMTP is not configured.
    return {"ok": True, "email_sent": bool(delivered)}


# -------------------------------------------------------------- audit log


class AuditEntry(BaseModel):
    id: str
    actor_email: str
    action: str
    target_email: str | None
    detail: str | None
    created_at: str


@router.get("/audit", response_model=list[AuditEntry])
async def sys_audit(
    limit: int = Query(50, ge=1, le=200),
    _: User = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
):
    rows = (
        (
            await db.execute(
                select(AdminAuditLog)
                .order_by(AdminAuditLog.created_at.desc())
                .limit(limit)
            )
        )
        .scalars()
        .all()
    )
    return [
        AuditEntry(
            id=str(r.id),
            actor_email=r.actor_email,
            action=r.action,
            target_email=r.target_email,
            detail=r.detail,
            created_at=r.created_at.isoformat(),
        )
        for r in rows
    ]
