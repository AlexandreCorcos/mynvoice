# Email link tracking

SendGrid click/open tracking is **on** — the owner reads the engagement stats.
Click tracking rewrites every link in outgoing mail through the branded
tracking host `url8280.mynvoice.com` (SendGrid link branding, CNAME →
`sendgrid.net`), which records the click and 302s to the real destination.

Two constraints keep that from breaking. Both have already failed once
(Aug 2026), which is why this file exists.

## 1. The DNS record must stay Proxied, and the zone SSL mode is Full

SendGrid's origin serves `*.sendgrid.net`'s certificate for the branded host —
it never has one for `url8280.mynvoice.com`. What makes HTTPS work is the
Cloudflare proxy (orange cloud): the edge serves the zone's Universal SSL
certificate (`*.mynvoice.com`), and in **Full** mode Cloudflare accepts
SendGrid's mismatched origin certificate.

With the record grey-clouded (DNS only), browsers hit SendGrid directly and
see the mismatched certificate. The zone sends
`Strict-Transport-Security: … includeSubDomains`, so Chrome doesn't offer a
"proceed anyway" — it shows the full-screen interstitial with no bypass.
New users read that as phishing and stopped signing up; that was the
Aug 2026 incident.

Consequences:

- **Never flip `url8280` back to DNS only.**
- **Never harden the zone to Full (strict)** without first scoping a
  Configuration Rule (When: hostname equals `url8280.mynvoice.com` → SSL:
  Full). Strict validates the origin certificate's hostname, SendGrid's can't
  match, and every tracked link becomes a Cloudflare 526 page.

## 2. Auth mail opts out of tracking per message

The set-password and reset-password links must not run through the tracker:
the rewrite copies their one-time tokens into SendGrid's click logs, and a
password email whose link is anything but `app.mynvoice.com` reads as
phishing. Those two senders call `_send(..., tracking=False)` in
`app/services/email.py`, which sets an `X-SMTPAPI` header disabling click and
open tracking for that message regardless of the dashboard settings. Product
mail (invoices, admin notes) follows the dashboard.

## Checking it still works

```bash
curl -sI https://url8280.mynvoice.com
```

must succeed with a valid certificate (no `-k`), and any
`https://url8280.mynvoice.com/ls/click?...` URL from a real email must answer
`302` with a `Location` on the real destination. If instead you see a
certificate error, the record has gone grey; if you see a 526, the zone (or a
rule) has gone strict.
