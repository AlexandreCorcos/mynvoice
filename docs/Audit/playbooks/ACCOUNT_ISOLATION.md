# Cross-account isolation — does one account see another's data? (SCOPE)

> **Read `docs/Audit/audit.md` § MANDATORY SHARED CONTEXT first** — environments, accounts, DB access,
> tools, bug policy. This file is the **SCOPE**.
> **Mode:** 🔴 authenticated security, **local** (it writes). Attempts to write across the boundary must
> be *blocked* — and you verify in the database that nothing actually changed.

Act as a **senior application-security engineer** hunting the one breach that would end this product:
**a logged-in user reaching another user's invoices, clients, revenue or files.**

MYNVOICE has no tenants, no companies-with-members, no roles. There is exactly one boundary in the
whole system — **`user_id`** — and it is enforced by hand, in every query, in every route. There is no
framework guarantee behind it, no row-level security, no middleware that scopes automatically. That is
what makes this the highest-value audit in the folder: the boundary holds only where somebody
remembered to write `.where(Model.user_id == current_user.id)`, and a single forgotten clause is a
full data breach for the accounts on either side of it.

Assume nothing holds. Prove each one.

---

## Setup — two accounts, both furnished

Per audit.md §2, create **B** (`corcos+audit2@gmail.com`) and populate **both** accounts:

| | Account A (`corcos+mynvoice@`) | Account B (`corcos+audit2@`) |
|---|---|---|
| Company | with a logo uploaded | with a *different* logo |
| Clients | ≥2, distinctive names (`ZZ-A-CLIENT-1`) | ≥2 (`ZZ-B-CLIENT-1`) |
| Items | ≥2 | ≥2 |
| Invoices | ≥3, mixed statuses, one paid | ≥3, one paid, one overdue |
| Payments | ≥2 | ≥2 |
| Expenses | ≥2, with a custom category | ≥2, own category |

Collect **B's ids** into a list. They are your probe payload for the whole run. An isolation test
against an empty account proves nothing — if B has no invoices, "no invoices returned" is not evidence.

---

## SCOPE

### 1. Horizontal IDOR — read

As **A**, request **B's** id on every id-taking route. Enumerate them from the router rather than from
memory (`app/api/router.py` and each route module) so nothing is missed as the app grows.

At minimum: `/invoices/{id}`, `/invoices/{id}/pdf`, `/clients/{id}`, `/items/{id}`, `/payments/{id}`,
`/expenses/{id}`, `/expenses/categories/{id}`, `/profile/company`.

- The correct answer is **404**, not 403. A 403 confirms the row exists, which is itself a small leak —
  it tells A that this id belongs to *somebody*.
- **Check the PDF separately.** It is generated on a different path from the JSON and renders the
  client's name, address and line items. A PDF route that forgets the scope leaks more, in a more
  readable form, than the JSON route beside it.
- Try the id in every shape the router might accept: path, query, and body (`client_id`, `invoice_id`,
  `item_id`, `category_id` on create/update payloads).

### 2. Horizontal IDOR — write

The dangerous half, because a leak here is also corruption.

- `PATCH`/`PUT`/`DELETE` on B's invoice, client, item, payment, expense, category. Expect 404, then
  **confirm in the DB that B's row is untouched** — same `updated_at`, same values, still present.
- **Foreign-key injection.** As A, create an invoice with `client_id` = B's client. Create a payment
  with `invoice_id` = B's invoice. Create an invoice line referencing B's item. Each must be rejected;
  if any is accepted, check what got written — an invoice of A's pointing at B's client is a live leak
  of B's name and address into A's PDF.
- **Re-parenting.** Update one of A's own invoices to point at B's client. This is the variant that
  slips past a create-time check that was never repeated on update.
- Attempt to change `user_id` directly in a payload. Mass-assignment: does the schema accept and apply
  fields it should ignore (`user_id`, `id`, `created_at`, `is_admin`)?

### 3. Aggregates, lists and reports — the quiet leak

An IDOR shows you one row. A broken aggregate shows you a shape of somebody's business without ever
returning a row, and no 404 test will catch it.

- `/dashboard/*` — revenue, paid, outstanding, overdue, ageing, trends. Compute the expected numbers
  for A **from the database** and compare. Then make a large, distinctive change in B (add a
  £999,999 paid invoice) and re-read A's dashboard: it must not move by a penny.
- `/reports/*` — every report, every filter combination, every period. Reports have their own query
  builders and are the most likely place for a missing scope.
- List endpoints with filters, search and pagination: `/invoices?search=`, `?status=`, `?client_id=`,
  `?date_from=`. **Search is the classic hole** — a `LIKE` across a table that forgot the scope. Search
  A's list for B's distinctive `ZZ-B-` strings; expect nothing.
- Deep pagination (`?skip=10000`) and a huge `limit` — does the scope survive both?
- Sort by an unusual column; does an `ORDER BY` path bypass a filter applied elsewhere?

### 4. Numbering and sequences — inference without access

Invoice numbers are per-user and derived from the highest existing one (audit.md §6).

- Confirm A's numbering is not global: A's first invoice must be `INV-…-00001` even when B already has
  fifty. A shared sequence tells A exactly how much business B is doing — a leak with no endpoint.
- Same for payment numbers, and for `use_year_in_number`.
- Do the same two accounts ever collide on a number? Two users must be able to hold the same invoice
  number without a unique-constraint 500.

### 5. Files — logos and PDFs

- Company logos live on R2 behind `storage.mynvoice.com`. Are the URLs guessable or enumerable? Fetch
  B's logo URL **while signed in as A**, and **while signed out**. Decide with the owner whether public
  logo URLs are acceptable (they are embedded in invoice PDFs sent to clients, so "public but
  unguessable" may be the intended design) — but *know* which one it is rather than assuming.
- Upload with a manipulated path or filename (`../`, absolute paths, a very long name). Can one account
  overwrite another's object?
- `DELETE /profile/company/logo` while pointing at another account's object.

### 6. Admin surfaces from a non-admin

Covered in depth by #3, but the isolation angle belongs here: as **A** (not an admin), every
`/sys/*` route must 403 — `/sys/users`, `/sys/metrics`, `/sys/audit`, `/sys/message`, and each
`/sys/users/{id}/*` action. `/sys/users` is a full list of every account's email, name and revenue;
one missing guard there is the whole user base.

Also confirm the frontend guard is not the *only* guard: the panel redirects a non-admin, but the API
must refuse independently.

### 7. Deleted, deactivated and stale sessions

- Deactivate B (`python -m app.cli` / the panel). Does B's **existing** session keep working? An
  access token lives 30 minutes and is not checked against a revocation list — establish whether a
  deactivated user is locked out immediately or at the next refresh, and whether that matches what the
  panel implies to the admin who clicked it.
- Delete one of A's clients that an invoice points at. Does the invoice still render? Does the PDF? Is
  there a dangling FK, a 500, or a row that now shows another account's fallback data?

### 8. Concurrency across the boundary

Fire A and B simultaneously (`asyncio.gather`, confirmed wall-clock overlap):

- Both create an invoice at the same moment — do they get distinct numbers within each account, with no
  `IntegrityError` and no cross-assignment?
- A reads its dashboard while B writes a large invoice — can A ever observe B's figure mid-flight?
- The same request repeated twice in parallel (double-click a Save) — one row or two?

---

## Evidence standard

For every finding, record: the request as sent, the status, the response body, **and the database state
before and after**. "It returned 404" is not evidence that nothing changed — `SELECT` the row and show
it. For anything that crosses the boundary, stop and report immediately (audit.md §7): a leak is not a
finding to batch up with the others.
