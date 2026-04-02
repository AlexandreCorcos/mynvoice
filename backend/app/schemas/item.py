import uuid
from datetime import datetime
from decimal import Decimal

from pydantic import BaseModel


class ItemCreate(BaseModel):
    name: str
    description: str | None = None
    unit_price: Decimal = Decimal("0.00")
    unit: str | None = None


class ItemUpdate(BaseModel):
    name: str | None = None
    description: str | None = None
    unit_price: Decimal | None = None
    unit: str | None = None
    is_active: bool | None = None


class ItemResponse(BaseModel):
    id: uuid.UUID
    name: str
    description: str | None
    unit_price: Decimal
    unit: str | None
    is_active: bool
    created_at: datetime

    model_config = {"from_attributes": True}
