import uuid
from datetime import datetime
from decimal import Decimal

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
    invoice_prefix: str | None = None
    use_year_in_number: bool = False
    default_payment_terms_days: int | None = None
    default_notes: str | None = None
    bank_name: str | None = None
    bank_account_name: str | None = None
    bank_account_number: str | None = None
    bank_sort_code: str | None = None
    bank_iban: str | None = None
    bank_swift: str | None = None
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
    invoice_prefix: str | None = None
    use_year_in_number: bool | None = None
    default_payment_terms_days: int | None = None
    default_notes: str | None = None
    bank_name: str | None = None
    bank_account_name: str | None = None
    bank_account_number: str | None = None
    bank_sort_code: str | None = None
    bank_iban: str | None = None
    bank_swift: str | None = None
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
    invoice_prefix: str | None
    next_invoice_number: int
    use_year_in_number: bool
    default_payment_terms_days: int | None
    default_notes: str | None
    bank_name: str | None
    bank_account_name: str | None
    bank_account_number: str | None
    bank_sort_code: str | None
    bank_iban: str | None
    bank_swift: str | None
    notes: str | None
    total_receivables: Decimal = Decimal("0.00")
    created_at: datetime

    model_config = {"from_attributes": True}
