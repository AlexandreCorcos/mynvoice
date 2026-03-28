# Deployment Guide

## Local Development

### Prerequisites
- Docker & Docker Compose
- Python 3.12+
- Node.js 18+

### Quick Start

```bash
# 1. Start PostgreSQL
docker-compose up db -d

# 2. Backend
cd backend
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
cp ../.env.example .env    # edit with your values
alembic revision --autogenerate -m "initial"
alembic upgrade head
uvicorn app.main:app --reload --port 8000

# 3. Frontend
cd ../frontend
npm install
cp .env.example .env.local
npm run dev
```

## Docker (Full Stack)

```bash
docker-compose up --build
```

Services:
- **db** — PostgreSQL 16 on port 5432
- **backend** — FastAPI on port 8000

The frontend should be run separately with `npm run dev` for development, or built and served via a static host.

## Production Deployment

### Backend

1. Set environment variables (see `.env.example`):
   - `DATABASE_URL` — production PostgreSQL connection string
   - `SECRET_KEY` — strong random secret (use `openssl rand -hex 32`)
   - `DEBUG=false`
   - SMTP settings for email delivery

2. Run migrations:
   ```bash
   alembic upgrade head
   ```

3. Start with Gunicorn:
   ```bash
   gunicorn app.main:app -w 4 -k uvicorn.workers.UvicornWorker --bind 0.0.0.0:8000
   ```

### Frontend

1. Build:
   ```bash
   cd frontend
   NEXT_PUBLIC_API_URL=https://api.yourdomain.com/api/v1 npm run build
   ```

2. The `standalone` output mode produces a self-contained Node.js server:
   ```bash
   node .next/standalone/server.js
   ```

3. Alternatively, deploy to Vercel, Netlify, or any Node.js hosting platform.

### Reverse Proxy (Nginx)

```nginx
server {
    listen 80;
    server_name yourdomain.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }

    location /api/ {
        proxy_pass http://localhost:8000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

### Database

- Use managed PostgreSQL (AWS RDS, DigitalOcean, Supabase, etc.)
- Enable SSL connections
- Set up regular backups
- Run migrations before deploying new versions

### Security Checklist

- [ ] Change `SECRET_KEY` from default
- [ ] Set `DEBUG=false`
- [ ] Use HTTPS everywhere
- [ ] Configure CORS_ORIGINS to your actual domain
- [ ] Set up rate limiting (e.g., via Nginx or a middleware)
- [ ] Enable database SSL
