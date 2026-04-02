"""PDF invoice generation service using WeasyPrint."""

from __future__ import annotations

import html as html_mod
from pathlib import Path
from typing import Any

from weasyprint import HTML


def _esc(value: Any) -> str:
    """Escape a value for safe HTML output."""
    if value is None:
        return ""
    return html_mod.escape(str(value))


def fmt_currency(amount, currency: str = "GBP") -> str:
    """Format a numeric amount with the appropriate currency symbol."""
    symbols = {"GBP": "\u00a3", "EUR": "\u20ac", "USD": "$"}
    symbol = symbols.get(currency, currency + " ")
    try:
        return f"{symbol}{float(amount):,.2f}"
    except (TypeError, ValueError):
        return f"{symbol}0.00"


def _format_date(d) -> str:
    """Format a date object to a readable string."""
    if d is None:
        return ""
    try:
        return d.strftime("%d %b %Y")
    except AttributeError:
        return str(d)


def _build_logo_html(company) -> str:
    """Build the logo <img> tag if a logo file exists."""
    if not company or not getattr(company, "logo_url", None):
        return ""
    logo_path = company.logo_url.lstrip("/")
    return (
        f'<img src="{_esc(logo_path)}" '
        'style="max-height:60px; max-width:180px; margin-bottom:8px;" /><br/>'
    )


def _build_company_html(company) -> str:
    """Build the company details block."""
    if not company:
        return ""
    parts: list[str] = []
    logo = _build_logo_html(company)
    if logo:
        parts.append(logo)
    name = getattr(company, "legal_name", None) or getattr(company, "name", None) or ""
    if name:
        parts.append(f'<strong style="font-size:16px;">{_esc(name)}</strong>')
    for field in ("address_line1", "city", "postcode", "country"):
        val = getattr(company, field, None)
        if val:
            parts.append(_esc(val))
    if getattr(company, "email", None):
        parts.append(_esc(company.email))
    if getattr(company, "phone", None):
        parts.append(_esc(company.phone))
    if getattr(company, "website", None):
        parts.append(_esc(company.website))
    if getattr(company, "vat_number", None):
        parts.append(f"VAT: {_esc(company.vat_number)}")
    return "<br/>".join(parts)


def _build_client_html(client) -> str:
    """Build the 'Bill To' client details block."""
    if not client:
        return "<em>No client specified</em>"
    parts: list[str] = []
    if getattr(client, "company_name", None):
        parts.append(f"<strong>{_esc(client.company_name)}</strong>")
    if getattr(client, "contact_person", None):
        parts.append(_esc(client.contact_person))
    for field in ("address_line1", "city", "postcode", "country"):
        val = getattr(client, field, None)
        if val:
            parts.append(_esc(val))
    if getattr(client, "email", None):
        parts.append(_esc(client.email))
    if getattr(client, "vat_number", None):
        parts.append(f"VAT: {_esc(client.vat_number)}")
    return "<br/>".join(parts)


def _build_items_rows(items, currency: str) -> str:
    """Build table rows for invoice line items."""
    rows: list[str] = []
    sorted_items = sorted(items, key=lambda i: getattr(i, "sort_order", 0) or 0)
    for item in sorted_items:
        desc = _esc(getattr(item, "description", ""))
        qty = getattr(item, "quantity", 0)
        unit = _esc(getattr(item, "unit", "")) if getattr(item, "unit", None) else ""
        unit_price = fmt_currency(getattr(item, "unit_price", 0), currency)
        amount = fmt_currency(getattr(item, "amount", 0), currency)
        qty_display = f"{qty} {unit}".strip() if unit else str(qty)
        rows.append(
            f"<tr>"
            f"<td>{desc}</td>"
            f'<td style="text-align:center;">{qty_display}</td>'
            f'<td style="text-align:right;">{unit_price}</td>'
            f'<td style="text-align:right;">{amount}</td>'
            f"</tr>"
        )
    return "\n".join(rows)


def _build_totals_html(invoice, currency: str) -> str:
    """Build the totals summary section."""
    rows: list[str] = []

    rows.append(
        f'<tr><td style="text-align:right;">Subtotal:</td>'
        f'<td style="text-align:right;">{fmt_currency(invoice.subtotal, currency)}</td></tr>'
    )

    tax_rate = getattr(invoice, "tax_rate", None)
    tax_amount = getattr(invoice, "tax_amount", None)
    if tax_amount and float(tax_amount) > 0:
        label = f"Tax ({tax_rate}%)" if tax_rate else "Tax"
        rows.append(
            f'<tr><td style="text-align:right;">{label}:</td>'
            f'<td style="text-align:right;">{fmt_currency(tax_amount, currency)}</td></tr>'
        )

    discount = getattr(invoice, "discount_amount", None)
    if discount and float(discount) > 0:
        rows.append(
            f'<tr><td style="text-align:right;">Discount:</td>'
            f'<td style="text-align:right;">-{fmt_currency(discount, currency)}</td></tr>'
        )

    rows.append(
        f'<tr style="font-weight:bold; font-size:14px; border-top:2px solid #0F4C5C;">'
        f'<td style="text-align:right; padding-top:8px;">Total:</td>'
        f'<td style="text-align:right; padding-top:8px;">{fmt_currency(invoice.total, currency)}</td></tr>'
    )

    amount_paid = getattr(invoice, "amount_paid", None)
    if amount_paid and float(amount_paid) > 0:
        rows.append(
            f'<tr><td style="text-align:right;">Amount Paid:</td>'
            f'<td style="text-align:right;">{fmt_currency(amount_paid, currency)}</td></tr>'
        )

    balance_due = getattr(invoice, "balance_due", None)
    if balance_due is not None:
        rows.append(
            f'<tr style="font-weight:bold; color:#FF6B6B;">'
            f'<td style="text-align:right;">Balance Due:</td>'
            f'<td style="text-align:right;">{fmt_currency(balance_due, currency)}</td></tr>'
        )

    return "\n".join(rows)


def _build_bank_details_html(company) -> str:
    """Build bank details section if available."""
    if not company:
        return ""
    fields = [
        ("Bank", "bank_name"),
        ("Account Name", "bank_account_name"),
        ("Account Number", "bank_account_number"),
        ("Sort Code", "bank_sort_code"),
    ]
    parts: list[str] = []
    for label, attr in fields:
        val = getattr(company, attr, None)
        if val:
            parts.append(f"<strong>{label}:</strong> {_esc(val)}")
    if not parts:
        return ""
    return (
        '<div style="margin-top:30px; padding:15px; background:#f8f9fa; '
        'border-radius:8px; font-size:12px;">'
        '<div style="font-weight:bold; color:#0F4C5C; margin-bottom:6px; font-size:13px;">Bank Details</div>'
        + "<br/>".join(parts)
        + "</div>"
    )


def _build_paid_stamp(invoice) -> str:
    """Build a 'PAID' stamp overlay if the invoice is paid."""
    status = getattr(invoice, "status", None)
    if status is None:
        return ""
    status_str = status.value if hasattr(status, "value") else str(status)
    if status_str.lower() != "paid":
        return ""
    return (
        '<div style="position:absolute; top:50%; left:50%; transform:translate(-50%,-50%) rotate(-30deg); '
        "font-size:80px; font-weight:bold; color:rgba(40,167,69,0.15); "
        'border:6px solid rgba(40,167,69,0.15); border-radius:20px; padding:10px 40px; '
        'pointer-events:none; z-index:10;">PAID</div>'
    )


def _build_html(invoice, client, company) -> str:
    """Build the complete HTML document for the invoice."""
    currency = getattr(invoice, "currency", "GBP") or "GBP"
    items = getattr(invoice, "items", []) or []

    company_html = _build_company_html(company)
    client_html = _build_client_html(client)
    items_rows = _build_items_rows(items, currency)
    totals_html = _build_totals_html(invoice, currency)
    bank_html = _build_bank_details_html(company)
    paid_stamp = _build_paid_stamp(invoice)

    notes_html = ""
    if getattr(invoice, "notes", None):
        notes_html = (
            '<div style="margin-top:25px; font-size:12px;">'
            '<div style="font-weight:bold; color:#0F4C5C; margin-bottom:4px;">Notes</div>'
            f'<div style="color:#5C677D;">{_esc(invoice.notes)}</div>'
            "</div>"
        )

    terms_html = ""
    if getattr(invoice, "terms", None):
        terms_html = (
            '<div style="margin-top:15px; font-size:12px;">'
            '<div style="font-weight:bold; color:#0F4C5C; margin-bottom:4px;">Terms &amp; Conditions</div>'
            f'<div style="color:#5C677D;">{_esc(invoice.terms)}</div>'
            "</div>"
        )

    payment_method = getattr(invoice, "payment_method", None)
    payment_date = getattr(invoice, "payment_date", None)
    payment_html = ""
    if payment_method:
        pm_str = payment_method.value if hasattr(payment_method, "value") else str(payment_method)
        payment_html += f'<div style="font-size:12px; color:#5C677D; margin-top:6px;">Payment Method: {_esc(pm_str)}</div>'
    if payment_date:
        payment_html += f'<div style="font-size:12px; color:#5C677D;">Payment Date: {_format_date(payment_date)}</div>'

    return f"""<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8"/>
<style>
    @page {{
        size: A4;
        margin: 25mm 20mm 20mm 20mm;
    }}
    body {{
        font-family: Helvetica, Arial, sans-serif;
        font-size: 13px;
        color: #1B263B;
        line-height: 1.5;
        margin: 0;
        padding: 0;
    }}
    .container {{
        position: relative;
    }}
    .header {{
        display: flex;
        justify-content: space-between;
        margin-bottom: 35px;
    }}
    .header-left {{
        max-width: 55%;
    }}
    .header-right {{
        text-align: right;
        max-width: 40%;
    }}
    .invoice-title {{
        font-size: 32px;
        font-weight: bold;
        color: #0F4C5C;
        margin-bottom: 10px;
    }}
    .invoice-meta {{
        font-size: 12px;
        color: #5C677D;
    }}
    .invoice-meta strong {{
        color: #1B263B;
    }}
    .bill-to {{
        margin-bottom: 30px;
    }}
    .bill-to-label {{
        font-size: 11px;
        text-transform: uppercase;
        letter-spacing: 1px;
        color: #5C677D;
        margin-bottom: 6px;
        font-weight: bold;
    }}
    table.items {{
        width: 100%;
        border-collapse: collapse;
        margin-bottom: 20px;
    }}
    table.items thead th {{
        background: #0F4C5C;
        color: white;
        padding: 10px 12px;
        font-size: 12px;
        font-weight: 600;
        text-align: left;
    }}
    table.items thead th:first-child {{
        border-radius: 6px 0 0 0;
    }}
    table.items thead th:last-child {{
        border-radius: 0 6px 0 0;
    }}
    table.items tbody td {{
        padding: 10px 12px;
        border-bottom: 1px solid #e8ecef;
        font-size: 12px;
    }}
    table.items tbody tr:nth-child(even) {{
        background: #f8f9fa;
    }}
    table.totals {{
        margin-left: auto;
        margin-top: 10px;
        font-size: 13px;
    }}
    table.totals td {{
        padding: 4px 12px;
    }}
    .footer {{
        margin-top: 40px;
        padding-top: 15px;
        border-top: 1px solid #e8ecef;
        text-align: center;
        font-size: 10px;
        color: #5C677D;
    }}
</style>
</head>
<body>
<div class="container">
    {paid_stamp}
    <div class="header">
        <div class="header-left">
            {company_html}
        </div>
        <div class="header-right">
            <div class="invoice-title">INVOICE</div>
            <div class="invoice-meta">
                <strong>Invoice #:</strong> {_esc(invoice.invoice_number)}<br/>
                <strong>Issue Date:</strong> {_format_date(getattr(invoice, 'issue_date', None))}<br/>
                <strong>Due Date:</strong> {_format_date(getattr(invoice, 'due_date', None))}
            </div>
        </div>
    </div>

    <div class="bill-to">
        <div class="bill-to-label">Bill To</div>
        {client_html}
    </div>

    <table class="items">
        <thead>
            <tr>
                <th style="width:50%;">Description</th>
                <th style="width:15%; text-align:center;">Qty</th>
                <th style="width:17%; text-align:right;">Unit Price</th>
                <th style="width:18%; text-align:right;">Amount</th>
            </tr>
        </thead>
        <tbody>
            {items_rows}
        </tbody>
    </table>

    <table class="totals">
        {totals_html}
    </table>

    {payment_html}
    {bank_html}
    {notes_html}
    {terms_html}

    <div class="footer">
        Generated by MYNVOICE &mdash; Your business. Your invoices.
    </div>
</div>
</body>
</html>"""


async def generate_invoice_pdf(invoice, client, company) -> bytes:
    """Generate a professional PDF for the given invoice.

    Args:
        invoice: Invoice model instance with items, totals, and metadata.
        client: Client model instance (or None) with billing details.
        company: Company model instance (or None) with sender details.

    Returns:
        The PDF document as raw bytes.
    """
    html_string = _build_html(invoice, client, company)
    pdf_bytes: bytes = HTML(string=html_string).write_pdf()
    return pdf_bytes
