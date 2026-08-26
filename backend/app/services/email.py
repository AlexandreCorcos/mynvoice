"""Transactional email.

Every message is built from one shell (`_shell`), so the palette lives in a
single place. Before this there were four hand-written copies of the same
table markup, which is why three of them were still on the retired teal and
orange palette long after the product moved to Graphite & Brass.

Email is not the web, and the constraints drive the markup:

* **Tables and inline styles.** Outlook renders with Word's engine — no flex,
  no grid, and stylesheets are unreliable.
* **No webfonts.** The wordmark is set in the system stack rather than Inter;
  it is the one place the brand's typeface is not available and pretending
  otherwise just produces a fallback nobody chose.
* **No SVG.** So the mark is not drawn here — the wordmark alone carries the
  brand, as text, which every client renders and no client blocks. Remote
  images are blocked by default in most inboxes, so a logo image would leave
  a broken box for a large share of readers.
"""

import json
import logging

import aiosmtplib
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from email.mime.application import MIMEApplication

from app.core.config import settings

logger = logging.getLogger(__name__)

# Graphite & Brass. Literal hex because email has no custom properties.
GRAPHITE = "#1C1917"
SURFACE = "#FAF9F7"
CARD = "#FFFFFF"
ELEVATED = "#F1EFEC"
LINE = "#E4E0D9"
INK = "#1C1917"
INK_MUTED = "#6E6862"
BRASS = "#8A6A3D"  # solid fills — always with white text
BRASS_ON_DARK = "#C79A5B"  # brass on the graphite band
POSITIVE = "#3F6B4A"

FONT = "-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial,Helvetica,sans-serif"


def fmt_currency(amount, currency="GBP"):
    symbols = {"GBP": "£", "EUR": "€", "USD": "$"}
    symbol = symbols.get(currency, currency + " ")
    return f"{symbol}{amount:,.2f}"


def _escape(text: str) -> str:
    """Anything that came from a person before it goes into HTML."""
    return (
        text.replace("&", "&amp;")
        .replace("<", "&lt;")
        .replace(">", "&gt;")
        .replace('"', "&quot;")
    )


def _shell(*, body: str, heading: str = "", preheader: str = "") -> str:
    """The frame every message shares: graphite band, white card, quiet footer.

    `preheader` is the line inboxes show next to the subject. Hidden in the
    body, so without one the preview shows whatever text comes first — usually
    "MYnvoice", which tells the reader nothing.
    """
    heading_html = (
        f'<h1 style="margin:0 0 18px;color:{INK};font-size:22px;font-weight:700;'
        f'line-height:1.3;letter-spacing:-0.01em;">{heading}</h1>'
        if heading
        else ""
    )

    return f"""\
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <meta name="color-scheme" content="light only" />
</head>
<body style="margin:0;padding:0;background:{SURFACE};font-family:{FONT};">
  <div style="display:none;max-height:0;overflow:hidden;opacity:0;">{preheader}</div>

  <table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="background:{SURFACE};">
    <tr>
      <td align="center" style="padding:40px 16px;">
        <!-- width="100%" with a max-width, not width="560": the HTML attribute
             wins over CSS in most mail clients, and a fixed 560 forces a phone
             to scroll sideways. -->
        <table width="100%" cellpadding="0" cellspacing="0" role="presentation"
               style="width:100%;max-width:560px;background:{CARD};border-radius:16px;
                      border:1px solid {LINE};overflow:hidden;">

          <tr>
            <td style="background:{GRAPHITE};padding:22px 36px;">
              <span style="font-size:19px;font-weight:800;letter-spacing:-0.02em;color:{BRASS_ON_DARK};">MY</span><span style="font-size:19px;font-weight:600;letter-spacing:-0.02em;color:#FFFFFF;">nvoice</span>
            </td>
          </tr>

          <tr>
            <td style="padding:34px 36px 30px;">
              {heading_html}
              {body}
            </td>
          </tr>

          <tr>
            <td style="padding:18px 36px;background:{ELEVATED};border-top:1px solid {LINE};">
              <p style="margin:0;color:{INK_MUTED};font-size:12px;line-height:1.6;">
                Sent by <strong style="color:{INK};">MYNVOICE</strong> — your business, your invoices.
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>"""


def _paragraph(text: str, *, muted: bool = False, top: int = 0) -> str:
    colour = INK_MUTED if muted else INK
    size = 13 if muted else 15
    return (
        f'<p style="margin:{top}px 0 16px;color:{colour};font-size:{size}px;'
        f'line-height:1.7;">{text}</p>'
    )


def _button(href: str, label: str) -> str:
    """Solid brass with white text — the design system's primary action.

    Wrapped in its own table because a padded <a> collapses in Outlook.
    """
    return f"""\
<table cellpadding="0" cellspacing="0" role="presentation" style="margin:24px 0;">
  <tr>
    <td style="background:{BRASS};border-radius:10px;">
      <a href="{href}" style="display:inline-block;padding:14px 28px;color:#FFFFFF;
         font-family:{FONT};font-size:15px;font-weight:600;text-decoration:none;">{label}</a>
    </td>
  </tr>
</table>"""


def _fallback_link(href: str) -> str:
    """Some clients strip the button, and some people don't trust one."""
    return (
        f'<p style="margin:0;color:{INK_MUTED};font-size:12px;line-height:1.6;'
        f'word-break:break-all;">Button not working? Paste this into your browser:<br/>'
        f'<a href="{href}" style="color:{BRASS};">{href}</a></p>'
    )


# SendGrid's SMTP relay honours this header per message, overriding the
# account-wide tracking settings — which the owner deliberately keeps ON for
# product mail. Auth mail opts out: click tracking would rewrite the
# set-password / reset links through the tracking subdomain, which copies
# their one-time tokens into SendGrid's click logs, and a password link whose
# URL is anything but app.mynvoice.com reads as phishing. Everything else
# follows the dashboard settings.
_SMTPAPI_NO_TRACKING = json.dumps(
    {
        "filters": {
            "clicktrack": {"settings": {"enable": 0}},
            "opentrack": {"settings": {"enable": 0}},
        }
    }
)


async def _send(msg: MIMEMultipart, *, tracking: bool = True) -> bool:
    if not settings.SMTP_HOST:
        logger.warning("SMTP_HOST is not configured — skipping email send.")
        return False
    if not tracking:
        msg["X-SMTPAPI"] = _SMTPAPI_NO_TRACKING
    try:
        use_tls = settings.SMTP_PORT == 465
        start_tls = settings.SMTP_PORT == 587
        await aiosmtplib.send(
            msg,
            hostname=settings.SMTP_HOST,
            port=settings.SMTP_PORT,
            username=settings.SMTP_USER,
            password=settings.SMTP_PASSWORD,
            use_tls=use_tls,
            start_tls=start_tls,
        )
        return True
    except Exception:
        logger.exception("Failed to send email to %s", msg["To"])
        return False


def _message(to_email: str, subject: str, html: str, text: str) -> MIMEMultipart:
    msg = MIMEMultipart("alternative")
    msg["From"] = f"{settings.SMTP_FROM_NAME} <{settings.SMTP_FROM_EMAIL}>"
    msg["To"] = to_email
    msg["Subject"] = subject
    msg.attach(MIMEText(text, "plain", "utf-8"))
    msg.attach(MIMEText(html, "html", "utf-8"))
    return msg


APP_URL = "https://app.mynvoice.com"


# ------------------------------------------------------------------ welcome


async def send_verification_email(
    to_email: str,
    first_name: str,
    token: str,
) -> bool:
    link = f"{APP_URL}/set-password?token={token}"

    html = _shell(
        heading="Set your password",
        preheader="Your MYNVOICE account is ready — choose a password to get started.",
        body=(
            _paragraph(f"Hi {_escape(first_name)},")
            + _paragraph(
                "Your account is ready. Choose a password and you're in — there's "
                "nothing else to set up."
            )
            + _button(link, "Set my password")
            + _paragraph(
                "The link works for 24 hours. If you didn't sign up, you can ignore "
                "this — no account is active until someone sets a password on it.",
                muted=True,
            )
            + _fallback_link(link)
        ),
    )

    text = (
        f"Hi {first_name},\n\n"
        "Your MYNVOICE account is ready. Choose a password to get started:\n\n"
        f"{link}\n\n"
        "The link works for 24 hours. If you didn't sign up, you can ignore this."
    )

    ok = await _send(
        _message(to_email, "Set your MYNVOICE password", html, text),
        tracking=False,
    )
    if ok:
        logger.info("Verification email sent to %s", to_email)
    return ok


# ----------------------------------------------------------- password reset


async def send_password_reset_email(
    to_email: str,
    first_name: str,
    token: str,
    valid_hours: int = 1,
) -> bool:
    """`valid_hours` matches whatever the caller actually set on the token.

    It used to be hard-coded to "1 hour" in the copy while an admin-triggered
    reset issued a 24-hour token — the mail contradicted the system.
    """
    link = f"{APP_URL}/reset-password?token={token}"
    window = "1 hour" if valid_hours == 1 else f"{valid_hours} hours"

    html = _shell(
        heading="Reset your password",
        preheader=f"Choose a new MYNVOICE password. The link works for {window}.",
        body=(
            _paragraph(f"Hi {_escape(first_name)},")
            + _paragraph("Someone asked to reset the password on your account.")
            + _button(link, "Choose a new password")
            + _paragraph(
                f"The link works for {window} and can only be used once. If this "
                "wasn't you, ignore it — your current password still works and "
                "nothing has changed.",
                muted=True,
            )
            + _fallback_link(link)
        ),
    )

    text = (
        f"Hi {first_name},\n\n"
        "Someone asked to reset the password on your MYNVOICE account:\n\n"
        f"{link}\n\n"
        f"The link works for {window} and can only be used once. If this wasn't "
        "you, ignore it — your current password still works."
    )

    ok = await _send(
        _message(to_email, "Reset your MYNVOICE password", html, text),
        tracking=False,
    )
    if ok:
        logger.info("Password reset email sent to %s", to_email)
    return ok


# ------------------------------------------------------------------ invoice


def _build_html_body(
    invoice_number: str,
    client_name: str,
    total: str,
    due_date: str,
    company_name: str,
) -> str:
    """The invoice mail.

    This one is sent *by* the user to *their* client, so it leads with their
    business, not ours. MYNVOICE appears only in the footer.
    """
    return _shell(
        preheader=f"{invoice_number} from {_escape(company_name)} — {total}, due {due_date}.",
        body=(
            f'<p style="margin:0 0 6px;color:{INK_MUTED};font-size:11px;'
            f'letter-spacing:0.14em;text-transform:uppercase;">Invoice {_escape(invoice_number)}</p>'
            f'<h1 style="margin:0 0 22px;color:{INK};font-size:24px;font-weight:700;'
            f'letter-spacing:-0.015em;">{_escape(company_name)}</h1>'
            # The amount is the one thing the reader is looking for.
            f"""
            <table width="100%" cellpadding="0" cellspacing="0" role="presentation"
                   style="background:{ELEVATED};border-radius:12px;margin:0 0 24px;">
              <tr>
                <td style="padding:22px 24px;">
                  <p style="margin:0 0 4px;color:{INK_MUTED};font-size:11px;
                            letter-spacing:0.14em;text-transform:uppercase;">Amount due</p>
                  <p style="margin:0;color:{INK};font-size:30px;font-weight:800;
                            letter-spacing:-0.02em;line-height:1;">{total}</p>
                  <p style="margin:8px 0 0;color:{INK_MUTED};font-size:13px;">Due {due_date}</p>
                </td>
              </tr>
            </table>"""
            + _paragraph(f"Hi {_escape(client_name)},")
            + _paragraph("Your invoice is attached as a PDF.")
            + _paragraph(
                "Any questions, or something that needs changing — just reply to "
                "this email."
            )
            + f'<p style="margin:22px 0 0;color:{INK};font-size:15px;font-weight:600;">'
            f"{_escape(company_name)}</p>"
        ),
    )


async def send_invoice_email(
    to_email: str,
    invoice_number: str,
    client_name: str,
    total: str,
    currency: str,
    due_date: str,
    pdf_bytes: bytes,
    company_name: str = "MYNVOICE",
    cc_email: str | None = None,
) -> bool:
    try:
        msg = MIMEMultipart("mixed")
        msg["From"] = f"{settings.SMTP_FROM_NAME} <{settings.SMTP_FROM_EMAIL}>"
        msg["To"] = to_email
        if cc_email and cc_email != to_email:
            msg["Cc"] = cc_email
        msg["Subject"] = f"Invoice {invoice_number} from {company_name}"

        html_body = _build_html_body(
            invoice_number=invoice_number,
            client_name=client_name,
            total=total,
            due_date=due_date,
            company_name=company_name,
        )
        msg.attach(MIMEText(html_body, "html", "utf-8"))

        pdf_attachment = MIMEApplication(pdf_bytes, _subtype="pdf")
        pdf_attachment.add_header(
            "Content-Disposition",
            "attachment",
            filename=f"{invoice_number}.pdf",
        )
        msg.attach(pdf_attachment)

        ok = await _send(msg)
        if ok:
            logger.info("Invoice email %s sent to %s", invoice_number, to_email)
        return ok

    except Exception:
        logger.exception("Failed to send invoice email %s to %s", invoice_number, to_email)
        return False


# ----------------------------------------------------------- admin message


async def send_admin_message_email(
    to_email: str,
    first_name: str,
    subject: str,
    body: str,
    from_name: str,
) -> bool:
    """A note from whoever runs MYNVOICE to one of its users.

    Deliberately plain — no heading, no call to action. This is a person
    writing to another person, asking how it's going; dressed as a system
    notification, nobody replies.
    """
    paragraphs = "".join(
        _paragraph(block.replace("\n", "<br/>"))
        for block in _escape(body).split("\n\n")
        if block.strip()
    )

    html = _shell(
        preheader=subject,
        body=(
            _paragraph(f"Hi {_escape(first_name)},")
            + paragraphs
            + f'<p style="margin:26px 0 0;color:{INK_MUTED};font-size:14px;'
            f'line-height:1.7;">— {_escape(from_name)}</p>'
        ),
    )

    text = (
        f"Hi {first_name},\n\n{body}\n\n— {from_name}\n\n"
        "You're getting this because you have a MYNVOICE account. Just reply if "
        "you'd like to talk."
    )

    return await _send(_message(to_email, subject, html, text))
