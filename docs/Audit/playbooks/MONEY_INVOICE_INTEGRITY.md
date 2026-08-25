# Money & invoice integrity (SCOPE)

> **Read `docs/Audit/audit.md` § MANDATORY SHARED CONTEXT first.** This file is the **SCOPE**.
> **Mode:** 🟠 read-write + concurrency. **Local first, then production** (audit.md §9).

Act as a **forensic accountant who can read code**. This is somebody's books. An invoicing app that
loses a payment, double-counts revenue, reuses an invoice number or rounds tax the wrong way does not
fail loudly — it fails quietly, for months, and is discovered by an accountant or by a client who was
billed twice.

The bar here is not "the endpoint returns 200". It is **the arithmetic is right, the same question
answered twice gives the same number, and no number can be produced that a bookkeeper would have to
explain.**

---

## 1. The arithmetic of one invoice

Build invoices by hand and check every derived field against the database, not against the API's own
summary.

- `subtotal` = Σ(`quantity` × `unit_price`) per line, with the line total itself checked.
- `tax_amount` from `tax_rate` — applied **before or after** `discount_amount`? Whichever it is, it must
  be consistent between the API, the PDF, the invoice list and the dashboard. Inconsistency between two
  of those is the finding.
- `total` = subtotal − discount + tax. `balance_due` = total − `amount_paid`.
- **Rounding.** Use values that expose it: `0.1 + 0.2`, a 3-decimal quantity, `33.333` at 20% tax, a
  £0.005 half-penny. Money must be `Decimal` end to end; find any place it becomes a float.
- **Signs and zero.** Zero-value invoice. Negative quantity, negative unit price, discount larger than
  the subtotal (does `total` go negative? is that allowed? does `balance_due` follow?). A tax rate of
  100%, of −5%, of 1000.
- **Scale.** A quantity of 1e9, a unit price of 1e12. Does it overflow the column, silently truncate,
  or 500? `Numeric(precision, scale)` has a ceiling — find it and check the error is graceful.
- **Many lines.** 200 line items: correct total, and no N+1 that takes ten seconds.

## 2. Money on the wire — types, not just values

The `Money` type exists because decimals used to serialise as **strings**, which turned `a + b` into
concatenation and `x > 0` into a NaN comparison, and the symptom was a payments screen showing its
"no data" message while holding £960 (audit.md §6).

- For every endpoint returning money, assert `typeof === "number"` in the JSON, not merely that the
  value looks right. Walk the whole response tree — nested line items, dashboard buckets, report rows,
  ageing buckets, `/sys/metrics`.
- Any field added since the `Money` type landed is the likely regression. Diff the schemas for bare
  `Decimal` annotations.
- Currency: create invoices in GBP, EUR and USD. Are totals ever summed **across** currencies in the
  dashboard or reports? Adding £100 to €100 and showing £200 is a serious, quiet defect.

## 3. Payments and the paid state

- Record a payment for part of an invoice: `amount_paid` rises, `balance_due` falls, status stays
  `sent`. Pay the remainder: status becomes `paid`, `balance_due` is exactly zero.
- **Overpay.** Pay more than `total`. Is it refused, or does `balance_due` go negative and the
  dashboard subtract it from real revenue?
- Delete a payment on a paid invoice — does the status revert, and does `amount_paid` come back down?
  Delete the *invoice* — what happens to its payments? Orphans, a cascade, or a 500?
- Edit an invoice **after** it is paid: raise the total. Does the status stay `paid` while
  `balance_due` is now positive? That combination is a bookkeeping contradiction; decide which side
  should win and check the app agrees with itself.
- Two payments recorded in parallel for the same invoice, each for half — does `amount_paid` end at the
  sum, or does a lost update leave it at one half? This is a read-modify-write and the classic place to
  lose money.

## 4. Numbering — unique, sequential, never reused

Numbers are derived from the highest existing one, not `count(*) + 1`, precisely because counting
reused numbers after a deletion (audit.md §6).

- Create, delete the last one, create again → the new number must **not** reuse the deleted one.
- `use_year_in_number` on and off, and toggled **mid-year** with invoices already issued.
- `invoice_prefix` per client: switching a client's prefix must not renumber history.
- **Concurrency, the important one.** Fire 10 simultaneous creates. Expect 10 distinct numbers, no
  `IntegrityError`, no 500. A derived-from-max scheme without a lock or a unique constraint has a race
  window between the `SELECT max` and the `INSERT`; find out whether it is open. Repeat for payments.
- Then check the DB for duplicates directly:
  `SELECT invoice_number, count(*) FROM invoices GROUP BY 1 HAVING count(*) > 1;`

## 5. Status lifecycle

Draft → Sent → Paid → Overdue, plus cancellation.

- Every transition, including the ones that should be refused: paid → draft, sending an already-paid
  invoice, marking an empty draft as paid.
- **Overdue** is derived from `due_date`, not stored by a job — confirm which, and that an invoice
  becomes overdue at the right moment in the right timezone. Set `due_date` to yesterday, today and
  tomorrow around midnight UTC.
- A `due_date` **before** the `issue_date` — accepted? It should not be.
- Does sending an invoice change any figure it should not? Does a failed send leave the status
  advanced anyway? (Locally `POST /invoices/{id}/send` is expected to fail — no SMTP — which makes it
  the perfect test of the failure path: the status must not lie.)

## 6. The aggregates must agree with the rows

Every figure on the dashboard and in reports must be reproducible from the tables by hand. Where two
screens show the same concept, they must show the same number.

- **"Outstanding" has been wrong here before**: three surfaces used three different definitions
  (`SENT + DRAFT` on `total`, versus `SENT + OVERDUE` on `balance_due`). Re-derive the definition from
  the code, then confirm the dashboard, the reports and the invoice-list header all use it.
- Do drafts count as revenue anywhere? They must not.
- Ageing buckets: an invoice exactly on a boundary (0, 15, 30, 45 days) falls in exactly one bucket,
  and the buckets sum to the total outstanding.
- Monthly trend: an invoice issued on the 1st and one on the 31st land in the right months. Check a
  month boundary in a non-UTC display timezone.
- Expenses: fixed versus variable, custom categories, a category deleted while expenses point at it.

## 7. Reconciliation invariants — assert these after every phase

Run these as SQL after each block of work. Any non-empty result is a finding.

```sql
-- amount_paid must equal the sum of its payments
SELECT i.id, i.amount_paid, COALESCE(SUM(p.amount), 0) AS paid
FROM invoices i LEFT JOIN payments p ON p.invoice_id = i.id
GROUP BY i.id, i.amount_paid
HAVING i.amount_paid <> COALESCE(SUM(p.amount), 0);

-- balance_due must equal total - amount_paid
SELECT id, total, amount_paid, balance_due
FROM invoices WHERE balance_due <> total - amount_paid;

-- a paid invoice with an outstanding balance, or the reverse
SELECT id, status, balance_due FROM invoices
WHERE (status = 'paid' AND balance_due <> 0)
   OR (status <> 'paid' AND balance_due = 0 AND total > 0);

-- duplicate numbers within one account
SELECT user_id, invoice_number, count(*) FROM invoices
GROUP BY 1, 2 HAVING count(*) > 1;

-- totals that disagree with their own line items
SELECT i.id, i.subtotal, COALESCE(SUM(li.quantity * li.unit_price), 0) AS lines
FROM invoices i LEFT JOIN invoice_items li ON li.invoice_id = i.id
GROUP BY i.id, i.subtotal
HAVING i.subtotal <> COALESCE(SUM(li.quantity * li.unit_price), 0);
```

Adjust the column names to the models if they have drifted — and if a name has drifted, say so in the
report.

## 7b. The production pass

The arithmetic is environment-independent, but three things are not, and they are the reasons to
repeat this live:

- **The `Money` serialisation** depends on the deployed build, not on your local one. Re-assert
  `typeof === "number"` on every production endpoint; a field added since the last deploy is exactly
  where a bare `Decimal` slips back in.
- **Numbering under concurrency** behaves differently with four uvicorn workers than with one. Fire
  ten simultaneous invoice creates in production **as an audit account** and check for duplicates —
  the local single-worker run cannot show you this.
- **The reconciliation SQL in §7 is worth running against the real data**, once, read-only, across
  *all* accounts. It is the cheapest possible check that nobody's books are already broken, and it
  answers a question the owner actually has. Report the counts; do not fix anything you find in
  another account's data without asking.

Everything created is `ZZ-AUDIT-` prefixed and removed afterwards.

## 8. The PDF must match the record

The PDF is what the client receives and what gets argued about.

- Generate the PDF for an invoice of each shape: multi-line, discounted, taxed, multi-currency,
  zero-value, 200 lines, a very long client name, unicode and emoji in the description, a right-to-left
  string.
- Every figure in the PDF must equal the database. A PDF that rounds differently from the API is a real
  defect, not a cosmetic one.
- Change the invoice, regenerate — no stale cache.
- Confirm the number, dates and currency symbol are the invoice's own, not a default.
