import logging

import aiosmtplib
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from email.mime.application import MIMEApplication

from app.core.config import settings

logger = logging.getLogger(__name__)


def fmt_currency(amount, currency="GBP"):
    symbols = {"GBP": "£", "EUR": "€", "USD": "$"}
    symbol = symbols.get(currency, currency + " ")
    return f"{symbol}{amount:,.2f}"


def _build_html_body(
    invoice_number: str,
    client_name: str,
    total: str,
    due_date: str,
    company_name: str,
) -> str:
    return f"""\
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
</head>
<body style="margin:0;padding:0;font-family:Arial,Helvetica,sans-serif;background:#F0F3F5;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#F0F3F5;padding:32px 0;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;overflow:hidden;">
          <!-- Header -->
          <tr>
            <td style="background:#0F4C5C;padding:28px 32px;">
              <h1 style="margin:0;color:#ffffff;font-size:22px;font-weight:700;">
                Invoice {invoice_number} from {company_name}
              </h1>
            </td>
          </tr>
          <!-- Body -->
          <tr>
            <td style="padding:32px;">
              <p style="margin:0 0 16px;color:#1B263B;font-size:16px;line-height:1.6;">
                Dear {client_name},
              </p>
              <p style="margin:0 0 16px;color:#1B263B;font-size:16px;line-height:1.6;">
                Please find attached invoice <strong>{invoice_number}</strong> for <strong>{total}</strong>.
              </p>
              <p style="margin:0 0 16px;color:#1B263B;font-size:16px;line-height:1.6;">
                Payment is due by <strong>{due_date}</strong>.
              </p>
              <p style="margin:0 0 24px;color:#1B263B;font-size:16px;line-height:1.6;">
                Thank you for your business.
              </p>
              <p style="margin:0;color:#0F4C5C;font-size:16px;font-weight:600;">
                {company_name}
              </p>
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style="padding:16px 32px;border-top:1px solid #e2e8f0;">
              <p style="margin:0;color:#5C677D;font-size:12px;text-align:center;">
                Sent via MYNVOICE
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>"""


async def _send(msg: MIMEMultipart) -> bool:
    if not settings.SMTP_HOST:
        logger.warning("SMTP_HOST is not configured — skipping email send.")
        return False
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


async def send_verification_email(
    to_email: str,
    first_name: str,
    token: str,
) -> bool:
    app_url = "https://app.mynvoice.com"
    link = f"{app_url}/set-password?token={token}"

    html = f"""\
<!DOCTYPE html>
<html>
<head><meta charset="utf-8" /></head>
<body style="margin:0;padding:0;font-family:Arial,Helvetica,sans-serif;background:#F0F3F5;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#F0F3F5;padding:32px 0;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;overflow:hidden;">
          <tr>
            <td style="background:#0F4C5C;padding:28px 32px;">
              <h1 style="margin:0;color:#ffffff;font-size:22px;font-weight:700;">Welcome to MYNVOICE</h1>
            </td>
          </tr>
          <tr>
            <td style="padding:32px;">
              <p style="margin:0 0 16px;color:#1B263B;font-size:16px;line-height:1.6;">Hi {first_name},</p>
              <p style="margin:0 0 24px;color:#1B263B;font-size:16px;line-height:1.6;">
                Your account has been created. Click the button below to set your password and activate your account.
              </p>
              <table cellpadding="0" cellspacing="0" style="margin:0 0 24px;">
                <tr>
                  <td style="background:#E05A2B;border-radius:8px;padding:14px 28px;">
                    <a href="{link}" style="color:#ffffff;font-size:15px;font-weight:700;text-decoration:none;">
                      Set my password
                    </a>
                  </td>
                </tr>
              </table>
              <p style="margin:0 0 8px;color:#5C677D;font-size:13px;">
                This link expires in 24 hours. If you didn't create an account, you can safely ignore this email.
              </p>
            </td>
          </tr>
          <tr>
            <td style="padding:16px 32px;border-top:1px solid #e2e8f0;">
              <p style="margin:0;color:#5C677D;font-size:12px;text-align:center;">Sent via MYNVOICE</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>"""

    msg = MIMEMultipart("alternative")
    msg["From"] = f"{settings.SMTP_FROM_NAME} <{settings.SMTP_FROM_EMAIL}>"
    msg["To"] = to_email
    msg["Subject"] = "Activate your MYNVOICE account"
    msg.attach(MIMEText(html, "html", "utf-8"))

    ok = await _send(msg)
    if ok:
        logger.info("Verification email sent to %s", to_email)
    return ok


async def send_invoice_email(
    to_email: str,
    invoice_number: str,
    client_name: str,
    total: str,
    currency: str,
    due_date: str,
    pdf_bytes: bytes,
    company_name: str = "MYNVOICE",
) -> bool:
    try:
        msg = MIMEMultipart("mixed")
        msg["From"] = f"{settings.SMTP_FROM_NAME} <{settings.SMTP_FROM_EMAIL}>"
        msg["To"] = to_email
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
