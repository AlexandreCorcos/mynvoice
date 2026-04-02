import uuid
from decimal import Decimal

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user
from app.db.session import get_db
from app.models.invoice import Invoice, InvoiceStatus
from app.models.payment import Payment
from app.models.user import User
from app.schemas.payment import PaymentCreate, PaymentResponse

router = APIRouter()


async def _generate_payment_number(db: AsyncSession, user_id: uuid.UUID) -> str:
    result = await db.execute(
        select(func.count(Payment.id)).where(Payment.user_id == user_id)
    )
    count = (result.scalar() or 0) + 1
    return str(count)


@router.get("/", response_model=list[PaymentResponse])
async def list_payments(
    client_id: uuid.UUID | None = Query(None),
    invoice_id: uuid.UUID | None = Query(None),
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100),
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    query = select(Payment).where(Payment.user_id == user.id)
    if client_id:
        query = query.where(Payment.client_id == client_id)
    if invoice_id:
        query = query.where(Payment.invoice_id == invoice_id)
    query = query.order_by(Payment.payment_date.desc()).offset(skip).limit(limit)
    result = await db.execute(query)
    return result.scalars().all()


@router.post("/", response_model=PaymentResponse, status_code=201)
async def create_payment(
    data: PaymentCreate,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    payment_number = await _generate_payment_number(db, user.id)
    payment = Payment(
        user_id=user.id,
        payment_number=payment_number,
        **data.model_dump(),
    )
    db.add(payment)
    await db.flush()

    if payment.invoice_id:
        inv_result = await db.execute(select(Invoice).where(Invoice.id == payment.invoice_id))
        inv = inv_result.scalar_one_or_none()
        if inv:
            inv.amount_paid = (inv.amount_paid or Decimal("0.00")) + data.amount
            inv.balance_due = inv.total - inv.amount_paid
            if inv.balance_due <= 0:
                inv.balance_due = Decimal("0.00")
                inv.status = InvoiceStatus.PAID
                inv.payment_date = data.payment_date

    return payment


@router.delete("/{payment_id}", status_code=204)
async def delete_payment(
    payment_id: uuid.UUID,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Payment).where(Payment.id == payment_id, Payment.user_id == user.id)
    )
    payment = result.scalar_one_or_none()
    if not payment:
        raise HTTPException(status_code=404, detail="Payment not found")
    await db.delete(payment)
