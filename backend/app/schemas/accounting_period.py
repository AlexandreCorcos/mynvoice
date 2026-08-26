import uuid
from datetime import date, datetime

from pydantic import BaseModel, model_validator

from app.schemas.types import Money


class AccountingPeriodCreate(BaseModel):
    name: str
    start_date: date
    end_date: date

    @model_validator(mode="after")
    def _dates_in_order(self):
        if self.end_date < self.start_date:
            raise ValueError("end_date must be on or after start_date")
        return self


class AccountingPeriodUpdate(BaseModel):
    name: str | None = None
    start_date: date | None = None
    end_date: date | None = None


class AccountingPeriodResponse(BaseModel):
    id: uuid.UUID
    name: str
    start_date: date
    end_date: date
    closed_at: datetime | None
    is_closed: bool
    # Snapshot stamped at close (null while open).
    snapshot_income: Money | None
    snapshot_expense: Money | None
    snapshot_net: Money | None
    snapshot_entry_count: int | None
    snapshot_reconciled_count: int | None
    # Live totals computed from the ledger right now.
    income: Money
    expense: Money
    net: Money
    entry_count: int
    reconciled_count: int
    created_at: datetime
