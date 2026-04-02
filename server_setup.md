# MYNVOICE - Server Setup Guide (Hostinger VPS + Coolify)

## Architecture Overview

```
                    Internet
                       |
              [Cloudflare DNS]
                  /    |    \
  www.mynvoice.com  app.mynvoice.com  api.mynvoice.com
        |               \                /
  [Separate website]  [Hostinger VPS - Coolify]
                           |
              +-----------+-----------+
              |           |           |
         [Frontend]  [Backend]   [PostgreSQL]
         Next.js     FastAPI      Port 5432
         Port 3000   Port 8000   (internal)
         (internal)  (internal)
```

- **www.mynvoice.com** — Landing page / marketing website (managed separately)
- **app.mynvoice.com** — Frontend Next.js (the application)
- **api.mynvoice.com** — Backend FastAPI

---

## Step 1: Hostinger VPS Setup

### Minimum Requirements
- **OS:** Ubuntu 22.04 or 24.04 LTS
- **RAM:** 2GB minimum (4GB recommended)
- **Storage:** 40GB SSD
- **CPU:** 2 vCPUs

### Initial Server Config

SSH into the server:
```bash
ssh root@YOUR_VPS_IP
```

Update system:
```bash
apt update && apt upgrade -y
apt install -y curl git
```

---

## Step 2: Install Coolify

```bash
curl -fsSL https://cdn.coollabs.io/coolify/install.sh | bash
```

After install, access Coolify at: `http://YOUR_VPS_IP:8000`

1. Create your admin account
2. Set up the local server as your deployment target

> **Important:** After Coolify is running, change its port from 8000 to avoid conflict with the MYNVOICE backend. Go to Coolify Settings and change the port to 8080 or similar.

---

## Step 3: DNS Configuration

In your domain registrar (or Cloudflare), create these DNS records:

| Type | Name | Value | Proxy |
|------|------|-------|-------|
| A | `@` | YOUR_VPS_IP | Yes |
| A | `www` | YOUR_VPS_IP | Yes |
| A | `app` | YOUR_VPS_IP | Yes |
| A | `api` | YOUR_VPS_IP | Yes |

If using Cloudflare, set SSL/TLS to "Full (Strict)" after Coolify configures the SSL certs.

---

## Step 4: Prepare Production Docker Files

### 4.1 Production docker-compose (docker-compose.prod.yml)

Create this file in the project root:

```yaml
services:
  db:
    image: postgres:16-alpine
    container_name: mynvoice-db
    restart: unless-stopped
    environment:
      POSTGRES_USER: ${DB_USER:-mynvoice}
      POSTGRES_PASSWORD: ${DB_PASSWORD}
      POSTGRES_DB: ${DB_NAME:-mynvoice}
    volumes:
      - postgres_data:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U ${DB_USER:-mynvoice}"]
      interval: 5s
      timeout: 5s
      retries: 10

  backend:
    build:
      context: ./backend
      dockerfile: Dockerfile.prod
    container_name: mynvoice-backend
    restart: unless-stopped
    depends_on:
      db:
        condition: service_healthy
    environment:
      DATABASE_URL: postgresql+asyncpg://${DB_USER:-mynvoice}:${DB_PASSWORD}@db:5432/${DB_NAME:-mynvoice}
      SECRET_KEY: ${SECRET_KEY}
      DEBUG: "false"
      CORS_ORIGINS: '["https://app.mynvoice.com","https://www.mynvoice.com"]'
      SMTP_HOST: ${SMTP_HOST:-}
      SMTP_PORT: ${SMTP_PORT:-587}
      SMTP_USER: ${SMTP_USER:-}
      SMTP_PASSWORD: ${SMTP_PASSWORD:-}
      SMTP_FROM_EMAIL: ${SMTP_FROM_EMAIL:-noreply@mynvoice.com}
      SMTP_FROM_NAME: MYNVOICE
    volumes:
      - backend_uploads:/app/uploads
    labels:
      - "traefik.enable=true"
      - "traefik.http.routers.api.rule=Host(`api.mynvoice.com`)"
      - "traefik.http.routers.api.tls=true"
      - "traefik.http.routers.api.tls.certresolver=letsencrypt"
      - "traefik.http.services.api.loadbalancer.server.port=8000"

  frontend:
    build:
      context: ./frontend
      dockerfile: Dockerfile.prod
      args:
        NEXT_PUBLIC_API_URL: https://api.mynvoice.com/api/v1
    container_name: mynvoice-frontend
    restart: unless-stopped
    depends_on:
      - backend
    labels:
      - "traefik.enable=true"
      - "traefik.http.routers.app.rule=Host(`app.mynvoice.com`)"
      - "traefik.http.routers.app.tls=true"
      - "traefik.http.routers.app.tls.certresolver=letsencrypt"
      - "traefik.http.services.app.loadbalancer.server.port=3000"
      - "traefik.http.routers.www.rule=Host(`www.mynvoice.com`)"
      - "traefik.http.routers.www.tls=true"
      - "traefik.http.routers.www.tls.certresolver=letsencrypt"
      - "traefik.http.routers.www.middlewares=www-redirect"
      - "traefik.http.middlewares.www-redirect.redirectregex.regex=^https://www\\.mynvoice\\.com(.*)"
      - "traefik.http.middlewares.www-redirect.redirectregex.replacement=https://app.mynvoice.com$${1}"
      - "traefik.http.middlewares.www-redirect.redirectregex.permanent=true"

volumes:
  postgres_data:
  backend_uploads:
```

### 4.2 Backend Production Dockerfile (backend/Dockerfile.prod)

```dockerfile
FROM python:3.13-slim AS builder

WORKDIR /app

# System deps for WeasyPrint PDF generation
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    libcairo2 \
    libpango-1.0-0 \
    libpangocairo-1.0-0 \
    libgdk-pixbuf-2.0-0 \
    libffi-dev \
    fonts-liberation \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

# Run migrations on startup, then start server
COPY entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

EXPOSE 8000
ENTRYPOINT ["/entrypoint.sh"]
```

### 4.3 Backend Entrypoint (backend/entrypoint.sh)

```bash
#!/bin/bash
set -e

echo "Running database migrations..."
alembic upgrade head

echo "Starting MYNVOICE backend..."
exec uvicorn app.main:app --host 0.0.0.0 --port 8000 --workers 4
```

### 4.4 Frontend Production Dockerfile (frontend/Dockerfile.prod)

```dockerfile
# Stage 1: Build
FROM node:20-alpine AS builder

WORKDIR /app

ARG NEXT_PUBLIC_API_URL
ENV NEXT_PUBLIC_API_URL=${NEXT_PUBLIC_API_URL}

COPY package.json package-lock.json ./
RUN npm ci

COPY . .
RUN npm run build

# Stage 2: Production
FROM node:20-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production

# Copy standalone output
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public

EXPOSE 3000

CMD ["node", "server.js"]
```

---

## Step 5: Production Environment File

Create `.env.production` in the project root:

```env
# Database (use a STRONG password)
DB_USER=mynvoice
DB_PASSWORD=GENERATE_A_STRONG_PASSWORD_HERE
DB_NAME=mynvoice

# Auth (generate with: openssl rand -hex 64)
SECRET_KEY=GENERATE_WITH_OPENSSL_RAND_HEX_64

# Frontend
NEXT_PUBLIC_API_URL=https://api.mynvoice.com/api/v1

# Email (Hostinger SMTP or other provider)
SMTP_HOST=smtp.hostinger.com
SMTP_PORT=465
SMTP_USER=noreply@mynvoice.com
SMTP_PASSWORD=YOUR_EMAIL_PASSWORD
SMTP_FROM_EMAIL=noreply@mynvoice.com

# Optional: Google OAuth
# GOOGLE_CLIENT_ID=
# GOOGLE_CLIENT_SECRET=
```

Generate the secret key:
```bash
openssl rand -hex 64
```

Generate the database password:
```bash
openssl rand -base64 32
```

---

## Step 6: Deploy with Coolify

### Option A: Docker Compose (Recommended)

1. In Coolify, go to **Projects** > **New Project** > name it "MYNVOICE"
2. Add a new **Resource** > select **Docker Compose**
3. Connect your Git repository (GitHub/GitLab)
4. Set the **Docker Compose file** path to: `docker-compose.prod.yml`
5. Add all environment variables from `.env.production` in the Coolify UI
6. Set the domains:
   - `app.mynvoice.com` for the frontend service
   - `api.mynvoice.com` for the backend service
7. Enable **Auto Deploy** on push (optional)
8. Click **Deploy**

### Option B: Separate Services

If you prefer more control, deploy each as a separate Coolify resource:

**1. PostgreSQL:**
- Add Resource > Database > PostgreSQL 16
- Note the connection string Coolify generates

**2. Backend:**
- Add Resource > Application > Dockerfile
- Source: Git repo, path `./backend`
- Dockerfile: `Dockerfile.prod`
- Domain: `api.mynvoice.com`
- Port: `8000`
- Add environment variables (DATABASE_URL, SECRET_KEY, CORS_ORIGINS, etc.)

**3. Frontend:**
- Add Resource > Application > Dockerfile
- Source: Git repo, path `./frontend`
- Dockerfile: `Dockerfile.prod`
- Domain: `app.mynvoice.com`
- Port: `3000`
- Build arg: `NEXT_PUBLIC_API_URL=https://api.mynvoice.com/api/v1`

---

## Step 7: SSL Certificates

Coolify handles SSL automatically via Let's Encrypt / Traefik.

If using Cloudflare proxy:
1. In Cloudflare: SSL/TLS > set to **Full (Strict)**
2. In Coolify: SSL is still enabled (Cloudflare talks HTTPS to your server)

If NOT using Cloudflare:
1. Coolify auto-generates Let's Encrypt certificates
2. Just make sure DNS A records point directly to your VPS IP

---

## Step 8: Post-Deploy Checklist

### Verify services are running:
```bash
# SSH into VPS
docker ps

# Should see:
# mynvoice-db       (postgres:16-alpine)    healthy
# mynvoice-backend  (mynvoice-backend)      running
# mynvoice-frontend (mynvoice-frontend)     running
```

### Test endpoints:
```bash
# Health check
curl https://api.mynvoice.com/health
# Expected: {"status":"healthy","app":"MYNVOICE"}

# Frontend
curl -I https://app.mynvoice.com
# Expected: HTTP/2 200
```

### Create first admin user:
```bash
curl -X POST https://api.mynvoice.com/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@mynvoice.com","password":"YOUR_SECURE_PASSWORD","first_name":"Admin","last_name":"User"}'
```

Then set admin flag directly in DB:
```bash
docker exec -it mynvoice-db psql -U mynvoice -c \
  "UPDATE users SET is_admin = true WHERE email = 'admin@mynvoice.com';"
```

---

## Step 9: Backups

### Automated DB Backups

Create a cron job on the VPS:

```bash
# Create backup script
cat > /opt/mynvoice-backup.sh << 'EOF'
#!/bin/bash
BACKUP_DIR="/opt/backups/mynvoice"
mkdir -p $BACKUP_DIR
TIMESTAMP=$(date +%Y%m%d_%H%M%S)

docker exec mynvoice-db pg_dump -U mynvoice mynvoice | gzip > "$BACKUP_DIR/db_$TIMESTAMP.sql.gz"

# Keep last 30 days
find $BACKUP_DIR -name "db_*.sql.gz" -mtime +30 -delete

echo "Backup completed: db_$TIMESTAMP.sql.gz"
EOF

chmod +x /opt/mynvoice-backup.sh

# Add to crontab (daily at 3am)
(crontab -l 2>/dev/null; echo "0 3 * * * /opt/mynvoice-backup.sh") | crontab -
```

### Restore from backup:
```bash
gunzip -c /opt/backups/mynvoice/db_TIMESTAMP.sql.gz | \
  docker exec -i mynvoice-db psql -U mynvoice mynvoice
```

---

## Step 10: Monitoring & Maintenance

### View logs:
```bash
# All services
docker-compose -f docker-compose.prod.yml logs -f

# Specific service
docker logs mynvoice-backend -f --tail 100
docker logs mynvoice-frontend -f --tail 100
docker logs mynvoice-db -f --tail 100
```

### Update deployment:
```bash
# If using Coolify with Git: just push to main, auto-deploy handles it

# If manual:
cd /path/to/mynvoice
git pull
docker-compose -f docker-compose.prod.yml build
docker-compose -f docker-compose.prod.yml up -d
```

### Useful commands:
```bash
# Run migrations manually
docker exec mynvoice-backend alembic upgrade head

# Access DB shell
docker exec -it mynvoice-db psql -U mynvoice

# Restart a service
docker restart mynvoice-backend

# Check disk usage
docker system df
```

---

## Security Checklist

- [ ] Strong DB_PASSWORD (32+ chars, random)
- [ ] Strong SECRET_KEY (64+ hex chars)
- [ ] DEBUG=false in production
- [ ] CORS_ORIGINS only includes your domains
- [ ] Firewall: only ports 22, 80, 443 open (Coolify handles the rest internally)
- [ ] SSH key authentication (disable password login)
- [ ] Automated backups running
- [ ] Coolify admin has strong password + 2FA
- [ ] Regular `apt update && apt upgrade` schedule

### Firewall setup (UFW):
```bash
ufw default deny incoming
ufw default allow outgoing
ufw allow 22/tcp    # SSH
ufw allow 80/tcp    # HTTP (redirect to HTTPS)
ufw allow 443/tcp   # HTTPS
ufw allow 8080/tcp  # Coolify UI (restrict to your IP if possible)
ufw enable
```

---

## Quick Reference

| Service | Internal URL | External URL |
|---------|-------------|--------------|
| Frontend | http://frontend:3000 | https://app.mynvoice.com |
| Backend API | http://backend:8000 | https://api.mynvoice.com |
| API Docs | http://backend:8000/docs | https://api.mynvoice.com/docs |
| PostgreSQL | db:5432 | Internal only |
| Coolify UI | http://localhost:8080 | http://YOUR_VPS_IP:8080 |
