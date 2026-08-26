import uuid
from datetime import date, datetime
from decimal import Decimal

from pydantic import BaseModel, Field

from app.schemas.types import Money


class PaymentCreate(BaseModel):
    invoice_id: uuid.UUID | None = None
    client_id: uuid.UUID | None = None
    # A payment is money received: it must be strictly positive. A zero or
    # negative amount is either a mistake or a disguised adjustment.
    amount: Money = Field(gt=0)
    currency: str = "GBP"
    payment_date: date
    payment_mode: str | None = None
    reference: str | None = None
    notes: str | None = None


class PaymentResponse(BaseModel):
    id: uuid.UUID
    invoice_id: uuid.UUID | None
    client_id: uuid.UUID | None
    payment_number: str
    amount: Money
    currency: str
    payment_date: date
    payment_mode: str | None
    reference: str | None
    notes: str | None
    created_at: datetime

    model_config = {"from_attributes": True}
