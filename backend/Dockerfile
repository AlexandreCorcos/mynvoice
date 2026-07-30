FROM python:3.12-slim

WORKDIR /app

# Keep this list in step with Dockerfile.prod. WeasyPrint dlopen()s these at
# import time, so without them /invoices/{id}/pdf and /send raise OSError —
# which the browser then reports as a CORS failure, because a 500 raised
# inside the middleware stack never gets the CORS headers attached.
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

# alembic/env.py imports `app.*`, so it needs the working dir on the path.
ENV PYTHONPATH=/app

# Migrations run here rather than in entrypoint.sh because dev wants
# --reload and a single worker. Without this, a fresh `docker compose up`
# gives you a backend that 500s on every request with
# "relation \"users\" does not exist".
CMD ["sh", "-c", "alembic upgrade head && uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload"]
