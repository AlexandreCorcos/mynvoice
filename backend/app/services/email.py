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
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
</head>
<body style="margin:0;padding:0;font-family:Arial,Helvetica,sans-serif;background:#F0F3F5;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#F0F3F5;padding:40px 16px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(15,76,92,0.08);">

          <!-- Header -->
          <tr>
            <td style="background:linear-gradient(135deg,#0F4C5C 0%,#2C7A7B 100%);padding:36px 40px 32px;">
              <p style="margin:0 0 6px;color:rgba(255,255,255,0.65);font-size:12px;letter-spacing:2px;text-transform:uppercase;">Invoice from</p>
              <h1 style="margin:0 0 4px;color:#ffffff;font-size:26px;font-weight:700;line-height:1.2;">{company_name}</h1>
              <p style="margin:0;color:rgba(255,255,255,0.6);font-size:13px;">{invoice_number}</p>
            </td>
          </tr>

          <!-- Amount highlight -->
          <tr>
            <td style="background:#0F4C5C;padding:0 40px 28px;">
              <table cellpadding="0" cellspacing="0" style="background:rgba(255,255,255,0.08);border-radius:12px;width:100%;">
                <tr>
                  <td style="padding:20px 24px;">
                    <p style="margin:0 0 4px;color:rgba(255,255,255,0.6);font-size:12px;letter-spacing:1px;text-transform:uppercase;">Amount due</p>
                    <p style="margin:0;color:#ffffff;font-size:32px;font-weight:700;line-height:1;">{total}</p>
                    <p style="margin:6px 0 0;color:rgba(255,255,255,0.55);font-size:13px;">Payment due by {due_date}</p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding:36px 40px 28px;">
              <p style="margin:0 0 20px;color:#1B263B;font-size:16px;line-height:1.7;">
                Hi {client_name},
              </p>
              <p style="margin:0 0 20px;color:#1B263B;font-size:16px;line-height:1.7;">
                Hope you're doing well! Please find your invoice attached to this email.
                The full details are in the PDF, but here's a quick summary:
              </p>

              <!-- Summary box -->
              <table cellpadding="0" cellspacing="0" style="width:100%;background:#F0F3F5;border-radius:10px;margin:0 0 24px;">
                <tr>
                  <td style="padding:20px 24px;">
                    <table width="100%" cellpadding="0" cellspacing="0">
                      <tr>
                        <td style="color:#5C677D;font-size:13px;padding-bottom:10px;">Invoice number</td>
                        <td style="color:#1B263B;font-size:13px;font-weight:600;text-align:right;padding-bottom:10px;">{invoice_number}</td>
                      </tr>
                      <tr>
                        <td style="color:#5C677D;font-size:13px;padding-bottom:10px;">Amount</td>
                        <td style="color:#1B263B;font-size:13px;font-weight:600;text-align:right;padding-bottom:10px;">{total}</td>
                      </tr>
                      <tr>
                        <td style="color:#5C677D;font-size:13px;">Due date</td>
                        <td style="color:#1B263B;font-size:13px;font-weight:600;text-align:right;">{due_date}</td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>

              <p style="margin:0 0 28px;color:#1B263B;font-size:16px;line-height:1.7;">
                If you have any questions about this invoice or need anything adjusted,
                just reply to this email — happy to help.
              </p>

              <p style="margin:0 0 4px;color:#1B263B;font-size:16px;line-height:1.7;">
                Thank you for your continued trust — it means a lot! 🙏
              </p>

              <p style="margin:24px 0 0;color:#0F4C5C;font-size:15px;font-weight:700;">
                {company_name}
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding:20px 40px;background:#F8FAFB;border-top:1px solid #e8edf2;">
              <p style="margin:0;color:#5C677D;font-size:12px;text-align:center;line-height:1.6;">
                This invoice was sent via <strong>MYNVOICE</strong> · Your business. Your invoices.<br/>
                If you believe this was sent in error, please ignore this email.
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


async def send_password_reset_email(
    to_email: str,
    first_name: str,
    token: str,
) -> bool:
    app_url = "https://app.mynvoice.com"
    link = f"{app_url}/reset-password?token={token}"

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
              <h1 style="margin:0;color:#ffffff;font-size:22px;font-weight:700;">Reset your password</h1>
            </td>
          </tr>
          <tr>
            <td style="padding:32px;">
              <p style="margin:0 0 16px;color:#1B263B;font-size:16px;line-height:1.6;">Hi {first_name},</p>
              <p style="margin:0 0 24px;color:#1B263B;font-size:16px;line-height:1.6;">
                We received a request to reset your MYNVOICE password. Click the button below to choose a new one.
              </p>
              <table cellpadding="0" cellspacing="0" style="margin:0 0 24px;">
                <tr>
                  <td style="background:#E05A2B;border-radius:8px;padding:14px 28px;">
                    <a href="{link}" style="color:#ffffff;font-size:15px;font-weight:700;text-decoration:none;">
                      Reset my password
                    </a>
                  </td>
                </tr>
              </table>
              <p style="margin:0 0 8px;color:#5C677D;font-size:13px;">
                This link expires in 1 hour. If you didn&apos;t request a password reset, you can safely ignore this email.
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
    msg["Subject"] = "Reset your MYNVOICE password"
    msg.attach(MIMEText(html, "html", "utf-8"))

    ok = await _send(msg)
    if ok:
        logger.info("Password reset email sent to %s", to_email)
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
