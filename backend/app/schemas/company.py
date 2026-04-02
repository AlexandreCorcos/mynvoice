import uuid
from datetime import datetime

from pydantic import BaseModel


class CompanyCreate(BaseModel):
    name: str
    legal_name: str | None = None
    registration_number: str | None = None
    vat_number: str | None = None
    tax_id: str | None = None
    email: str | None = None
    phone: str | None = None
    website: str | None = None
    address_line1: str | None = None
    address_line2: str | None = None
    city: str | None = None
    county: str | None = None
    postcode: str | None = None
    country: str = "United Kingdom"
    brand_colour: str | None = None
    default_payment_terms_days: int | None = 30
    default_notes: str | None = None
    invoice_prefix: str = "INV"
    use_year_in_number: bool = False
    bank_name: str | None = None
    bank_account_name: str | None = None
    bank_account_number: str | None = None
    bank_sort_code: str | None = None
    bank_iban: str | None = None
    bank_swift: str | None = None


class CompanyUpdate(CompanyCreate):
    name: str | None = None  # type: ignore[assignment]


class CompanyResponse(BaseModel):
    id: uuid.UUID
    name: str
    legal_name: str | None
    registration_number: str | None
    vat_number: str | None
    tax_id: str | None
    email: str | None
    phone: str | None
    website: str | None
    address_line1: str | None
    address_line2: str | None
    city: str | None
    county: str | None
    postcode: str | None
    country: str
    logo_url: str | None
    brand_colour: str | None
    default_payment_terms_days: int | None
    default_notes: str | None
    invoice_prefix: str
    next_invoice_number: int
    use_year_in_number: bool
    bank_name: str | None
    bank_account_name: str | None
    bank_account_number: str | None
    bank_sort_code: str | None
    bank_iban: str | None
    bank_swift: str | None
    created_at: datetime

    model_config = {"from_attributes": True}
