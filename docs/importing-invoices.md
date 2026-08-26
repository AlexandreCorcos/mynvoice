# Importing invoices issued elsewhere

Invoices raised in another system before the move to MYNVOICE already carry
numbers that are printed on documents a client holds. Those numbers *are* the
record — they cannot be reassigned — so there has to be a way to bring them in
as they stand.

`POST /invoices` deliberately has no `invoice_number` field: numbers are
derived, never chosen, which is what stops two invoices sharing one. The
importer is the single exception, and it runs server-side for the same reason
`grant-admin` does — a shell on the machine that runs the database is the
authorisation.

```bash
docker compose exec backend python -m app.cli import-invoices /path/to/manifest.json
```

That checks the manifest and prints what it *would* do. Nothing is written
without `--commit`.

| Flag | Effect |
|---|---|
| *(none)* | Validate and report. The transaction is rolled back. |
| `--commit` | Write it. |
| `--no-pdf` | Import the data without attaching the original documents. |

## What it guarantees

**Arithmetic is checked, not trusted.** Every row carries `expected_total` —
the figure printed on the document that was actually issued. The importer
recomputes the total from the line items and refuses the *whole run* if any
row disagrees. A mistyped unit price cannot become a book figure.

**Re-running is safe.** An invoice number already in the account is skipped,
never duplicated. Fix one row and run it again.

**The original document is kept.** The PDF as issued is uploaded to storage
and served in place of a generated one. This matters more than it first
appears: `generate_invoice_pdf` renders the company profile *as it stands
today*, so regenerating a 2024 invoice would print the wrong trading name onto
a historical record. `Invoice.source_pdf_key` holds a storage key rather than
a public URL, so the document still goes through the authenticated PDF route.
The key itself is a random UUID, never the invoice number: the bucket also
serves logos through a public hostname, and if public access were ever
switched on, a number-based key would hand over every invoice in an account
by guessing. An invoice is not a logo.

**Numbering continues.** After the run, the per-client and company counters
are moved past what was imported, so the next invoice raised in the app cannot
collide with a historical one.

**It is one transaction.** Clients, invoices, items, payments and the ledger
projection all land together or not at all.

## The manifest

```jsonc
{
  "account": "you@example.com",
  "pdf_dir": "D:/path/to/pdfs",        // optional; defaults to the manifest's folder
  "company_next_invoice_number": 19,   // optional
  "clients": [
    {
      "key": "acme",                   // referenced by each invoice
      "company_name": "Acme Ltd",
      "email": "billing@acme.example",
      "address_line1": "1 Example Street",
      "city": "Leeds",
      "postcode": "LS1 1AA",
      "country": "United Kingdom",
      "invoice_prefix": "INV-A",
      "next_invoice_number": 6
    }
  ],
  "invoices": [
    {
      "number": "INV-0001",            // the number as issued
      "reference": null,               // e.g. the old number, when renumbered
      "client": "acme",
      "issue_date": "2024-12-02",
      "due_date": "2024-12-02",
      "currency": "GBP",
      "tax_rate": "0",                 // percentage, applied to the whole invoice
      "status": "paid",
      "payment_date": "2024-12-02",    // required when status is paid
      "payment_method": "bank_transfer",
      "notes": "...",
      "terms": null,
      "expected_total": "1000.00",     // checked against the items
      "source_pdf": "INV-0001.pdf",    // relative to pdf_dir
      "items": [
        { "description": "...", "quantity": "1", "unit_price": "1000.00" }
      ]
    }
  ]
}
```

A client already in the account (matched on name, case-insensitively) is
reused rather than duplicated.

## Things worth knowing before a run

**Storage must be configured** unless you pass `--no-pdf`. This is checked
before anything is written, so a run cannot end with half the invoices
carrying their original and half not.

**`payment_date` is required on a paid invoice**, and is not defaulted. The
ledger is cash-basis and dates income on the day the money arrived
(`app/services/ledger.py`), so a guessed payment date silently moves revenue
into the wrong month — and therefore the wrong accounting period. The importer
would rather refuse than guess.

**The generated number format differs from most legacy ones.**
`_generate_invoice_number` produces `{prefix}-{number:05d}`, so a client whose
imported series reads `INV-A0005` continues as `INV-A-00006`. The numbers stay
unique and sequential, which is what matters, but the shape changes at the
handover. If the old shape needs to carry on, the generator is the thing to
change — not the import.

**Duplicate numbers across series must be resolved in the manifest.** The
database holds a unique constraint on `(user_id, invoice_number)`. Where the
same number was issued twice, renumber the one that belongs to another series
and record what the client actually holds in `reference` — the list endpoint
searches that field, so the issued number still finds the invoice.
