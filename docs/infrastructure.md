# MYNVOICE — Infrastructure & Deployment Guide

## Project Overview

MYNVOICE is an invoice management SaaS with the following services:

| Service | Stack | Domain |
|---------|-------|--------|
| Frontend | Next.js 15 (standalone) | `app.mynvoice.com` |
| Backend | Python FastAPI | `api.mynvoice.com` |
| Database | PostgreSQL 16 | Internal only |
| File Storage | Cloudflare R2 | `storage.mynvoice.com` |

**Repository:** `https://github.com/AlexandreCorcos/mynvoice.git` (branch: `main`)

> `www.mynvoice.com` is a separate marketing website — NOT part of this deployment.

---

## Infrastructure

### Hosting — Coolify
The app is deployed via **Coolify** as a Docker Compose stack using `docker-compose.prod.yml`.

- Auto-deploy is configured via **GitHub webhook** — every push to `main` triggers a deploy automatically.
- To manually redeploy: Coolify dashboard → MYNVOICE resource → **Deploy**

### DNS — Cloudflare
All DNS is managed in Cloudflare.

> **Every hostname is proxied through Cloudflare** — `mynvoice.com`, `www`,
> `app`, `api`, and anything the wildcard catches all answer with
> `server: cloudflare` and a `cf-ray`. This page previously said `api` and
> `app` were DNS-only; they are not, and the difference is load-bearing:
> Cloudflare terminates TLS, sets the security headers (HSTS included), and is
> the only reliable source of the client's address — `CF-Connecting-IP`, not
> the last `X-Forwarded-For` entry, which is Cloudflare's own edge.

| Type | Name | Points to | Proxy |
|------|------|-----------|-------|
| A | `app` | Server IP | Proxied |
| A | `api` | Server IP | Proxied |
| CNAME | `storage` | R2 bucket | Proxied (Cloudflare) |

### File Storage — Cloudflare R2
Files (company logos, etc.) are stored in Cloudflare R2 — not on the server disk.

| Setting | Value |
|---------|-------|
| Bucket name | `mynvoice` |
| Region | Western Europe (WEUR) |
| S3 API endpoint | `https://<ACCOUNT_ID>.r2.cloudflarestorage.com` |
| Account ID | See Coolify env vars |
| Public URL | `https://storage.mynvoice.com` |

> **Credentials:** Stored in Coolify env vars (`R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`). Never commit to the repo.

### Email — SendGrid (SMTP)
Transactional emails (email verification, invoice sending) use SendGrid via SMTP.

| Setting | Value |
|---------|-------|
| SMTP Host | `smtp.sendgrid.net` |
| SMTP Port | `587` |
| SMTP User | `apikey` (literal string) |
| From email | `invoice@mynvoice.com` |

> **API Key:** Stored in Coolify as `SMTP_PASSWORD`. Never commit to the repo.

---

## Coolify Environment Variables

All variables below must be set in the Coolify resource's **Environment Variables** section:

```env
# Database
DB_USER=mynvoice
DB_PASSWORD=<strong random password>
DB_NAME=mynvoice

# Backend Auth
SECRET_KEY=<strong random secret — openssl rand -hex 64>

# Email (SendGrid)
SMTP_HOST=smtp.sendgrid.net
SMTP_PORT=587
SMTP_USER=apikey
SMTP_PASSWORD=<SendGrid API Key>
SMTP_FROM_EMAIL=invoice@mynvoice.com
SMTP_FROM_NAME=MYNVOICE

# Cloudflare R2
R2_ACCOUNT_ID=<Cloudflare Account ID>
R2_ACCESS_KEY_ID=<R2 Access Key ID>
R2_SECRET_ACCESS_KEY=<R2 Secret Access Key>
R2_BUCKET=mynvoice
R2_PUBLIC_URL=https://storage.mynvoice.com
```

---

## First Deploy Setup

### 1. Create the Project in Coolify
1. **Projects** → **Add New Project** → Name: `MYNVOICE`
2. **Add New Resource** → **Docker Compose**
3. Source: GitHub → `https://github.com/AlexandreCorcos/mynvoice.git` → branch `main`
4. Docker Compose file: `docker-compose.prod.yml`

### 2. Set Environment Variables
Add all variables from the section above.

### 3. Configure Domains
- `backend` service → domain `api.mynvoice.com`, port `8000`
- `frontend` service → domain `app.mynvoice.com`, port `3000`

### 4. Configure Webhook (auto-deploy)
In the Coolify resource → **Webhooks** → copy the webhook URL → add to GitHub:
- `github.com/AlexandreCorcos/mynvoice` → Settings → Webhooks → Add webhook
- Content type: `application/json` — Event: **Just the push event**

### 5. Deploy
Click **Deploy**. First deploy takes ~5 minutes. Subsequent deploys are faster due to layer caching.

The backend entrypoint automatically runs `alembic upgrade head` on startup — migrations apply automatically.

---

## Creating the First Admin User

After first deploy, create and promote the admin user:

```bash
# 1. Register (new flow — no password at registration, email verification required)
curl -X POST https://api.mynvoice.com/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@mynvoice.com","first_name":"Admin","last_name":"User"}'

# 2. Check the email inbox for the verification link, set the password

# 3. Promote to admin — on the server, which is the only place it can happen
docker compose exec backend python -m app.cli grant-admin admin@mynvoice.com
```

`list-admins` shows who has admin and who has two-factor set up; `revoke-admin`
takes it away, and refuses to remove the last admin.

---

## Admin Panel

`/sys/ctrl`, for users with `is_admin = true`. Shows who is signed up, what each
account has built, who is online right now, the audit trail of admin actions,
and donation progress. `/admin` redirects here.

Granting admin, deactivating an account and forcing a password reset each need a
TOTP step-up; one code unlocks them for five minutes. Full detail in
`docs/admin-access.md`.

---

## Architecture

### Deployment Flow
```
git push → GitHub → Webhook → Coolify → Docker build → Deploy
```

### Services
| Container | Image | Port | Notes |
|-----------|-------|------|-------|
| `mynvoice-db` | postgres:16-alpine | 5432 (internal) | Data in `postgres_data` volume |
| `mynvoice-backend` | Custom (python:3.13-slim) | 8000 | FastAPI + Uvicorn |
| `mynvoice-frontend` | Custom (node:20-alpine) | 3000 | Next.js standalone |

### User Registration Flow
1. User fills name + email → backend sends verification email via SendGrid
2. User clicks link → `app.mynvoice.com/auth/set-password?token=xxx`
3. User sets password → account activated → logged in
4. Verification token expires after 24 hours

---

## Volumes

| Volume | Purpose | Critical |
|--------|---------|---------|
| `postgres_data` | All database data | YES — do not delete |

> File uploads are on R2 (no local volume needed anymore).

---

## Verification

```bash
# API health check
curl https://api.mynvoice.com/health
# Expected: {"status":"healthy","app":"MYNVOICE"}

# Check containers
docker ps | grep mynvoice
```

---

## Troubleshooting

**Backend won't start**
```bash
docker logs mynvoice-backend
```
Common causes: DB not ready, migration error, missing env var.

**Emails not sending**
- Check `SMTP_PASSWORD` (SendGrid API key) is set correctly in Coolify
- Verify `invoice@mynvoice.com` is verified as a sender in SendGrid

**File uploads failing**
- Check R2 credentials in Coolify (`R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`)
- Verify the bucket `mynvoice` exists and the API token has Read & Write permissions

**Frontend blank page / API errors**
- `NEXT_PUBLIC_API_URL` is baked in at build time — if changed, must rebuild frontend
- Check browser console for CORS or network errors

**SSL issues**
- Both hostnames are proxied, so Cloudflare terminates TLS at the edge. The
  origin certificate still has to be valid for Cloudflare to trust it — check
  the SSL/TLS mode is **Full (strict)**, not Flexible.
- Wait 2-3 minutes after first deploy for Let's Encrypt to issue certificates

---

## Backup

Daily database backup (run on the server):

```bash
cat > /opt/mynvoice-backup.sh << 'SCRIPT'
#!/bin/bash
BACKUP_DIR="/opt/backups/mynvoice"
mkdir -p $BACKUP_DIR
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
docker exec mynvoice-db pg_dump -U mynvoice mynvoice | gzip > "$BACKUP_DIR/db_$TIMESTAMP.sql.gz"
find $BACKUP_DIR -name "db_*.sql.gz" -mtime +30 -delete
SCRIPT

chmod +x /opt/mynvoice-backup.sh
(crontab -l 2>/dev/null; echo "0 3 * * * /opt/mynvoice-backup.sh") | crontab -
```

---

## Security Notes

- Never expose port `5432` to the internet
- `DB_PASSWORD`, `SECRET_KEY`, `SMTP_PASSWORD`, `R2_SECRET_ACCESS_KEY` must be kept secret
- `DEBUG` must be `false` in production
- File uploads are limited to 5MB, images only
- JWT access tokens expire after 30 minutes, refresh tokens after 7 days
- `/sys/ctrl` has no password of its own. It uses the ordinary login plus
  `is_admin`, granted only on the server. The panel used to accept an hourly
  token derived from the date — that is removed; see `docs/admin-access.md`
- Destructive admin actions need a TOTP code from the admin's authenticator.
  A lost authenticator is cleared server-side only:
  `docker compose exec backend python -m app.cli reset-totp <email>`
