import uuid
from datetime import datetime

from pydantic import BaseModel, EmailStr


class ClientCreate(BaseModel):
    company_name: str
    contact_person: str | None = None
    email: EmailStr
    phone: str | None = None
    address_line1: str | None = None
    address_line2: str | None = None
    city: str | None = None
    county: str | None = None
    postcode: str | None = None
    country: str = "United Kingdom"
    vat_number: str | None = None
    notes: str | None = None


class ClientUpdate(BaseModel):
    company_name: str | None = None
    contact_person: str | None = None
    email: EmailStr | None = None
    phone: str | None = None
    address_line1: str | None = None
    address_line2: str | None = None
    city: str | None = None
    county: str | None = None
    postcode: str | None = None
    country: str | None = None
    vat_number: str | None = None
    notes: str | None = None


class ClientResponse(BaseModel):
    id: uuid.UUID
    company_name: str
    contact_person: str | None
    email: str
    phone: str | None
    address_line1: str | None
    address_line2: str | None
    city: str | None
    county: str | None
    postcode: str | None
    country: str
    vat_number: str | None
    notes: str | None
    created_at: datetime

    model_config = {"from_attributes": True}
