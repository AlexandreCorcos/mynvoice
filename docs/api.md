# MYNVOICE API Documentation

## Base URL

```
http://localhost:8000/api/v1
```

## Authentication

All endpoints (except `/auth/*` and `/admin/donations` GET) require a Bearer token.

```
Authorization: Bearer <access_token>
```

### Register

```
POST /auth/register
```

```json
{
  "email": "user@example.com",
  "password": "securepassword",
  "first_name": "John",
  "last_name": "Doe"
}
```

**Response (201):**
```json
{
  "access_token": "eyJ...",
  "refresh_token": "eyJ...",
  "token_type": "bearer"
}
```

### Login

```
POST /auth/login
```

```json
{
  "email": "user@example.com",
  "password": "securepassword"
}
```

### Refresh Token

```
POST /auth/refresh
```

```json
{
  "refresh_token": "eyJ..."
}
```

---

## Profile

### Get Current User
```
GET /profile/me
```

### Update User
```
PUT /profile/me
```
```json
{
  "first_name": "Jane",
  "phone": "+44 7700 900000",
  "currency": "EUR"
}
```

### Get Company
```
GET /profile/company
```

### Create Company
```
POST /profile/company
```
```json
{
  "name": "Acme Ltd",
  "vat_number": "GB123456789",
  "address_line1": "123 High Street",
  "city": "London",
  "postcode": "EC1A 1BB",
  "invoice_prefix": "ACM",
  "default_payment_terms_days": 30
}
```

### Update Company
```
PUT /profile/company
```

---

## Clients

### List Clients
```
GET /clients/?search=acme&skip=0&limit=50
```

### Get Client
```
GET /clients/{client_id}
```

### Create Client
```
POST /clients/
```
```json
{
  "company_name": "Widget Corp",
  "email": "billing@widget.com",
  "contact_person": "Jane Smith",
  "city": "Manchester"
}
```

### Update Client
```
PUT /clients/{client_id}
```

### Delete Client
```
DELETE /clients/{client_id}
```

---

## Invoices

### List Invoices
```
GET /invoices/?status=draft&client_id=xxx&search=INV&skip=0&limit=50
```

### Get Invoice (with items)
```
GET /invoices/{invoice_id}
```

### Create Invoice
```
POST /invoices/
```
```json
{
  "client_id": "uuid",
  "issue_date": "2026-03-28",
  "due_date": "2026-04-28",
  "tax_rate": 20.00,
  "currency": "GBP",
  "notes": "Thank you for your business",
  "items": [
    {
      "description": "Web Development",
      "quantity": 40,
      "unit_price": 75.00,
      "unit": "hours",
      "sort_order": 0
    },
    {
      "description": "Domain Registration",
      "quantity": 1,
      "unit_price": 12.99,
      "sort_order": 1
    }
  ]
}
```

The invoice number is auto-generated from the company prefix and sequence.

### Update Invoice (draft only)
```
PUT /invoices/{invoice_id}
```

### Update Status
```
PATCH /invoices/{invoice_id}/status
```
```json
{
  "status": "paid",
  "payment_method": "bank_transfer",
  "payment_date": "2026-03-30"
}
```

Valid statuses: `draft`, `sent`, `paid`, `overdue`
Payment methods: `bank_transfer`, `card`, `cash`, `other`

### Duplicate Invoice
```
POST /invoices/{invoice_id}/duplicate
```
Creates a new draft invoice with the same items and details.

### Delete Invoice
```
DELETE /invoices/{invoice_id}
```
Paid invoices cannot be deleted.

---

## Expenses

### List Expenses
```
GET /expenses/?category_id=xxx&expense_type=fixed&month=2026-03&skip=0&limit=50
```

### Create Expense
```
POST /expenses/
```
```json
{
  "description": "AWS Hosting",
  "amount": 49.99,
  "expense_type": "fixed",
  "expense_date": "2026-03-01",
  "category_id": "uuid",
  "vendor": "Amazon Web Services"
}
```

### Update / Delete Expense
```
PUT /expenses/{expense_id}
DELETE /expenses/{expense_id}
```

### Expense Categories
```
GET    /expenses/categories
POST   /expenses/categories   { "name": "Software", "colour": "#0F4C5C" }
DELETE /expenses/categories/{category_id}
```

---

## Dashboard

```
GET /dashboard/
```

Returns aggregated stats and 12-month trends for the authenticated user.

---

## Admin (requires admin role)

### System Metrics
```
GET /admin/metrics
```

### Donation Progress (public)
```
GET /admin/donations
```

### Update Donation Config
```
PUT /admin/donations/config
```
```json
{
  "monthly_target": 1500.00,
  "message": "Help us keep MYNVOICE free!"
}
```
