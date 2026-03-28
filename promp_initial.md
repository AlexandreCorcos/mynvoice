# MYNVOICE — Open Source Invoice Management System

## 1. Vision

MYNVOICE is an open-source, free-to-use invoice and expense management system designed for:

- Small businesses
- Self-employed professionals
- Freelancers

slogan: “Your business. Your invoices.” (if you have some nice ideia you can share)

The goal is to **simplify financial organization** while delivering a **modern, elegant, and differentiated user experience** — avoiding generic, outdated SaaS patterns.

This is NOT just another invoice system.

It should feel:
- Fast
- Intuitive
- Visually refined
- Delightful to use

---

## 2. Core Principles

- Open Source (MIT or similar license)
- Free for companies
- Clean, minimal, but powerful
- UX-first approach (not backend-first)
- Simple workflows over complex configurations
- Scalable architecture from day one
- Future-ready (internationalization, integrations)

---

## 3. Tech Stack

### Backend
- Python
- FastAPI
- PostgreSQL

### Frontend
You are free to choose the framework, but it MUST:
- Be modern (React / Next.js / Vue recommended)
- Have strong UI capabilities
- Support drag-and-drop interactions
- Be highly responsive and smooth

### Suggested (not mandatory)
- React + Next.js + TailwindCSS + Framer Motion
- Drag & drop: dnd-kit or similar

---

## 4. Authentication

### Initial
- Email + Password registration/login
- Google OAuth login

### Future-ready (structure required)
- Apple Sign-In (do not implement, but design for it)

### Requirements
- Secure authentication (JWT or session-based)
- Password hashing
- Email validation
- Password reset flow

---

## 5. Internationalization (i18n)

- System must be built with i18n support from the start
- Initial language: **English (UK)**
- Architecture must allow easy addition of new languages later

---

## 6. Core Features

### 6.1 User Profile
Each user has:
- Personal/company information
- Address details
- Contact info
- VAT / tax fields (optional but supported)

---

### 6.2 Company / Sender Profile
- User can define their business identity
- Logo upload
- Invoice branding

---

### 6.3 Clients Management
- Add/edit/delete clients
- Store:
  - Company name
  - Email
  - Address
  - Contact person

---

### 6.4 Invoice Creation (CRITICAL FEATURE)

This MUST be:
- Fast
- Simple
- Intuitive

### Requirements:
- Create invoice in minimal steps
- Add items dynamically
- Auto calculations (subtotal, tax, total)
- Drag & reorder items
- Save drafts
- Duplicate invoices

### Fields:
- Invoice number
- Issue date
- Due date
- Items (description, qty, price)
- Tax
- Notes

---

### 6.5 Invoice Lifecycle

Statuses:
- Draft
- Sent
- Paid
- Overdue

### Actions:
- Mark as paid
- Add payment date
- Select payment method:
  - Bank transfer
  - Card
  - Cash
  - Other

---

### 6.6 Send Invoice

- Send invoice directly via email from the system
- Email template system
- Attach PDF invoice

---

### 6.7 Dashboard

A visually strong dashboard showing:

- Total revenue
- Paid vs unpaid invoices
- Monthly trends
- Expense overview

### Must include:
- Charts (clean and modern)
- Quick insights
- Minimal cognitive load

---

### 6.8 Invoice Management Screen

- Table or hybrid UI (NOT boring tables)
- Filters:
  - Status
  - Date
  - Client
- Search
- Quick actions

---

### 6.9 Expenses Module

Two types:
- Fixed expenses
- Variable expenses

### Features:
- Categorization (groups)
- Monthly tracking
- Add/edit/delete expenses

---

### 6.10 Expense Categories

- User-defined groups
- Examples:
  - Software
  - Rent
  - Transport
  - Marketing

---

## 7. UX / UI Requirements (VERY IMPORTANT)

DO NOT build a generic SaaS UI.

### Requirements:
- Modern visual identity
- Smooth animations
- Micro-interactions
- Drag & drop capabilities
- Clean spacing and typography

### Inspiration (DO NOT COPY):
- Zoho Invoice (invoice.zoho.eu)
- Modern SaaS dashboards
- Notion (simplicity)
- Linear (UX quality)

---

## 8. Design System

- Consistent color tokens
- Light mode first
- Prepare for dark mode
- Component-based UI

---

## 9. File Structure

Organize clearly:
/backend
/frontend
/docs
/examples


---

## 10. Examples Folder

Include a `/examples` folder with:
- UI references
- Layout ideas

These are for inspiration only — NOT to be copied.

---

## 11. Documentation (MANDATORY)

You MUST generate clean and professional documentation.

### Include:

#### 11.1 README.md
- Project overview
- Features
- Tech stack
- Setup instructions

#### 11.2 Backend Docs
- API structure
- Endpoints
- Authentication flow

#### 11.3 Frontend Docs
- Architecture
- State management
- Component structure

#### 11.4 Contribution Guide
- How to contribute
- Code standards

#### 11.5 Deployment Guide
- Local setup
- Production deployment

---

## 12. Architecture Guidelines

- Modular design
- Separation of concerns
- Clean code principles
- Scalable structure

---

## 13. Performance

- Fast load times
- Optimized queries
- Efficient API usage

---

## 14. Security

- Input validation
- Secure authentication
- Protection against common vulnerabilities

---

## 15. Future Features (Design for it)

Do NOT implement, but prepare architecture:

- Multi-user companies (teams)
- Permissions & roles
- Integrations (Stripe, PayPal)
- Recurring invoices
- Mobile app
- Notifications system

---

## 16. Final Instruction

This system must:
- Be simple but powerful
- Be beautiful and different
- Be production-ready in structure
- Be easy to use by non-technical users

Avoid overengineering.

Focus on:
👉 usability  
👉 clarity  
👉 experience  

---

## 17. Deliverables

You must generate:

- Full backend structure (FastAPI)
- Full frontend structure
- Initial UI implementation
- API endpoints (high-level, no DB schema required)
- Complete documentation

## 18. Mobile Strategy (Future)

There will be NO mobile apps (iOS/Android) at the initial stage.

However, the system MUST be designed with mobile in mind:

### Requirements:
- Fully responsive frontend
- Mobile-first usability considerations
- Clean API structure to support future mobile apps

### Future Plan:
- Native apps for iOS and Android
- Shared backend (same API)
- Potential use of React Native or similar

---

## 19. Donation System (Support the Project)

MYNVOICE is free and open-source, but users (individuals or companies) should have the option to financially support the project.

### Feature Requirements:

- A visible **"Support / Donate"** or **"Buy Me a Coffee"** button in the UI
- Dedicated donation page

### Donation Page Must Include:

- Thank you / appreciation message
- Clear explanation of what the donations support:
  - Hosting
  - Infrastructure
  - Development time

### Progress Indicator:

- Monthly cost target (manually configurable via admin)
- Visual progress bar showing:
  - % of monthly costs covered
  - Remaining amount

Example:
> "£420 / £1,000 monthly cost covered (42%)"

### Payment Integration (prepare structure, not required to fully implement):
- Stripe
- PayPal
- Buy Me a Coffee API

---

## 20. Admin Panel (System Management)

Create a dedicated **Admin Panel** (restricted access).

### Purpose:
To monitor system usage, growth, and health.

### Core Metrics:

- Total registered users
- Active users (define logic)
- Total invoices created
- Total invoices paid
- Total revenue processed (optional calculation)
- Total expenses recorded

### Additional Insights:

- Growth over time (charts)
- Daily / monthly activity
- New user registrations

### Admin Capabilities:

- Configure monthly cost target (for donation system)
- Basic system settings
- View system logs (optional but recommended)

---

## 21. Product Positioning Reminder

This is:

- NOT a generic CRUD system
- NOT a boring invoice tool

This IS:
- A modern financial companion
- A clean and elegant system
- A tool people actually enjoy using

---

## 22. UX Differentiation (Reinforcement)

You are encouraged to:

- Rethink traditional invoice flows
- Reduce friction in every interaction
- Use drag & drop where it improves UX
- Provide instant feedback (real-time updates)

Avoid:
- Clunky forms
- Overloaded dashboards
- Outdated UI patterns

---

END OF SPEC