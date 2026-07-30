import uuid
from datetime import date, datetime
from decimal import Decimal

from pydantic import BaseModel

from app.models.invoice import InvoiceStatus, PaymentMethod

from app.schemas.types import Money


class InvoiceItemCreate(BaseModel):
    description: str
    quantity: Money = Decimal("1.00")
    unit_price: Money
    unit: str | None = None
    sort_order: int = 0


class InvoiceItemResponse(BaseModel):
    id: uuid.UUID
    description: str
    quantity: Money
    unit_price: Money
    amount: Money
    unit: str | None
    sort_order: int

    model_config = {"from_attributes": True}


class InvoiceCreate(BaseModel):
    client_id: uuid.UUID | None = None
    reference: str | None = None
    issue_date: date
    due_date: date
    tax_rate: Money = Decimal("0.00")
    discount_amount: Money = Decimal("0.00")
    currency: str = "GBP"
    notes: str | None = None
    terms: str | None = None
    footer: str | None = None
    pdf_template: str = "classic"
    items: list[InvoiceItemCreate] = []


class InvoiceUpdate(BaseModel):
    client_id: uuid.UUID | None = None
    reference: str | None = None
    issue_date: date | None = None
    due_date: date | None = None
    tax_rate: Money | None = None
    discount_amount: Money | None = None
    currency: str | None = None
    notes: str | None = None
    terms: str | None = None
    footer: str | None = None
    pdf_template: str | None = None
    items: list[InvoiceItemCreate] | None = None


class InvoiceStatusUpdate(BaseModel):
    status: InvoiceStatus
    payment_method: PaymentMethod | None = None
    payment_date: date | None = None


class InvoiceResponse(BaseModel):
    id: uuid.UUID
    invoice_number: str
    reference: str | None
    client_id: uuid.UUID | None
    status: InvoiceStatus
    issue_date: date
    due_date: date
    subtotal: Money
    tax_rate: Money
    tax_amount: Money
    discount_amount: Money
    total: Money
    amount_paid: Money
    balance_due: Money
    currency: str
    payment_method: PaymentMethod | None
    payment_date: date | None
    notes: str | None
    terms: str | None
    footer: str | None
    pdf_template: str
    sent_at: datetime | None
    sent_to_email: str | None
    items: list[InvoiceItemResponse]
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class InvoiceListResponse(BaseModel):
    id: uuid.UUID
    invoice_number: str
    client_id: uuid.UUID | None
    status: InvoiceStatus
    issue_date: date
    due_date: date
    total: Money
    amount_paid: Money
    balance_due: Money
    currency: str
    created_at: datetime

    model_config = {"from_attributes": True}
