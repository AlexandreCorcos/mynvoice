# R04 — Account isolation is the one boundary

> Detail of **R4** in [`AI_RULES.md`](../../AI_RULES.md). Read before touching any query, model,
> or endpoint that reads or writes owned data. This is the tripwire rule.

## The invariant

MYNVOICE has no tenants, no organisations, no teams. `users.id` is the **only** wall between one
account and the next, and it is enforced **by hand** in every query. There is no framework
guarantee behind it — miss the filter once and another account's clients, invoices, amounts and
bank details are exposed.

## The rules

- **Every owned query filters `user_id`.** Owned models: `Client`, `Company`, `Invoice`, `Item`,
  `Payment`, `Expense`, `ExpenseCategory`, `AccountingPeriod`, `TransactionItem`. A `select()` on
  any of them carries `Model.user_id == user.id`.
- **Every foreign reference in a create/update body goes through `assert_owned`** (`app/api/deps.py`).
  An invoice's `client_id`, a payment's `invoice_id`, an expense's `category_id` — the referenced
  row must belong to the caller. A missing check once let one account attach another's client to
  its invoice, whose PDF then rendered that client's name, address and bank details.
- **A foreign id returns 404, not 403** — indistinguishable from one that does not exist.
- **Admin (`/sys/ctrl`) may count, not browse.** Platform metrics aggregate; they never read one
  account's documents.
- **Widening access is an owner decision.** Anything that lets one account (or an admin) see
  another's data is never an "obvious fix" — propose it, the owner decides.

## Guarded by

`backend/tests/guards/test_user_isolation.py` — a class-of-defect scan: a route module that runs a
`select()` without any `user_id` scoping fails. Allow-list (`NOT_USER_SCOPED`) covers auth, admin
and sysctrl, which are legitimately not user-scoped. Widen it deliberately, with a reason.

Not guarded yet: per-query AST scoping (aliased models), and `assert_owned` on every reference.
When one of these recurs, make it a guard rather than a memory line.
