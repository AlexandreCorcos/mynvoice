# Security

MYNVOICE holds invoices, client details and revenue figures for people who
work for themselves. We would rather hear about a problem from you than from
one of them.

## Reporting

Use **[GitHub private vulnerability reporting](https://github.com/AlexandreCorcos/mynvoice/security/advisories/new)**.
It is private until we publish it, so you can include details safely.

Please don't open a public issue for a vulnerability.

What helps: what you did, what happened, and why it matters. A reproduction —
even a rough one — is worth more than a scanner name.

We aim to acknowledge within a few days. This is a free, open-source project
run by a small number of people, so please allow a reasonable window to fix
before disclosing publicly.

## Scope

In scope: `mynvoice.com`, `app.mynvoice.com`, `api.mynvoice.com`, and this
repository.

Please do not: run denial-of-service or load tests, brute-force credentials or
tokens, access or modify data belonging to accounts that are not yours, or
send unsolicited mail through the app. Create your own account to test with —
signup is free.

Out of scope: findings that only apply to a self-hosted deployment someone has
misconfigured, missing headers with no demonstrated impact, and reports
consisting solely of automated scanner output.

## What we already know

These are known and either accepted or scheduled — please don't spend your
time re-reporting them:

- **The password-reset token travels in the query string.** The links are
  single-use and expire in 24 hours, and `Referrer-Policy` keeps the path out
  of cross-origin referrers.
- **DNS resolves every subdomain of `mynvoice.com`** to an unrelated site.
  Being tightened. The API's CORS allowlist no longer accepts arbitrary
  subdomains.

## How access is granted

There is no admin password. `/sys/ctrl` uses the ordinary login plus an
`is_admin` flag that can only be granted with a shell on the server, and the
actions that are hard to take back additionally require a TOTP code. Reading
this repository grants nothing — that is deliberate, and
[documented](docs/admin-access.md).
