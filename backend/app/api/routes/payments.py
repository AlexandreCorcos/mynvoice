import re
import uuid
from datetime import datetime, timezone
from decimal import Decimal

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import assert_owned, get_current_user
from app.core.locks import lock_user_numbering
from app.db.session import get_db
from app.models.client import Client as ClientModel
from app.models.company import Company
from app.models.invoice import Invoice, InvoiceStatus
from app.models.payment import Payment
from app.models.user import User
from app.schemas.payment import PaymentCreate, PaymentResponse
from app.services.ledger import sync_invoice_income

router = APIRouter()


async def _generate_payment_number(db: AsyncSession, user_id: uuid.UUID) -> str:
    """PAY-00001, mirroring the invoice scheme and honouring the same
    year-in-number setting so the two read as one system.

    Derived from the highest number already issued rather than a row count:
    counting reuses a number after a deletion, and a payment reference that
    can point at two different payments is worse than a gap in the sequence.

    Serialised per account for the rest of the transaction, so two concurrent
    payments cannot read the same highest number and issue it twice.
    """
    await lock_user_numbering(db, user_id)

    result = await db.execute(
        select(Payment.payment_number).where(Payment.user_id == user_id)
    )
    highest = 0
    for (value,) in result.all():
        match = re.search(r"(\d+)\s*$", value or "")
        if match:
            highest = max(highest, int(match.group(1)))
    number = highest + 1

    company_result = await db.execute(
        select(Company).where(Company.user_id == user_id)
    )
    company = company_result.scalar_one_or_none()

    if company and company.use_year_in_number:
        year_suffix = datetime.now(timezone.utc).strftime("%y")
        return f"PAY-{year_suffix}-{number:05d}"
    return f"PAY-{number:05d}"


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
    # A payment must not reference another account's invoice or client — both
    # would attach one account's money record to another's books.
    await assert_owned(db, Invoice, data.invoice_id, user.id, "Invoice not found")
    await assert_owned(db, ClientModel, data.client_id, user.id, "Client not found")

    payment_number = await _generate_payment_number(db, user.id)
    payment = Payment(
        user_id=user.id,
        payment_number=payment_number,
        **data.model_dump(),
    )
    db.add(payment)
    await db.flush()

    if payment.invoice_id:
        inv_result = await db.execute(
            select(Invoice).where(
                Invoice.id == payment.invoice_id, Invoice.user_id == user.id
            )
        )
        inv = inv_result.scalar_one_or_none()
        if inv:
            inv.amount_paid = (inv.amount_paid or Decimal("0.00")) + data.amount
            inv.balance_due = inv.total - inv.amount_paid
            if inv.balance_due <= 0:
                inv.balance_due = Decimal("0.00")
                inv.status = InvoiceStatus.PAID
                inv.payment_date = data.payment_date
            # Reflect the newly-received money in the cash-basis ledger.
            await sync_invoice_income(db, inv)

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

    # Capture before delete — attributes are unreliable once it's gone.
    amount = payment.amount or Decimal("0.00")
    invoice_id = payment.invoice_id

    await db.delete(payment)

    # Reverse the money off the invoice: deleting a payment used to leave
    # amount_paid/balance_due stale (an invoice could stay "paid" with no
    # payment behind it). Undo it and re-sync the cash-basis ledger.
    if invoice_id:
        inv_result = await db.execute(
            select(Invoice).where(
                Invoice.id == invoice_id, Invoice.user_id == user.id
            )
        )
        inv = inv_result.scalar_one_or_none()
        if inv:
            inv.amount_paid = max(
                Decimal("0.00"), (inv.amount_paid or Decimal("0.00")) - amount
            )
            inv.balance_due = inv.total - inv.amount_paid
            if inv.balance_due > 0 and inv.status == InvoiceStatus.PAID:
                inv.status = InvoiceStatus.SENT
                inv.payment_date = None
            await sync_invoice_income(db, inv)
