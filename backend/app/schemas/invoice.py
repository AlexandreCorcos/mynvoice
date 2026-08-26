import uuid
from datetime import date, datetime
from decimal import Decimal

from pydantic import BaseModel, Field

from app.models.invoice import InvoiceStatus, PaymentMethod

from app.schemas.types import Money


class InvoiceItemCreate(BaseModel):
    description: str
    # Money is a book figure, not a signed adjustment: quantities, prices,
    # rates and discounts are all >= 0. A negative here used to sail through
    # and produce a negative subtotal/total.
    quantity: Money = Field(default=Decimal("1.00"), ge=0)
    unit_price: Money = Field(ge=0)
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
    tax_rate: Money = Field(default=Decimal("0.00"), ge=0)
    discount_amount: Money = Field(default=Decimal("0.00"), ge=0)
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
    tax_rate: Money | None = Field(default=None, ge=0)
    discount_amount: Money | None = Field(default=None, ge=0)
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
    # Set when the invoice carries the document it was originally issued as
    # (an import). The storage key stays server-side; the name is enough for
    # the UI to say the PDF on offer is the original, not a generated one.
    source_pdf_name: str | None
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
