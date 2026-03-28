# MYNVOICE

**Your business. Your invoices.**

Open-source, free invoice and expense management system for small businesses, freelancers, and self-employed professionals.

## Features

- **Invoice Management** — Create, send, track, and duplicate invoices with drag & drop line items
- **Client Management** — Store client details, addresses, and VAT information
- **Expense Tracking** — Fixed and variable expenses with user-defined categories
- **Dashboard** — Revenue trends, paid vs unpaid overview, monthly charts
- **Company Profile** — Business branding, bank details, invoice numbering
- **Admin Panel** — System metrics, user analytics, donation management
- **Dark Mode** — Full dark theme with persistent preference
- **Responsive** — Mobile-first design, works on all devices

## Tech Stack

### Backend
- **Python 3.12** + **FastAPI**
- **PostgreSQL** with **async SQLAlchemy**
- **Alembic** for migrations
- **JWT** authentication with bcrypt password hashing

### Frontend
- **Next.js 15** (App Router) + **TypeScript**
- **TailwindCSS v4** with custom design tokens
- **Framer Motion** for animations
- **Recharts** for data visualisation
- **Lucide** icons

## Quick Start

### Prerequisites
- Docker & Docker Compose
- Node.js 18+
- Python 3.12+

### 1. Clone and configure

```bash
git clone https://github.com/your-username/mynvoice.git
cd mynvoice
cp .env.example backend/.env
cp frontend/.env.example frontend/.env.local
```

### 2. Start the database

```bash
docker-compose up db -d
```

### 3. Set up the backend

```bash
cd backend
python -m venv .venv
source .venv/bin/activate    # Windows: .venv\Scripts\activate
pip install -r requirements.txt

# Run migrations
alembic revision --autogenerate -m "initial"
alembic upgrade head

# Start server
uvicorn app.main:app --reload
```

The API will be available at `http://localhost:8000`. Interactive docs at `http://localhost:8000/docs`.

### 4. Set up the frontend

```bash
cd frontend
npm install
npm run dev
```

The app will be available at `http://localhost:3000`.

### Docker (full stack)

```bash
docker-compose up
```

## Project Structure

```
mynvoice/
├── backend/
│   ├── app/
│   │   ├── api/           # API routes
│   │   │   ├── routes/    # auth, clients, invoices, expenses, dashboard, admin
│   │   │   ├── deps.py    # dependency injection (auth, db)
│   │   │   └── router.py  # route aggregation
│   │   ├── core/          # config, security
│   │   ├── db/            # database connection, base model
│   │   ├── models/        # SQLAlchemy models
│   │   ├── schemas/       # Pydantic request/response schemas
│   │   ├── services/      # business logic (future)
│   │   └── main.py        # FastAPI app entry point
│   ├── alembic/           # database migrations
│   ├── Dockerfile
│   └── requirements.txt
├── frontend/
│   ├── src/
│   │   ├── app/           # Next.js pages (App Router)
│   │   │   ├── (auth)/    # login, register, forgot-password
│   │   │   └── (app)/     # dashboard, invoices, clients, expenses, settings, admin, support
│   │   ├── components/    # shared UI components
│   │   ├── contexts/      # React contexts (auth)
│   │   ├── hooks/         # custom hooks (theme)
│   │   ├── i18n/          # internationalisation
│   │   ├── lib/           # API client, utilities
│   │   └── types/         # TypeScript type definitions
│   ├── package.json
│   └── tsconfig.json
├── docker-compose.yml
└── docs/
```

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/v1/auth/register` | Register new user |
| POST | `/api/v1/auth/login` | Login |
| POST | `/api/v1/auth/refresh` | Refresh tokens |
| GET/PUT | `/api/v1/profile/me` | User profile |
| GET/POST/PUT | `/api/v1/profile/company` | Company profile |
| GET/POST/PUT/DELETE | `/api/v1/clients/` | Client CRUD |
| GET/POST/PUT/DELETE | `/api/v1/invoices/` | Invoice CRUD |
| PATCH | `/api/v1/invoices/{id}/status` | Update invoice status |
| POST | `/api/v1/invoices/{id}/duplicate` | Duplicate invoice |
| GET/POST/PUT/DELETE | `/api/v1/expenses/` | Expense CRUD |
| GET/POST/DELETE | `/api/v1/expenses/categories` | Expense categories |
| GET | `/api/v1/dashboard/` | Dashboard stats |
| GET | `/api/v1/admin/metrics` | Admin metrics |
| GET/PUT | `/api/v1/admin/donations` | Donation config |

## Design System

**Petrol & Coral** colour palette — professional with personality.

| Token | Hex | Usage |
|-------|-----|-------|
| Petrol Dark | `#0F4C5C` | Primary, nav, buttons |
| Petrol Mid | `#2C7A7B` | Hover states, accents |
| Coral | `#FF6B6B` | CTAs, highlights |
| Light BG | `#F0F3F5` | Page background |
| Dark Surface | `#1B263B` | Dark mode, text |

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/my-feature`)
3. Commit your changes
4. Push to the branch
5. Open a Pull Request

Please follow existing code style and conventions.

## Licence

MIT License. See [LICENSE](LICENSE) for details.
