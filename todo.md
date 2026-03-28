# MYNVOICE - Project TODO

## Phase 1: Foundation -- DONE

- [x] Backend structure (FastAPI + async SQLAlchemy + PostgreSQL)
- [x] 8 database models (Users, Companies, Clients, Invoices, InvoiceItems, Expenses, ExpenseCategories, Donations)
- [x] Alembic migration setup
- [x] JWT auth (register, login, refresh, bcrypt)
- [x] 7 API route groups (auth, profile, clients, invoices, expenses, dashboard, admin)
- [x] Docker Compose (PostgreSQL + backend)
- [x] Pydantic schemas for all models

## Phase 2: Frontend -- DONE

- [x] Next.js 15 + TypeScript + TailwindCSS v4
- [x] 14 pages building successfully (0 errors)
- [x] Auth pages (login, register, forgot password)
- [x] Dashboard with charts (Recharts)
- [x] Client management (cards, search, CRUD modal)
- [x] Invoice list (status tabs, search, quick actions)
- [x] Invoice creation (drag & drop items, live totals)
- [x] Invoice detail (preview, status transitions, payment modal)
- [x] Expenses (summary, categories, filtering, CRUD)
- [x] Settings (profile + company)
- [x] Admin panel (metrics, donation config)
- [x] Support/Donation page

## Phase 3: Polish -- DONE

- [x] Framer Motion animations (page transitions, staggered cards, hover effects, animated numbers)
- [x] Motion components library (PageTransition, StaggerContainer, FadeIn, ModalOverlay, etc.)
- [x] Dark mode (CSS dark theme, persistent preference, topbar toggle, flash prevention)
- [x] i18n structure (en-GB translations file, t() helper with interpolation)

## Phase 4: Documentation -- DONE

- [x] README.md (features, tech stack, quick start, project structure, API overview, design system)
- [x] API documentation (docs/api.md - all endpoints with examples)
- [x] Deployment guide (docs/deployment.md - local, Docker, production, Nginx, security)
- [x] Contributing guide (docs/contributing.md - workflow, conventions, design system)
- [x] MIT License

## Remaining (Future Work)

- [ ] Google OAuth callback implementation
- [ ] Password reset flow (email token)
- [ ] Logo/file upload endpoint
- [ ] PDF invoice generation (WeasyPrint)
- [ ] Email sending service (aiosmtplib + Jinja2 templates)
- [ ] Stripe/PayPal donation integration
- [ ] Recurring invoices
- [ ] Multi-user teams & roles
- [ ] Notifications system
- [ ] Mobile app (React Native)
