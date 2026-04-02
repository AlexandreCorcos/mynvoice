import uuid
from datetime import date, datetime
from decimal import Decimal

from pydantic import BaseModel


class PaymentCreate(BaseModel):
    invoice_id: uuid.UUID | None = None
    client_id: uuid.UUID | None = None
    amount: Decimal
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
    amount: Decimal
    currency: str
    payment_date: date
    payment_mode: str | None
    reference: str | None
    notes: str | None
    created_at: datetime

    model_config = {"from_attributes": True}
