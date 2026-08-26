import uuid
from datetime import date, datetime
from decimal import Decimal

from pydantic import BaseModel

from app.models.expense import ExpenseType, TransactionKind, TransactionSource

from app.schemas.types import Money


class ExpenseCategoryCreate(BaseModel):
    name: str
    kind: TransactionKind = TransactionKind.EXPENSE
    colour: str | None = None
    icon: str | None = None


class ExpenseCategoryResponse(BaseModel):
    id: uuid.UUID
    name: str
    kind: TransactionKind
    colour: str | None
    icon: str | None

    model_config = {"from_attributes": True}


class ExpenseCreate(BaseModel):
    category_id: uuid.UUID | None = None
    kind: TransactionKind = TransactionKind.EXPENSE
    description: str
    amount: Money
    currency: str = "GBP"
    expense_type: ExpenseType = ExpenseType.VARIABLE
    expense_date: date
    vendor: str | None = None
    notes: str | None = None
    is_billable: bool = False
    client_id: uuid.UUID | None = None


class ExpenseUpdate(BaseModel):
    category_id: uuid.UUID | None = None
    kind: TransactionKind | None = None
    description: str | None = None
    amount: Money | None = None
    currency: str | None = None
    expense_type: ExpenseType | None = None
    expense_date: date | None = None
    vendor: str | None = None
    notes: str | None = None
    is_billable: bool | None = None
    client_id: uuid.UUID | None = None


class ExpenseResponse(BaseModel):
    id: uuid.UUID
    category_id: uuid.UUID | None
    kind: TransactionKind
    source: TransactionSource
    invoice_id: uuid.UUID | None
    description: str
    amount: Money
    currency: str
    expense_type: ExpenseType
    expense_date: date
    vendor: str | None
    receipt_url: str | None
    notes: str | None
    is_billable: bool
    client_id: uuid.UUID | None
    reconciled_at: datetime | None
    created_at: datetime

    model_config = {"from_attributes": True}
