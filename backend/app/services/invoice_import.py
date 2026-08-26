"""Import invoices that were issued somewhere else.

MYNVOICE numbers invoices itself, and rightly so: ``POST /invoices`` has no
``invoice_number`` field precisely so a number cannot be chosen by hand. But
invoices raised in another system before the move already carry numbers that
are printed on documents a client holds, and those numbers are the record.
This is the one path that sets them, and it runs server-side for the same
reason ``grant-admin`` does - a shell on the machine is the authorisation.

What it guarantees:

* **Arithmetic is checked, not trusted.** Every invoice in the manifest
  carries the total printed on the original. The importer recomputes it from
  the items and refuses the whole run on any mismatch, so a bad transcription
  cannot become a book figure.
* **Re-running is safe.** An invoice number already in the account is skipped,
  not duplicated - the run can be repeated after fixing one row.
* **The original document is kept.** The PDF as issued is uploaded and served
  in place of a generated one, which would otherwise print today's company
  profile onto a historical record.
* **Numbering continues.** After the import the per-client and company
  counters are moved past what was imported, so the next invoice raised in the
  app cannot collide with an imported one.
"""

import json
import os
import re
import uuid
from datetime import date
from decimal import Decimal

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.client import Client
from app.models.company import Company
from app.models.invoice import Invoice, InvoiceStatus, PaymentMethod
from app.models.invoice_item import InvoiceItem
from app.models.payment import Payment
from app.models.user import User
from app.services import storage
from app.services.ledger import sync_invoice_income


class ManifestError(Exception):
    """A manifest the importer refuses to act on."""


def _money(value) -> Decimal:
    return Decimal(str(value)).quantize(Decimal("0.01"))


def _parse_date(value, field: str) -> date:
    try:
        return date.fromisoformat(value)
    except (TypeError, ValueError):
        raise ManifestError(f"{field}: expected YYYY-MM-DD, got {value!r}")


def _totals(row: dict) -> tuple[Decimal, Decimal, Decimal]:
    """Subtotal, tax and total, recomputed from the items."""
    items = row.get("items") or []
    subtotal = sum(
        (_money(i["quantity"]) * _money(i["unit_price"]) for i in items),
        Decimal("0.00"),
    )
    tax_rate = _money(row.get("tax_rate", 0))
    # Quantised here rather than left to the column: these figures are compared
    # against the printed total and reported back, and a stray 999.0000 in
    # that message reads like a different kind of fault than it is.
    subtotal = subtotal.quantize(Decimal("0.01"))
    tax_amount = (subtotal * tax_rate / 100).quantize(Decimal("0.01"))
    return subtotal, tax_amount, subtotal + tax_amount


def validate(manifest: dict, pdf_dir: str) -> list[str]:
    """Everything wrong with the manifest, in one pass.

    Collected rather than raised one at a time: fixing a transcription means a
    pass over the source documents, and doing that once beats a run that stops
    at the first bad row each time.
    """
    problems: list[str] = []
    keys = {c.get("key") for c in manifest.get("clients", [])}
    seen: set[str] = set()

    for row in manifest.get("invoices", []):
        number = row.get("number") or "<no number>"

        if number in seen:
            problems.append(f"{number}: appears twice in the manifest")
        seen.add(number)

        if row.get("client") not in keys:
            problems.append(f"{number}: unknown client key {row.get('client')!r}")

        try:
            issue = _parse_date(row.get("issue_date"), f"{number}: issue_date")
            due = _parse_date(row.get("due_date"), f"{number}: due_date")
            if due < issue:
                problems.append(f"{number}: due date is before the issue date")
        except ManifestError as e:
            problems.append(str(e))

        status = row.get("status")
        if status not in {s.value for s in InvoiceStatus}:
            problems.append(f"{number}: unknown status {status!r}")

        if status == InvoiceStatus.PAID.value and not row.get("payment_date"):
            problems.append(f"{number}: marked paid, but has no payment_date")
        if row.get("payment_date"):
            try:
                _parse_date(row["payment_date"], f"{number}: payment_date")
            except ManifestError as e:
                problems.append(str(e))

        method = row.get("payment_method")
        if method and method not in {m.value for m in PaymentMethod}:
            problems.append(f"{number}: unknown payment_method {method!r}")

        if not row.get("items"):
            problems.append(f"{number}: no items")
        else:
            # The arithmetic check. expected_total is the figure printed on the
            # document that was actually issued; if the items no longer add up
            # to it, the transcription is wrong and nothing should be written.
            _, _, total = _totals(row)
            expected = row.get("expected_total")
            if expected is None:
                problems.append(f"{number}: no expected_total to check against")
            elif total != _money(expected):
                problems.append(
                    f"{number}: items add up to {total}, "
                    f"but the document says {_money(expected)}"
                )

        source = row.get("source_pdf")
        if not source:
            problems.append(f"{number}: no source_pdf")
        elif not os.path.isfile(os.path.join(pdf_dir, source)):
            problems.append(f"{number}: source_pdf not found: {source}")

    return problems


async def _get_or_create_client(db: AsyncSession, user: User, spec: dict) -> Client:
    name = spec["company_name"]
    existing = (
        await db.execute(
            select(Client).where(
                Client.user_id == user.id,
                func.lower(Client.company_name) == name.lower(),
            )
        )
    ).scalar_one_or_none()
    if existing is not None:
        return existing

    client = Client(
        user_id=user.id,
        company_name=name,
        email=spec.get("email") or "",
        contact_person=spec.get("contact_person"),
        address_line1=spec.get("address_line1"),
        city=spec.get("city"),
        postcode=spec.get("postcode"),
        country=spec.get("country") or "United Kingdom",
        invoice_prefix=spec.get("invoice_prefix"),
        bank_sort_code=spec.get("bank_sort_code"),
        bank_account_number=spec.get("bank_account_number"),
    )
    db.add(client)
    await db.flush()
    return client


def _trailing_number(value: str) -> int:
    match = re.search(r"(\d+)\s*$", value or "")
    return int(match.group(1)) if match else 0


async def run(
    db: AsyncSession,
    manifest: dict,
    pdf_dir: str,
    *,
    dry_run: bool = True,
    upload: bool = True,
) -> list[str]:
    """Import the manifest. Returns a line per action taken."""
    email = manifest.get("account")
    user = (
        await db.execute(
            select(User).where(func.lower(User.email) == (email or "").lower())
        )
    ).scalar_one_or_none()
    if user is None:
        raise ManifestError(f"No account for {email!r}.")

    problems = validate(manifest, pdf_dir)
    if problems:
        raise ManifestError("The manifest does not check out:\n  " + "\n  ".join(problems))

    # Checked up front rather than at the first upload: a run that died
    # partway through storage would leave some invoices with their original
    # attached and some without, which is worse than not starting.
    if upload and not dry_run and not storage.is_configured():
        raise ManifestError(
            "Storage is not configured, so the original documents cannot be "
            "attached. Configure R2, or re-run with --no-pdf to import the "
            "data alone."
        )

    log: list[str] = []

    clients: dict[str, Client] = {}
    for spec in manifest["clients"]:
        clients[spec["key"]] = await _get_or_create_client(db, user, spec)
        log.append(f"client   {spec['company_name']}")

    existing_numbers = {
        n
        for (n,) in (
            await db.execute(
                select(Invoice.invoice_number).where(Invoice.user_id == user.id)
            )
        ).all()
    }

    # Payment numbering continues from the highest already issued, matching
    # _generate_payment_number. Tracked locally because the whole import is one
    # transaction, so rows added here are not visible to a fresh query yet.
    highest_payment = 0
    for (value,) in (
        await db.execute(select(Payment.payment_number).where(Payment.user_id == user.id))
    ).all():
        highest_payment = max(highest_payment, _trailing_number(value))

    for row in manifest["invoices"]:
        number = row["number"]
        if number in existing_numbers:
            log.append(f"skip     {number}  (already in the account)")
            continue

        client = clients[row["client"]]
        subtotal, tax_amount, total = _totals(row)
        status = InvoiceStatus(row["status"])
        paid = status == InvoiceStatus.PAID
        source_name = row.get("source_pdf")

        source_key = None
        if upload and not dry_run:
            with open(os.path.join(pdf_dir, source_name), "rb") as fh:
                contents = fh.read()
            # Randomly keyed, never by invoice number. These documents carry
            # client names, amounts and bank details, and the bucket also
            # serves logos through a public hostname - if public access is
            # ever switched on, a number-based key would hand over every
            # invoice in the account by guessing. The row holds the key, so
            # nothing needs to derive it.
            folder = f"invoices/{user.id}"
            source_key = f"{folder}/{uuid.uuid4().hex}.pdf"
            await storage.upload_file(
                contents,
                folder,
                source_key.rsplit("/", 1)[-1],
                "application/pdf",
            )

        invoice = Invoice(
            user_id=user.id,
            client_id=client.id,
            invoice_number=number,
            reference=row.get("reference"),
            status=status,
            issue_date=_parse_date(row["issue_date"], number),
            due_date=_parse_date(row["due_date"], number),
            subtotal=subtotal,
            tax_rate=_money(row.get("tax_rate", 0)),
            tax_amount=tax_amount,
            discount_amount=Decimal("0.00"),
            total=total,
            currency=row.get("currency", "GBP"),
            notes=row.get("notes"),
            terms=row.get("terms"),
            amount_paid=total if paid else Decimal("0.00"),
            # A cancelled invoice owes nothing; anything else owes what is left.
            balance_due=(
                Decimal("0.00")
                if paid or status == InvoiceStatus.CANCELLED
                else total
            ),
            payment_date=(
                _parse_date(row["payment_date"], number)
                if row.get("payment_date")
                else None
            ),
            payment_method=(
                PaymentMethod(row["payment_method"])
                if row.get("payment_method")
                else None
            ),
            source_pdf_key=source_key,
            # Both fields describe one stored object, so they are set together:
            # a name without a key would tell the UI an original is attached
            # when there is no file behind it.
            source_pdf_name=source_name if source_key else None,
        )
        db.add(invoice)
        await db.flush()

        for order, item in enumerate(row["items"]):
            quantity = _money(item["quantity"])
            unit_price = _money(item["unit_price"])
            db.add(
                InvoiceItem(
                    invoice_id=invoice.id,
                    description=item["description"],
                    quantity=quantity,
                    unit_price=unit_price,
                    amount=quantity * unit_price,
                    sort_order=order,
                )
            )

        if paid:
            highest_payment += 1
            db.add(
                Payment(
                    user_id=user.id,
                    invoice_id=invoice.id,
                    client_id=client.id,
                    payment_number=f"PAY-{highest_payment:05d}",
                    amount=total,
                    currency=invoice.currency,
                    payment_date=invoice.payment_date,
                    payment_mode=(
                        invoice.payment_method.value if invoice.payment_method else None
                    ),
                )
            )

        # The same projection the app uses, so the dashboards read one number
        # and imported revenue lands on the day the money actually arrived.
        await sync_invoice_income(db, invoice)

        log.append(
            f"import   {number:<10} {client.company_name:<22} {invoice.issue_date}"
            f"  {invoice.currency} {total:>9,.2f}  {status.value}"
        )
        existing_numbers.add(number)

    # Move the counters past what was imported, so the next invoice raised in
    # the app continues the series instead of colliding with a historical one.
    for spec in manifest["clients"]:
        client = clients[spec["key"]]
        wanted = spec.get("next_invoice_number")
        if wanted and wanted > (client.next_invoice_number or 1):
            client.next_invoice_number = wanted
            log.append(
                f"counter  {spec['company_name']}: next is "
                f"{client.invoice_prefix or 'INV'}-{wanted:05d}"
            )

    company_next = manifest.get("company_next_invoice_number")
    if company_next:
        company = (
            await db.execute(select(Company).where(Company.user_id == user.id))
        ).scalar_one_or_none()
        if company and company_next > (company.next_invoice_number or 1):
            company.next_invoice_number = company_next
            log.append(
                f"counter  company: next is {company.invoice_prefix}-{company_next:05d}"
            )

    if dry_run:
        await db.rollback()
        log.append("dry run - nothing was written")
    else:
        await db.commit()
        log.append("committed")

    return log


def load(path: str) -> dict:
    with open(path, encoding="utf-8") as fh:
        return json.load(fh)
