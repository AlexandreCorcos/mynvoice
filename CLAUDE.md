# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**MYNVOICE** is an open-source, free invoice and expense management system for small businesses, freelancers, and self-employed professionals. The goal is a modern, elegant UX — not a generic SaaS tool.

Slogan: *"Your business. Your invoices."*

## Planned Architecture

```
/backend      # Python + FastAPI
/frontend     # React/Next.js + TailwindCSS + Framer Motion
/docs         # Documentation
/examples     # UI reference screenshots (inspiration only, do not copy)
```

### Backend
- **Language:** Python
- **Framework:** FastAPI
- **Database:** PostgreSQL
- **Auth:** JWT or session-based; email+password and Google OAuth

### Frontend
- **Framework:** React + Next.js
- **Styling:** TailwindCSS
- **Animations:** Framer Motion
- **Drag & Drop:** dnd-kit

## Versioning

Every feature or fix commit must bump `frontend/package.json` version **and** update `frontend/public/meta.json` to match. See **`docs/versioning.md`** for the full process, semver guide, and how the in-app update banner works.

## Commands

No code has been implemented yet. Commands will be added here as the project is scaffolded.

## Design System

**Color Palette (Petrol & Coral):**
- Petrol Dark: `#0F4C5C` — primary structural color, nav, primary buttons
- Petrol Mid: `#2C7A7B` — hover states, secondary elements
- Coral: `#FF6B6B` — CTAs, important actions, highlights (use sparingly)
- Light Background: `#F0F3F5`
- Dark Surface: `#1B263B` — text, dark sections, dark mode background
- Secondary text: `#5C677D`

**Component rules:**
- Cards: white background, soft shadow, 12–16px border radius
- Primary buttons: Petrol background + white text
- CTA buttons (e.g. "Create Invoice"): Coral background
- Charts: Petrol tones for base data, Coral for highlights; no rainbow charts
- Avoid heavy gradients, visual noise

**Dark mode:** prepare structure (background `#1B263B`, maintain Coral for contrast).

## Core Features

1. **Auth:** Email/password + Google OAuth. Design auth structure to accommodate Apple Sign-In later without implementation.
2. **User/Company Profile:** Logo upload, invoice branding, VAT/tax fields.
3. **Client Management:** CRUD for clients (company name, email, address, contact person).
4. **Invoice Creation (critical):** Minimal steps, dynamic items, auto-calculations (subtotal/tax/total), drag-to-reorder items, save drafts, duplicate invoices.
5. **Invoice Lifecycle:** Statuses — Draft, Sent, Paid, Overdue. Payment methods: bank transfer, card, cash, other.
6. **Send Invoice:** Email delivery with PDF attachment and email template system.
7. **Dashboard:** Revenue totals, paid vs unpaid, monthly trends, expense overview — clean charts, minimal cognitive load.
8. **Invoice Management Screen:** Hybrid table/card UI (not a boring table), filters by status/date/client, search, quick actions.
9. **Expenses Module:** Fixed and variable expenses, user-defined categories, monthly tracking.
10. **Admin Panel:** Restricted. Metrics: total users, active users, invoices created/paid, expenses recorded. Growth charts. Configurable monthly donation cost target.
11. **Donation System:** "Support" button in UI, dedicated donation page with progress bar (e.g. "£420 / £1,000 monthly cost covered"). Prepare Stripe/PayPal/Buy Me a Coffee structure without full implementation.

## Architecture Constraints

- **i18n from the start:** Initial language English (UK). Structure must allow adding languages easily.
- **Mobile-first responsive:** No native apps initially, but API must be clean for future mobile app consumption.
- **Future-ready (do not implement):** Multi-user companies/teams, roles/permissions, recurring invoices, Stripe/PayPal integrations, notifications system.
- **Modular, separation of concerns:** scalable from day one.

## UX Principles

- Fast, intuitive, visually refined — inspired by Linear (UX quality) and Notion (simplicity).
- Drag & drop where it improves UX (invoice line items at minimum).
- Micro-interactions and smooth animations throughout.
- Real-time feedback (instant calculations, optimistic UI updates).
- Avoid clunky forms, overloaded dashboards, and outdated UI patterns.
