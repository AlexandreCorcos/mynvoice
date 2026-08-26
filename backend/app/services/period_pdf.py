"""PDF export for a closing period — an accountant-ready statement of the
transactions in the window, their reconciliation state, and the totals.

Built with the same WeasyPrint pipeline as the invoice PDF, reusing its
formatting helpers so money and dates render identically.
"""

from __future__ import annotations

from decimal import Decimal

from weasyprint import HTML

from app.services.pdf import _esc, _format_date, fmt_currency

# Brand palette (light only — a document, not the app).
GRAPHITE = "#1C1917"
INK_MUTED = "#6E6862"
LINE = "#E4E0D9"
BRASS = "#8A6A3D"
POSITIVE = "#3F6B4A"
NEGATIVE = "#B4332E"


def _company_name(company) -> str:
    for attr in ("name", "company_name", "trading_name"):
        value = getattr(company, attr, None)
        if value:
            return str(value)
    return "Your business"


async def generate_period_pdf(period, entries, company, currency: str = "GBP") -> bytes:
    income = sum(
        (Decimal(str(e.amount)) for e in entries if e.kind.value == "income"),
        Decimal("0.00"),
    )
    expense = sum(
        (Decimal(str(e.amount)) for e in entries if e.kind.value == "expense"),
        Decimal("0.00"),
    )
    net = income - expense
    reconciled = sum(1 for e in entries if e.reconciled_at is not None)
    total = len(entries)
    is_closed = period.closed_at is not None

    rows = []
    for e in entries:
        is_income = e.kind.value == "income"
        amount = Decimal(str(e.amount))
        colour = POSITIVE if is_income else GRAPHITE
        sign = "+" if is_income else "−"
        tick = "✓" if e.reconciled_at is not None else ""
        rows.append(
            f"<tr>"
            f'<td style="white-space:nowrap;color:{INK_MUTED};">{_format_date(e.expense_date)}</td>'
            f"<td>{_esc(e.description)}</td>"
            f'<td style="color:{INK_MUTED};text-transform:capitalize;">{_esc(e.kind.value)}</td>'
            f'<td style="text-align:center;color:{BRASS};font-weight:700;">{tick}</td>'
            f'<td style="text-align:right;white-space:nowrap;color:{colour};font-weight:700;">'
            f"{sign}{fmt_currency(amount, currency)}</td>"
            f"</tr>"
        )
    rows_html = "".join(rows) or (
        f'<tr><td colspan="5" style="text-align:center;color:{INK_MUTED};'
        f'padding:24px;">No transactions in this window.</td></tr>'
    )

    net_colour = POSITIVE if net >= 0 else NEGATIVE
    net_sign = "+" if net >= 0 else "−"
    status = (
        f"Closed {_format_date(period.closed_at.date())}"
        if is_closed
        else "Open"
    )

    def card(label: str, value: str, colour: str = GRAPHITE) -> str:
        return (
            f'<div class="card">'
            f'<div class="card-label">{label}</div>'
            f'<div class="card-value" style="color:{colour};">{value}</div>'
            f"</div>"
        )

    summary = (
        card("Income", fmt_currency(income, currency), POSITIVE)
        + card("Expense", fmt_currency(expense, currency))
        + card("Net", f"{net_sign}{fmt_currency(abs(net), currency)}", net_colour)
        + card("Reconciled", f"{reconciled} / {total}")
    )

    html_string = f"""
    <html>
    <head><meta charset="utf-8"><style>
      @page {{ size: A4; margin: 20mm; }}
      * {{ box-sizing: border-box; }}
      body {{ font-family: 'Helvetica Neue', Arial, sans-serif; color: {GRAPHITE};
              font-size: 11px; margin: 0; }}
      .head {{ display: flex; justify-content: space-between; align-items: flex-start;
               border-bottom: 2px solid {GRAPHITE}; padding-bottom: 14px; }}
      .biz {{ font-size: 15px; font-weight: 800; }}
      .eyebrow {{ text-transform: uppercase; letter-spacing: .14em; font-size: 9px;
                  color: {BRASS}; font-weight: 700; }}
      .title {{ font-size: 20px; font-weight: 800; margin: 2px 0 0; }}
      .meta {{ color: {INK_MUTED}; font-size: 11px; margin-top: 2px; }}
      .status {{ display: inline-block; margin-top: 6px; padding: 2px 8px; border-radius: 999px;
                 font-size: 10px; font-weight: 700; border: 1px solid {LINE}; color: {INK_MUTED}; }}
      .cards {{ display: flex; gap: 10px; margin: 18px 0 20px; }}
      .card {{ flex: 1; border: 1px solid {LINE}; border-radius: 8px; padding: 10px 12px; }}
      .card-label {{ font-size: 9px; text-transform: uppercase; letter-spacing: .1em;
                     color: {INK_MUTED}; font-weight: 700; }}
      .card-value {{ font-size: 16px; font-weight: 800; margin-top: 4px; }}
      table {{ width: 100%; border-collapse: collapse; }}
      th {{ text-align: left; font-size: 9px; text-transform: uppercase; letter-spacing: .1em;
            color: {INK_MUTED}; border-bottom: 1px solid {LINE}; padding: 6px 8px; }}
      th:last-child {{ text-align: right; }}
      th:nth-child(4) {{ text-align: center; }}
      td {{ padding: 7px 8px; border-bottom: 1px solid {LINE}; }}
      .foot {{ margin-top: 16px; color: {INK_MUTED}; font-size: 10px;
               display: flex; justify-content: space-between; }}
    </style></head>
    <body>
      <div class="head">
        <div>
          <div class="eyebrow">Period report</div>
          <div class="title">{_esc(period.name)}</div>
          <div class="meta">{_format_date(period.start_date)} &ndash; {_format_date(period.end_date)}</div>
          <span class="status">{status}</span>
        </div>
        <div style="text-align:right;">
          <div class="biz">{_esc(_company_name(company))}</div>
        </div>
      </div>

      <div class="cards">{summary}</div>

      <table>
        <thead><tr>
          <th>Date</th><th>Description</th><th>Type</th><th>Ticked</th><th>Amount</th>
        </tr></thead>
        <tbody>{rows_html}</tbody>
      </table>

      <div class="foot">
        <span>{total} transaction{'' if total == 1 else 's'} &middot; {reconciled} reconciled</span>
        <span>Net {net_sign}{fmt_currency(abs(net), currency)}</span>
      </div>
    </body>
    </html>
    """

    pdf_bytes: bytes = HTML(string=html_string).write_pdf()
    return pdf_bytes
