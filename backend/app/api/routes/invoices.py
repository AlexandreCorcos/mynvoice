import uuid
from datetime import date, datetime, timezone
from decimal import Decimal

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.api.deps import get_current_user
from app.db.session import get_db
from app.models.client import Client as ClientModel
from app.models.company import Company
from app.models.invoice import Invoice, InvoiceStatus
from app.models.invoice_item import InvoiceItem
from app.models.user import User
from app.schemas.invoice import (
    InvoiceCreate,
    InvoiceListResponse,
    InvoiceResponse,
    InvoiceStatusUpdate,
    InvoiceUpdate,
)

router = APIRouter()


def _calculate_totals(items_data, tax_rate: Decimal, discount: Decimal):
    subtotal = sum(item.quantity * item.unit_price for item in items_data)
    tax_amount = subtotal * tax_rate / Decimal("100")
    total = subtotal + tax_amount - discount
    return subtotal, tax_amount, total


async def _generate_invoice_number(
    db: AsyncSession, user_id: uuid.UUID, client_id: uuid.UUID | None = None
) -> str:
    # Get company defaults
    result = await db.execute(
        select(Company).where(Company.user_id == user_id)
    )
    company = result.scalar_one_or_none()

    # Check client-level invoice settings
    client = None
    if client_id:
        result = await db.execute(
            select(ClientModel).where(
                ClientModel.id == client_id, ClientModel.user_id == user_id
            )
        )
        client = result.scalar_one_or_none()

    # Client prefix takes priority, then company, then default
    if client and client.invoice_prefix:
        prefix = client.invoice_prefix
        use_year = client.use_year_in_number
        number = client.next_invoice_number or 1
        # Increment client counter
        client.next_invoice_number = number + 1
    elif company:
        prefix = company.invoice_prefix
        use_year = company.use_year_in_number
        number = company.next_invoice_number or 1
        # Increment company counter
        company.next_invoice_number = number + 1
    else:
        prefix = "INV"
        use_year = False
        number = 1

    if use_year:
        year_suffix = datetime.now(timezone.utc).strftime("%y")
        invoice_number = f"{prefix}-{year_suffix}-{number:05d}"
    else:
        invoice_number = f"{prefix}-{number:05d}"

    return invoice_number


@router.get("/", response_model=list[InvoiceListResponse])
async def list_invoices(
    status_filter: InvoiceStatus | None = Query(None, alias="status"),
    client_id: uuid.UUID | None = Query(None),
    search: str | None = Query(None),
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100),
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    query = select(Invoice).where(Invoice.user_id == user.id)

    if status_filter:
        query = query.where(Invoice.status == status_filter)
    if client_id:
        query = query.where(Invoice.client_id == client_id)
    if search:
        query = query.where(
            Invoice.invoice_number.ilike(f"%{search}%")
            | Invoice.reference.ilike(f"%{search}%")
        )

    query = query.order_by(Invoice.created_at.desc()).offset(skip).limit(limit)
    result = await db.execute(query)
    return result.scalars().all()


@router.get("/{invoice_id}", response_model=InvoiceResponse)
async def get_invoice(
    invoice_id: uuid.UUID,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Invoice)
        .where(Invoice.id == invoice_id, Invoice.user_id == user.id)
        .options(selectinload(Invoice.items))
    )
    invoice = result.scalar_one_or_none()
    if not invoice:
        raise HTTPException(status_code=404, detail="Invoice not found")
    return invoice


@router.post("/", response_model=InvoiceResponse, status_code=201)
async def create_invoice(
    data: InvoiceCreate,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    invoice_number = await _generate_invoice_number(db, user.id, data.client_id)

    subtotal, tax_amount, total = _calculate_totals(
        data.items, data.tax_rate, data.discount_amount
    )

    invoice = Invoice(
        user_id=user.id,
        client_id=data.client_id,
        invoice_number=invoice_number,
        reference=data.reference,
        issue_date=data.issue_date,
        due_date=data.due_date,
        tax_rate=data.tax_rate,
        discount_amount=data.discount_amount,
        subtotal=subtotal,
        tax_amount=tax_amount,
        total=total,
        currency=data.currency,
        notes=data.notes,
        terms=data.terms,
        footer=data.footer,
    )
    db.add(invoice)
    await db.flush()

    for item_data in data.items:
        item = InvoiceItem(
            invoice_id=invoice.id,
            description=item_data.description,
            quantity=item_data.quantity,
            unit_price=item_data.unit_price,
            amount=item_data.quantity * item_data.unit_price,
            unit=item_data.unit,
            sort_order=item_data.sort_order,
        )
        db.add(item)

    await db.flush()

    # Reload with items
    result = await db.execute(
        select(Invoice)
        .where(Invoice.id == invoice.id)
        .options(selectinload(Invoice.items))
    )
    return result.scalar_one()


@router.put("/{invoice_id}", response_model=InvoiceResponse)
async def update_invoice(
    invoice_id: uuid.UUID,
    data: InvoiceUpdate,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Invoice)
        .where(Invoice.id == invoice_id, Invoice.user_id == user.id)
        .options(selectinload(Invoice.items))
    )
    invoice = result.scalar_one_or_none()
    if not invoice:
        raise HTTPException(status_code=404, detail="Invoice not found")

    if invoice.status != InvoiceStatus.DRAFT:
        raise HTTPException(
            status_code=400, detail="Only draft invoices can be edited"
        )

    update_data = data.model_dump(exclude_unset=True, exclude={"items"})
    for field, value in update_data.items():
        setattr(invoice, field, value)

    # Replace items if provided
    if data.items is not None:
        for item in invoice.items:
            await db.delete(item)

        for item_data in data.items:
            item = InvoiceItem(
                invoice_id=invoice.id,
                description=item_data.description,
                quantity=item_data.quantity,
                unit_price=item_data.unit_price,
                amount=item_data.quantity * item_data.unit_price,
                unit=item_data.unit,
                sort_order=item_data.sort_order,
            )
            db.add(item)

    # Recalculate totals
    tax_rate = data.tax_rate if data.tax_rate is not None else invoice.tax_rate
    discount = (
        data.discount_amount
        if data.discount_amount is not None
        else invoice.discount_amount
    )
    items_for_calc = data.items if data.items is not None else []
    if data.items is not None:
        subtotal, tax_amount, total = _calculate_totals(
            data.items, tax_rate, discount
        )
        invoice.subtotal = subtotal
        invoice.tax_amount = tax_amount
        invoice.total = total

    await db.flush()

    result = await db.execute(
        select(Invoice)
        .where(Invoice.id == invoice.id)
        .options(selectinload(Invoice.items))
    )
    return result.scalar_one()


@router.patch("/{invoice_id}/status", response_model=InvoiceResponse)
async def update_invoice_status(
    invoice_id: uuid.UUID,
    data: InvoiceStatusUpdate,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Invoice)
        .where(Invoice.id == invoice_id, Invoice.user_id == user.id)
        .options(selectinload(Invoice.items))
    )
    invoice = result.scalar_one_or_none()
    if not invoice:
        raise HTTPException(status_code=404, detail="Invoice not found")

    invoice.status = data.status
    if data.payment_method:
        invoice.payment_method = data.payment_method
    if data.payment_date:
        invoice.payment_date = data.payment_date

    return invoice


@router.post("/{invoice_id}/duplicate", response_model=InvoiceResponse, status_code=201)
async def duplicate_invoice(
    invoice_id: uuid.UUID,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Invoice)
        .where(Invoice.id == invoice_id, Invoice.user_id == user.id)
        .options(selectinload(Invoice.items))
    )
    original = result.scalar_one_or_none()
    if not original:
        raise HTTPException(status_code=404, detail="Invoice not found")

    invoice_number = await _generate_invoice_number(db, user.id)

    new_invoice = Invoice(
        user_id=user.id,
        client_id=original.client_id,
        invoice_number=invoice_number,
        reference=original.reference,
        issue_date=original.issue_date,
        due_date=original.due_date,
        subtotal=original.subtotal,
        tax_rate=original.tax_rate,
        tax_amount=original.tax_amount,
        discount_amount=original.discount_amount,
        total=original.total,
        currency=original.currency,
        notes=original.notes,
        terms=original.terms,
        footer=original.footer,
        status=InvoiceStatus.DRAFT,
    )
    db.add(new_invoice)
    await db.flush()

    for item in original.items:
        new_item = InvoiceItem(
            invoice_id=new_invoice.id,
            description=item.description,
            quantity=item.quantity,
            unit_price=item.unit_price,
            amount=item.amount,
            unit=item.unit,
            sort_order=item.sort_order,
        )
        db.add(new_item)

    await db.flush()

    result = await db.execute(
        select(Invoice)
        .where(Invoice.id == new_invoice.id)
        .options(selectinload(Invoice.items))
    )
    return result.scalar_one()


@router.delete("/{invoice_id}", status_code=204)
async def delete_invoice(
    invoice_id: uuid.UUID,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Invoice).where(Invoice.id == invoice_id, Invoice.user_id == user.id)
    )
    invoice = result.scalar_one_or_none()
    if not invoice:
        raise HTTPException(status_code=404, detail="Invoice not found")

    if invoice.status == InvoiceStatus.PAID:
        raise HTTPException(status_code=400, detail="Cannot delete a paid invoice")

    await db.delete(invoice)
