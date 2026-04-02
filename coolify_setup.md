# MYNVOICE — Coolify Deployment Guide

You are configuring Coolify to deploy the MYNVOICE application. Follow these instructions exactly.

## Project Overview

MYNVOICE is an invoice management system with 3 services:
- **Frontend** — Next.js 15 (standalone output) → `app.mynvoice.com`
- **Backend** — Python FastAPI → `api.mynvoice.com`
- **Database** — PostgreSQL 16

The source code is at: `https://github.com/AlexandreCorcos/mynvoice.git` (branch: `main`)

**Important:** `www.mynvoice.com` is a separate marketing website and is NOT part of this deployment. Do not configure it here.

---

## Deployment Strategy

Deploy as **Docker Compose** using the file `docker-compose.prod.yml` in the repository root. This is the simplest approach as it handles all 3 services, networking, health checks, and volumes in one resource.

---

## Step-by-Step Coolify Configuration

### 1. Create the Project

1. Go to Coolify dashboard → **Projects** → **Add New Project**
2. Name: `MYNVOICE`
3. Description: `Invoice management system`

### 2. Add a Docker Compose Resource

1. Inside the MYNVOICE project → **Add New Resource**
2. Select: **Docker Compose**
3. Source: **GitHub (Public Repository)**
4. Repository URL: `https://github.com/AlexandreCorcos/mynvoice.git`
5. Branch: `main`
6. Docker Compose file path: `docker-compose.prod.yml`

### 3. Configure Environment Variables

In the resource's **Environment Variables** section, add ALL of the following:

```env
# Database
DB_USER=mynvoice
DB_PASSWORD=<GENERATE: openssl rand -base64 32>
DB_NAME=mynvoice

# Backend Auth (CRITICAL - must be strong and unique)
SECRET_KEY=<GENERATE: openssl rand -hex 64>

# Email/SMTP (configure if you want invoice emails to work)
SMTP_HOST=
SMTP_PORT=587
SMTP_USER=
SMTP_PASSWORD=
SMTP_FROM_EMAIL=noreply@mynvoice.com
```

**How to generate secure values:**
- `DB_PASSWORD`: Run `openssl rand -base64 32` on the server
- `SECRET_KEY`: Run `openssl rand -hex 64` on the server

### 4. Configure Domains

Coolify needs to know which domains map to which services. In the **Docker Compose** resource settings:

**For the `backend` service:**
- Domain: `api.mynvoice.com`
- Port: `8000`

**For the `frontend` service:**
- Domain: `app.mynvoice.com`
- Port: `3000`

**For the `db` service:**
- No domain needed (internal only)
- Do NOT expose the database to the internet

The Traefik labels in docker-compose.prod.yml already define routing rules. If Coolify manages Traefik itself, you may need to either:
- (a) Let Coolify's built-in proxy handle it (preferred — set domains in the Coolify UI and remove the `labels:` sections from docker-compose.prod.yml), OR
- (b) Use the labels as-is if Coolify uses raw Traefik

**Recommended:** Let Coolify manage proxy/SSL. In that case, the labels in the compose file are informational and Coolify overrides them with its own proxy config.

### 5. Configure SSL

- Enable SSL for both `app.mynvoice.com` and `api.mynvoice.com`
- Coolify handles Let's Encrypt automatically
- If using Cloudflare proxy: set SSL/TLS mode to **Full (Strict)** in Cloudflare

### 6. Configure Persistent Volumes

The compose file defines two named volumes that MUST persist across deployments:

| Volume | Purpose | Critical? |
|--------|---------|-----------|
| `postgres_data` | Database files | YES — losing this loses all data |
| `backend_uploads` | Uploaded logos and files | YES — losing this loses uploaded files |

Ensure Coolify is configured to **not delete volumes** on redeployment.

### 7. Build Arguments

The frontend requires a build argument to know where the API is:

```
NEXT_PUBLIC_API_URL=https://api.mynvoice.com/api/v1
```

This is already set in `docker-compose.prod.yml` under `frontend.build.args`. If Coolify requires you to set build args separately, add it in the frontend service build settings.

### 8. Deploy

Click **Deploy**. The deployment order will be:
1. `db` starts first (PostgreSQL)
2. `backend` waits for `db` health check, then runs migrations and starts FastAPI
3. `frontend` starts after backend

First deploy takes ~3-5 minutes (building Docker images). Subsequent deploys are faster due to layer caching.

---

## DNS Configuration Required

Before deploying, ensure these DNS records exist (in your domain registrar or Cloudflare):

| Type | Name | Value |
|------|------|-------|
| A | `app` | `<SERVER_IP>` |
| A | `api` | `<SERVER_IP>` |

Do NOT create DNS for `www` — that's managed separately.

---

## Post-Deployment Verification

### Check all services are running:
```bash
# SSH into server, then:
docker ps | grep mynvoice
# Should show 3 containers: mynvoice-db, mynvoice-backend, mynvoice-frontend
```

### Test the API:
```bash
curl https://api.mynvoice.com/health
# Expected: {"status":"healthy","app":"MYNVOICE"}
```

### Test the frontend:
```bash
curl -I https://app.mynvoice.com
# Expected: HTTP/2 200
```

### Create the first admin user:
```bash
# Register
curl -X POST https://api.mynvoice.com/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@mynvoice.com","password":"CHOOSE_A_STRONG_PASSWORD","first_name":"Admin","last_name":"User"}'

# Promote to admin
docker exec mynvoice-db psql -U mynvoice -c "UPDATE users SET is_admin = true WHERE email = 'admin@mynvoice.com';"
```

---

## Architecture Details

### Services & Ports (all internal, Traefik/Coolify proxy handles external access)

| Service | Container Name | Internal Port | External Domain |
|---------|---------------|---------------|-----------------|
| PostgreSQL 16 | mynvoice-db | 5432 | None (internal) |
| FastAPI Backend | mynvoice-backend | 8000 | api.mynvoice.com |
| Next.js Frontend | mynvoice-frontend | 3000 | app.mynvoice.com |

### Backend Details
- **Image base:** python:3.13-slim
- **Framework:** FastAPI + Uvicorn (4 workers)
- **Database:** PostgreSQL via asyncpg (async)
- **Migrations:** Alembic (auto-runs on startup via entrypoint.sh)
- **File uploads:** Stored in /app/uploads (mounted volume)
- **System deps:** libcairo2, libpango (for PDF generation with WeasyPrint)

### Frontend Details
- **Image base:** node:20-alpine (multi-stage build)
- **Framework:** Next.js 15 with standalone output
- **Build arg:** NEXT_PUBLIC_API_URL must be set at BUILD time (not runtime)
- **Final image:** ~150MB, runs `node server.js`

### Database Details
- **Image:** postgres:16-alpine
- **Health check:** `pg_isready` every 5 seconds
- **Data:** Persisted in `postgres_data` named volume

---

## Environment Variables Reference

### Required:
| Variable | Where | Example |
|----------|-------|---------|
| `DB_PASSWORD` | Compose | `aX7k9mP2...` (random 32+ chars) |
| `SECRET_KEY` | Backend | `e4f8a1b2c3...` (random 128 hex chars) |

### Optional (but recommended for production):
| Variable | Where | Default | Purpose |
|----------|-------|---------|---------|
| `DB_USER` | Compose | `mynvoice` | Database username |
| `DB_NAME` | Compose | `mynvoice` | Database name |
| `SMTP_HOST` | Backend | empty | Email server for sending invoices |
| `SMTP_PORT` | Backend | `587` | SMTP port |
| `SMTP_USER` | Backend | empty | SMTP username |
| `SMTP_PASSWORD` | Backend | empty | SMTP password |
| `SMTP_FROM_EMAIL` | Backend | `noreply@mynvoice.com` | Sender email |

### Set in compose file (usually don't change):
| Variable | Value | Notes |
|----------|-------|-------|
| `DEBUG` | `false` | Never `true` in production |
| `CORS_ORIGINS` | `["https://app.mynvoice.com"]` | Update if domain changes |
| `NEXT_PUBLIC_API_URL` | `https://api.mynvoice.com/api/v1` | Build arg for frontend |

---

## Troubleshooting

### Backend won't start
```bash
docker logs mynvoice-backend
```
Common issues:
- Database not ready → check `mynvoice-db` health, increase healthcheck retries
- Migration error → check if DB_PASSWORD matches between compose environment and what PostgreSQL was initialized with
- Missing system lib → rebuild image

### Frontend shows blank page
- Check browser console for API errors
- Verify `NEXT_PUBLIC_API_URL` was set at BUILD time (not just runtime)
- Rebuild frontend: the URL is baked into the JavaScript bundle

### Database connection refused
- The backend connects to `db:5432` (Docker internal network name)
- Never use `localhost` in DATABASE_URL inside Docker — use the service name `db`

### CORS errors in browser
- Check `CORS_ORIGINS` in backend environment includes the exact frontend URL with `https://`
- Include both `https://app.mynvoice.com` and `https://www.mynvoice.com` if needed

### SSL certificate issues
- Wait 2-3 minutes after first deploy for Let's Encrypt to issue certs
- Check DNS is pointing to the correct server IP
- If using Cloudflare proxy, ensure SSL mode is "Full (Strict)"

---

## Backup Strategy

Configure a cron job on the server for daily database backups:

```bash
# Create backup script
cat > /opt/mynvoice-backup.sh << 'SCRIPT'
#!/bin/bash
BACKUP_DIR="/opt/backups/mynvoice"
mkdir -p $BACKUP_DIR
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
docker exec mynvoice-db pg_dump -U mynvoice mynvoice | gzip > "$BACKUP_DIR/db_$TIMESTAMP.sql.gz"
find $BACKUP_DIR -name "db_*.sql.gz" -mtime +30 -delete
SCRIPT

chmod +x /opt/mynvoice-backup.sh

# Schedule daily at 3am
(crontab -l 2>/dev/null; echo "0 3 * * * /opt/mynvoice-backup.sh") | crontab -
```

---

## Updating the Application

When new code is pushed to the `main` branch:

1. **If auto-deploy is enabled in Coolify:** It deploys automatically via webhook
2. **If manual:** Go to the resource in Coolify → click **Deploy**

The backend entrypoint.sh automatically runs `alembic upgrade head` on every startup, so database migrations are applied automatically.

---

## Security Notes

- **Never expose port 5432** (PostgreSQL) to the internet
- **DB_PASSWORD and SECRET_KEY** must be unique, random, and long
- **DEBUG must be false** in production
- The backend only accepts requests from domains listed in CORS_ORIGINS
- File uploads are limited to 5MB and restricted to image types only
- JWT tokens expire after 30 minutes (refresh tokens after 7 days)
