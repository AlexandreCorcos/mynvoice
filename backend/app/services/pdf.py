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


def _build_html_minimal(invoice, client, company) -> str:
    """Minimal template: clean typography, no colored backgrounds, thin lines."""
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
            '<div class="section">'
            '<div class="section-label">Notes</div>'
            f'<div class="section-body">{_esc(invoice.notes)}</div>'
            "</div>"
        )

    terms_html = ""
    if getattr(invoice, "terms", None):
        terms_html = (
            '<div class="section">'
            '<div class="section-label">Terms &amp; Conditions</div>'
            f'<div class="section-body">{_esc(invoice.terms)}</div>'
            "</div>"
        )

    payment_html = ""
    payment_method = getattr(invoice, "payment_method", None)
    payment_date = getattr(invoice, "payment_date", None)
    if payment_method:
        pm_str = payment_method.value if hasattr(payment_method, "value") else str(payment_method)
        payment_html += f'<div class="meta-line">Payment Method: {_esc(pm_str)}</div>'
    if payment_date:
        payment_html += f'<div class="meta-line">Payment Date: {_format_date(payment_date)}</div>'

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
        font-size: 12px;
        color: #1B263B;
        line-height: 1.6;
        margin: 0;
        padding: 0;
    }}
    .container {{ position: relative; }}
    .top-bar {{
        display: flex;
        justify-content: space-between;
        align-items: flex-end;
        padding-bottom: 20px;
        border-bottom: 2px solid #1B263B;
        margin-bottom: 30px;
    }}
    .company-name {{
        font-size: 22px;
        font-weight: bold;
        color: #1B263B;
    }}
    .company-sub {{
        font-size: 11px;
        color: #5C677D;
        margin-top: 4px;
    }}
    .invoice-title {{
        font-size: 36px;
        font-weight: 300;
        color: #5C677D;
        letter-spacing: 4px;
        text-transform: uppercase;
    }}
    .meta-grid {{
        display: flex;
        justify-content: space-between;
        margin-bottom: 35px;
    }}
    .meta-block {{
        min-width: 45%;
    }}
    .meta-label {{
        font-size: 9px;
        text-transform: uppercase;
        letter-spacing: 1.5px;
        color: #5C677D;
        margin-bottom: 6px;
        font-weight: bold;
    }}
    .meta-value {{
        font-size: 12px;
        color: #1B263B;
        line-height: 1.7;
    }}
    .meta-row {{
        display: flex;
        gap: 40px;
        margin-bottom: 6px;
    }}
    .meta-item {{
        min-width: 120px;
    }}
    .meta-item .meta-label {{ margin-bottom: 2px; }}
    table.items {{
        width: 100%;
        border-collapse: collapse;
        margin-bottom: 10px;
    }}
    table.items thead th {{
        font-size: 9px;
        text-transform: uppercase;
        letter-spacing: 1px;
        color: #5C677D;
        font-weight: bold;
        padding: 8px 0;
        border-bottom: 1px solid #1B263B;
        text-align: left;
    }}
    table.items thead th.right {{ text-align: right; }}
    table.items thead th.center {{ text-align: center; }}
    table.items tbody td {{
        padding: 10px 0;
        border-bottom: 1px solid #e8ecef;
        font-size: 12px;
        color: #1B263B;
    }}
    .totals-wrapper {{
        display: flex;
        justify-content: flex-end;
        margin-top: 10px;
    }}
    table.totals {{ font-size: 12px; }}
    table.totals td {{ padding: 4px 0 4px 40px; }}
    table.totals td:last-child {{ text-align: right; }}
    .section {{
        margin-top: 25px;
    }}
    .section-label {{
        font-size: 9px;
        text-transform: uppercase;
        letter-spacing: 1px;
        color: #5C677D;
        font-weight: bold;
        margin-bottom: 4px;
    }}
    .section-body {{
        font-size: 11px;
        color: #5C677D;
    }}
    .meta-line {{
        font-size: 11px;
        color: #5C677D;
        margin-top: 4px;
    }}
    .footer {{
        margin-top: 50px;
        padding-top: 12px;
        border-top: 1px solid #e8ecef;
        text-align: center;
        font-size: 9px;
        color: #5C677D;
        letter-spacing: 1px;
        text-transform: uppercase;
    }}
</style>
</head>
<body>
<div class="container">
    {paid_stamp}

    <div class="top-bar">
        <div>
            <div class="company-name">{_esc(getattr(company, "legal_name", None) or getattr(company, "name", "") if company else "")}</div>
            <div class="company-sub">{_esc(getattr(company, "email", "") if company else "")}</div>
        </div>
        <div class="invoice-title">Invoice</div>
    </div>

    <div class="meta-grid">
        <div class="meta-block">
            <div class="meta-label">Bill To</div>
            <div class="meta-value">{client_html}</div>
        </div>
        <div>
            <div class="meta-row">
                <div class="meta-item">
                    <div class="meta-label">Invoice No.</div>
                    <div class="meta-value">{_esc(invoice.invoice_number)}</div>
                </div>
                <div class="meta-item">
                    <div class="meta-label">Issue Date</div>
                    <div class="meta-value">{_format_date(getattr(invoice, "issue_date", None))}</div>
                </div>
                <div class="meta-item">
                    <div class="meta-label">Due Date</div>
                    <div class="meta-value">{_format_date(getattr(invoice, "due_date", None))}</div>
                </div>
            </div>
        </div>
    </div>

    <table class="items">
        <thead>
            <tr>
                <th style="width:50%;">Description</th>
                <th class="center" style="width:15%;">Qty</th>
                <th class="right" style="width:17%;">Unit Price</th>
                <th class="right" style="width:18%;">Amount</th>
            </tr>
        </thead>
        <tbody>
            {items_rows}
        </tbody>
    </table>

    <div class="totals-wrapper">
        <table class="totals">
            {totals_html}
        </table>
    </div>

    {payment_html}
    {bank_html}
    {notes_html}
    {terms_html}

    <div class="footer">Generated by MYNVOICE &mdash; Your business. Your invoices.</div>
</div>
</body>
</html>"""


def _build_html_bold(invoice, client, company) -> str:
    """Bold/Corporate template: full-width header, accent boxes, strong typography."""
    currency = getattr(invoice, "currency", "GBP") or "GBP"
    items = getattr(invoice, "items", []) or []

    brand = getattr(company, "brand_colour", None) if company else None
    accent = brand if brand else "#0F4C5C"

    items_rows = _build_items_rows(items, currency)
    bank_html = _build_bank_details_html(company)
    paid_stamp = _build_paid_stamp(invoice)

    # Company details for header (inline, no <br/> based helper)
    company_name = _esc(getattr(company, "legal_name", None) or getattr(company, "name", "") if company else "")
    company_address_parts = []
    if company:
        for f in ("address_line1", "city", "postcode"):
            v = getattr(company, f, None)
            if v:
                company_address_parts.append(_esc(v))
        if getattr(company, "email", None):
            company_address_parts.append(_esc(company.email))
        if getattr(company, "vat_number", None):
            company_address_parts.append(f"VAT: {_esc(company.vat_number)}")
    company_sub = "  &bull;  ".join(company_address_parts)

    logo_html = _build_logo_html(company)

    # Client details
    client_lines = []
    if client:
        if getattr(client, "company_name", None):
            client_lines.append(f"<strong>{_esc(client.company_name)}</strong>")
        if getattr(client, "contact_person", None):
            client_lines.append(_esc(client.contact_person))
        for f in ("address_line1", "city", "postcode"):
            v = getattr(client, f, None)
            if v:
                client_lines.append(_esc(v))
        if getattr(client, "email", None):
            client_lines.append(_esc(client.email))
    client_html = "<br/>".join(client_lines) if client_lines else "<em>No client specified</em>"

    # Totals rows
    totals_rows = []
    totals_rows.append(
        f'<tr><td>Subtotal</td><td>{fmt_currency(invoice.subtotal, currency)}</td></tr>'
    )
    tax_rate = getattr(invoice, "tax_rate", None)
    tax_amount = getattr(invoice, "tax_amount", None)
    if tax_amount and float(tax_amount) > 0:
        label = f"Tax ({tax_rate}%)" if tax_rate else "Tax"
        totals_rows.append(f'<tr><td>{label}</td><td>{fmt_currency(tax_amount, currency)}</td></tr>')
    discount = getattr(invoice, "discount_amount", None)
    if discount and float(discount) > 0:
        totals_rows.append(f'<tr><td>Discount</td><td>-{fmt_currency(discount, currency)}</td></tr>')
    amount_paid = getattr(invoice, "amount_paid", None)
    if amount_paid and float(amount_paid) > 0:
        totals_rows.append(f'<tr><td>Amount Paid</td><td>{fmt_currency(amount_paid, currency)}</td></tr>')
    totals_inner = "\n".join(totals_rows)

    balance_due = getattr(invoice, "balance_due", None)
    balance_html = ""
    if balance_due is not None:
        balance_html = f"""
        <div class="balance-box">
            <div class="balance-label">Balance Due</div>
            <div class="balance-amount">{fmt_currency(balance_due, currency)}</div>
        </div>"""

    notes_html = ""
    if getattr(invoice, "notes", None):
        notes_html = f"""
        <div class="info-block">
            <div class="info-label">Notes</div>
            <div class="info-body">{_esc(invoice.notes)}</div>
        </div>"""

    terms_html = ""
    if getattr(invoice, "terms", None):
        terms_html = f"""
        <div class="info-block">
            <div class="info-label">Terms &amp; Conditions</div>
            <div class="info-body">{_esc(invoice.terms)}</div>
        </div>"""

    payment_html = ""
    payment_method = getattr(invoice, "payment_method", None)
    payment_date = getattr(invoice, "payment_date", None)
    if payment_method or payment_date:
        pm_str = ""
        if payment_method:
            pm_str = payment_method.value if hasattr(payment_method, "value") else str(payment_method)
        payment_html = f"""
        <div class="info-block">
            <div class="info-label">Payment Details</div>
            {"<div class='info-body'>Method: " + _esc(pm_str) + "</div>" if pm_str else ""}
            {"<div class='info-body'>Date: " + _format_date(payment_date) + "</div>" if payment_date else ""}
        </div>"""

    return f"""<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8"/>
<style>
    @page {{
        size: A4;
        margin: 0 0 15mm 0;
    }}
    body {{
        font-family: Helvetica, Arial, sans-serif;
        font-size: 12px;
        color: #1B263B;
        line-height: 1.5;
        margin: 0;
        padding: 0;
    }}
    .container {{ position: relative; }}

    /* Full-width header */
    .header {{
        background: {accent};
        color: white;
        padding: 30px 20mm;
        display: flex;
        justify-content: space-between;
        align-items: center;
    }}
    .header-company {{
        max-width: 55%;
    }}
    .header-company-name {{
        font-size: 22px;
        font-weight: bold;
        margin-bottom: 4px;
    }}
    .header-company-sub {{
        font-size: 10px;
        opacity: 0.75;
    }}
    .header-invoice {{
        text-align: right;
    }}
    .header-invoice-title {{
        font-size: 30px;
        font-weight: bold;
        letter-spacing: 3px;
        text-transform: uppercase;
        opacity: 0.9;
    }}
    .header-invoice-number {{
        font-size: 14px;
        margin-top: 4px;
        opacity: 0.85;
    }}

    /* Body area */
    .body {{ padding: 30px 20mm 0 20mm; }}

    /* Bill-to + dates row */
    .info-row {{
        display: flex;
        justify-content: space-between;
        margin-bottom: 30px;
    }}
    .bill-to-box {{
        background: #f0f3f5;
        border-radius: 8px;
        padding: 16px 20px;
        min-width: 45%;
        max-width: 50%;
        font-size: 12px;
    }}
    .bill-to-label {{
        font-size: 9px;
        text-transform: uppercase;
        letter-spacing: 1.5px;
        color: #5C677D;
        font-weight: bold;
        margin-bottom: 8px;
    }}
    .dates-col {{
        text-align: right;
    }}
    .date-item {{
        margin-bottom: 8px;
    }}
    .date-label {{
        font-size: 9px;
        text-transform: uppercase;
        letter-spacing: 1px;
        color: #5C677D;
        font-weight: bold;
        margin-bottom: 2px;
    }}
    .date-value {{
        font-size: 13px;
        font-weight: bold;
        color: #1B263B;
    }}

    /* Items table */
    table.items {{
        width: 100%;
        border-collapse: collapse;
        margin-bottom: 20px;
    }}
    table.items thead th {{
        background: #1B263B;
        color: white;
        padding: 10px 12px;
        font-size: 11px;
        font-weight: 600;
        text-align: left;
        letter-spacing: 0.5px;
    }}
    table.items thead th.right {{ text-align: right; }}
    table.items thead th.center {{ text-align: center; }}
    table.items thead th:first-child {{ border-radius: 6px 0 0 0; }}
    table.items thead th:last-child {{ border-radius: 0 6px 0 0; }}
    table.items tbody td {{
        padding: 10px 12px;
        border-bottom: 1px solid #e8ecef;
        font-size: 12px;
    }}
    table.items tbody tr:nth-child(even) {{ background: #f8f9fa; }}

    /* Totals area */
    .totals-area {{
        display: flex;
        justify-content: flex-end;
        align-items: flex-start;
        gap: 20px;
        margin-bottom: 20px;
    }}
    table.totals {{
        font-size: 12px;
        min-width: 220px;
    }}
    table.totals td {{
        padding: 5px 10px;
        color: #5C677D;
    }}
    table.totals td:last-child {{ text-align: right; color: #1B263B; }}
    .balance-box {{
        background: {accent};
        color: white;
        border-radius: 8px;
        padding: 16px 24px;
        text-align: right;
        min-width: 160px;
    }}
    .balance-label {{
        font-size: 10px;
        text-transform: uppercase;
        letter-spacing: 1px;
        opacity: 0.8;
        margin-bottom: 4px;
    }}
    .balance-amount {{
        font-size: 24px;
        font-weight: bold;
    }}

    /* Info blocks */
    .info-block {{
        margin-top: 20px;
        padding: 14px 16px;
        background: #f8f9fa;
        border-left: 3px solid {accent};
        border-radius: 0 6px 6px 0;
        font-size: 12px;
    }}
    .info-label {{
        font-size: 9px;
        text-transform: uppercase;
        letter-spacing: 1px;
        color: #5C677D;
        font-weight: bold;
        margin-bottom: 4px;
    }}
    .info-body {{ color: #5C677D; }}

    .footer {{
        margin-top: 40px;
        padding: 12px 20mm 0 20mm;
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
        <div class="header-company">
            {logo_html}
            <div class="header-company-name">{company_name}</div>
            <div class="header-company-sub">{company_sub}</div>
        </div>
        <div class="header-invoice">
            <div class="header-invoice-title">Invoice</div>
            <div class="header-invoice-number"># {_esc(invoice.invoice_number)}</div>
        </div>
    </div>

    <div class="body">
        <div class="info-row">
            <div class="bill-to-box">
                <div class="bill-to-label">Bill To</div>
                {client_html}
            </div>
            <div class="dates-col">
                <div class="date-item">
                    <div class="date-label">Issue Date</div>
                    <div class="date-value">{_format_date(getattr(invoice, "issue_date", None))}</div>
                </div>
                <div class="date-item">
                    <div class="date-label">Due Date</div>
                    <div class="date-value">{_format_date(getattr(invoice, "due_date", None))}</div>
                </div>
            </div>
        </div>

        <table class="items">
            <thead>
                <tr>
                    <th style="width:50%;">Description</th>
                    <th class="center" style="width:15%;">Qty</th>
                    <th class="right" style="width:17%;">Unit Price</th>
                    <th class="right" style="width:18%;">Amount</th>
                </tr>
            </thead>
            <tbody>
                {items_rows}
            </tbody>
        </table>

        <div class="totals-area">
            <table class="totals">
                {totals_inner}
            </table>
            {balance_html}
        </div>

        {payment_html}
        {bank_html}
        {notes_html}
        {terms_html}

        <div class="footer">Generated by MYNVOICE &mdash; Your business. Your invoices.</div>
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
    template = getattr(invoice, "pdf_template", "classic") or "classic"

    if template == "minimal":
        html_string = _build_html_minimal(invoice, client, company)
    elif template == "bold":
        html_string = _build_html_bold(invoice, client, company)
    else:
        html_string = _build_html(invoice, client, company)

    pdf_bytes: bytes = HTML(string=html_string).write_pdf()
    return pdf_bytes
