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

## Phase 5: Enhancements -- DONE

- [x] Dashboard: receivables aging bar (Current, 1-15d, 16-30d, 31-45d, 45+d)
- [x] Dashboard: Sales/Receipts/Dues summary table by period
- [x] Dashboard: currency from user settings (not hardcoded £)
- [x] Invoice list: card/table toggle view
- [x] Invoice list: descriptive status ("Overdue by 3 days", "Due today")
- [x] Invoice cards: Mark as Sent / Mark as Paid quick actions
- [x] Invoice creation: pick items from catalog
- [x] Invoice numbering: per-client prefix + optional year (INV-26-00001)
- [x] Items & Services catalog (CRUD, sidebar nav)
- [x] Client: invoice settings per client (prefix, year flag, payment terms)
- [x] Client: bank details with "Import from your business" button
- [x] Client: total receivables on cards
- [x] Settings: "Your Business" label (self-employed friendly)
- [x] Settings: use_year_in_number toggle
- [x] Settings: refreshUser after profile save

## Phase 6: Core Completion -- DONE

- [x] Toast notification system (floating, visible at any scroll position)
- [x] Logo upload for company profile (upload, preview, remove)
- [x] Payments Received page (auto-created on paid, manual recording)
- [x] PDF invoice generation (WeasyPrint, professional layout with logo/colours)
- [x] Email sending with PDF attachment (aiosmtplib, HTML email template)
- [x] Invoice edit page (/invoices/[id]/edit for drafts)
- [x] Partial payments support (amount_paid, balance_due, auto-mark paid when balance=0)
- [x] Download PDF button on invoice detail
- [x] Send invoice by email button with modal
- [x] Invoice detail: Edit button for drafts

## Remaining (To Implement)

### Medium Priority (UX improvements)
- [ ] Reports page (revenue by period/client)
- [ ] Billable expenses (mark expense as billable to client, convert to invoice item)
- [ ] Expense import (CSV upload)
- [ ] Dark mode activation (structure is prepared, needs wiring up)
- [ ] Onboarding flow ("Getting Started" checklist for new users)

### Low Priority (future features)
- [ ] Google OAuth callback implementation
- [ ] Password reset flow (email token)
- [ ] Notifications/reminders for overdue invoices
- [ ] Stripe/PayPal donation integration
- [ ] Recurring invoices
- [ ] Multi-user teams & roles
- [ ] Mobile app (React Native)
