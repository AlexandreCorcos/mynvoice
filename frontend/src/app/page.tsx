"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { useEffect, type ReactNode } from "react";
import {
  FileText,
  Send,
  Wallet,
  Users,
  BarChart3,
  Globe,
  Zap,
  Check,
  ArrowRight,
  Github,
  Heart,
  Sparkles,
  ShieldCheck,
  Clock,
} from "lucide-react";
import { Logo } from "@/components/brand/logo";

/* ----------------------------------------------------------------------- */
/* Motion helpers                                                          */
/* ----------------------------------------------------------------------- */

function Reveal({
  children,
  delay = 0,
  y = 18,
  className = "",
}: {
  children: ReactNode;
  delay?: number;
  y?: number;
  className?: string;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-60px" }}
      transition={{ duration: 0.55, delay, ease: [0.21, 0.47, 0.32, 0.98] }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

/* ----------------------------------------------------------------------- */
/* Product mockups (pure CSS — no screenshots)                              */
/* ----------------------------------------------------------------------- */

function InvoiceMock() {
  const items = [
    { name: "Brand identity design", qty: "1", price: "£1,200.00" },
    { name: "Website development", qty: "1", price: "£3,400.00" },
    { name: "Monthly retainer", qty: "1", price: "£220.00" },
  ];
  return (
    <div className="w-full overflow-hidden rounded-2xl bg-white shadow-[0_24px_70px_-20px_rgba(15,76,92,0.45)] ring-1 ring-black/5">
      {/* window chrome */}
      <div className="flex items-center gap-1.5 border-b border-gray-100 bg-gray-50/80 px-4 py-3">
        <span className="h-2.5 w-2.5 rounded-full bg-[#FF5F57]" />
        <span className="h-2.5 w-2.5 rounded-full bg-[#FEBC2E]" />
        <span className="h-2.5 w-2.5 rounded-full bg-[#28C840]" />
        <span className="ml-3 text-xs font-medium text-text-secondary">
          New invoice
        </span>
        <span className="ml-auto inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-0.5 text-[11px] font-semibold text-emerald-600">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
          Draft saved
        </span>
      </div>

      <div className="p-5 sm:p-6">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wider text-petrol-mid">
              Invoice
            </p>
            <p className="mt-0.5 text-lg font-bold text-text-primary">
              INV-26-00042
            </p>
          </div>
          <div className="text-right">
            <p className="text-xs text-text-secondary">Due</p>
            <p className="text-sm font-semibold text-text-primary">
              14 Jul 2026
            </p>
          </div>
        </div>

        <div className="mt-5 space-y-2.5">
          {items.map((it, i) => (
            <div
              key={i}
              className="flex items-center gap-3 rounded-xl border border-gray-100 bg-white px-3.5 py-3"
            >
              <span className="flex h-7 w-7 flex-none cursor-grab items-center justify-center rounded-md bg-surface-light text-text-secondary">
                <svg viewBox="0 0 16 16" className="h-3.5 w-3.5" fill="currentColor">
                  <circle cx="5" cy="3" r="1.3" /><circle cx="11" cy="3" r="1.3" />
                  <circle cx="5" cy="8" r="1.3" /><circle cx="11" cy="8" r="1.3" />
                  <circle cx="5" cy="13" r="1.3" /><circle cx="11" cy="13" r="1.3" />
                </svg>
              </span>
              <span className="flex-1 truncate text-sm font-medium text-text-primary">
                {it.name}
              </span>
              <span className="hidden text-xs text-text-secondary sm:block">
                {it.qty} ×
              </span>
              <span className="text-sm font-semibold text-text-primary">
                {it.price}
              </span>
            </div>
          ))}
        </div>

        <div className="mt-5 flex items-end justify-between border-t border-dashed border-gray-200 pt-4">
          <button className="inline-flex items-center gap-1.5 rounded-lg bg-surface-light px-3 py-2 text-xs font-semibold text-petrol-dark">
            <span className="text-base leading-none">+</span> Add line item
          </button>
          <div className="text-right">
            <p className="text-xs text-text-secondary">Total due</p>
            <p className="text-2xl font-extrabold tracking-tight text-petrol-dark">
              £4,820.00
            </p>
          </div>
        </div>

        <div className="mt-5 flex gap-2.5">
          <button className="flex-1 rounded-xl bg-coral py-2.5 text-sm font-semibold text-white shadow-lg shadow-coral/25">
            Send invoice
          </button>
          <button className="rounded-xl border border-gray-200 px-4 py-2.5 text-sm font-semibold text-text-primary">
            Preview
          </button>
        </div>
      </div>
    </div>
  );
}

function MiniBars() {
  const bars = [38, 52, 44, 66, 58, 81, 72];
  return (
    <div className="flex h-16 items-end gap-1.5">
      {bars.map((h, i) => (
        <motion.span
          key={i}
          initial={{ height: 0 }}
          whileInView={{ height: `${h}%` }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: i * 0.06, ease: "easeOut" }}
          className={`w-full rounded-sm ${
            i === bars.length - 1 ? "bg-coral" : "bg-petrol-mid/35"
          }`}
        />
      ))}
    </div>
  );
}

/* ----------------------------------------------------------------------- */
/* Feature card                                                            */
/* ----------------------------------------------------------------------- */

function FeatureCard({
  icon: Icon,
  title,
  desc,
  className = "",
  tone = "light",
  children,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  desc: string;
  className?: string;
  tone?: "light" | "dark";
  children?: ReactNode;
}) {
  const dark = tone === "dark";
  return (
    <motion.div
      whileHover={{ y: -4 }}
      transition={{ duration: 0.25 }}
      className={`group relative flex flex-col overflow-hidden rounded-2xl p-6 ring-1 transition-shadow ${
        dark
          ? "bg-petrol-dark text-white ring-white/10 hover:shadow-[0_20px_50px_-20px_rgba(15,76,92,0.7)]"
          : "bg-white ring-black/5 hover:shadow-[var(--shadow-card-hover)]"
      } ${className}`}
    >
      <div
        className={`mb-4 inline-flex h-11 w-11 items-center justify-center rounded-xl ${
          dark ? "bg-white/10 text-coral-light" : "bg-petrol-dark/5 text-petrol-dark"
        }`}
      >
        <Icon className="h-5 w-5" />
      </div>
      <h3
        className={`text-base font-bold ${dark ? "text-white" : "text-text-primary"}`}
      >
        {title}
      </h3>
      <p
        className={`mt-1.5 text-sm leading-relaxed ${
          dark ? "text-white/60" : "text-text-secondary"
        }`}
      >
        {desc}
      </p>
      {children}
    </motion.div>
  );
}

/* ----------------------------------------------------------------------- */
/* Page                                                                    */
/* ----------------------------------------------------------------------- */

export default function LandingPage() {
  // The marketing landing has a fixed light brand look — dark mode is an
  // app-only preference, so make sure it never leaks onto this page.
  useEffect(() => {
    document.documentElement.classList.remove("dark");
  }, []);

  return (
    <div className="min-h-screen bg-surface-light text-text-primary">
      {/* ===== Nav ===== */}
      <header className="sticky top-0 z-50 border-b border-black/5 bg-surface-light/80 backdrop-blur-xl">
        <nav className="mx-auto flex max-w-6xl items-center justify-between px-5 py-3.5">
          <Logo height={34} priority />
          <div className="hidden items-center gap-8 md:flex">
            <a href="#features" className="text-sm font-medium text-text-secondary transition-colors hover:text-text-primary">
              Features
            </a>
            <a href="#how" className="text-sm font-medium text-text-secondary transition-colors hover:text-text-primary">
              How it works
            </a>
            <a href="#pricing" className="text-sm font-medium text-text-secondary transition-colors hover:text-text-primary">
              Pricing
            </a>
          </div>
          <div className="flex items-center gap-2.5">
            <Link
              href="/login"
              className="hidden rounded-[var(--radius-button)] px-4 py-2 text-sm font-semibold text-text-primary transition-colors hover:bg-black/5 sm:block"
            >
              Sign in
            </Link>
            <Link
              href="/register"
              className="rounded-[var(--radius-button)] bg-coral px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-coral/20 transition-all hover:bg-coral-dark hover:shadow-coral/30"
            >
              Start free
            </Link>
          </div>
        </nav>
      </header>

      {/* ===== Hero ===== */}
      <section className="relative overflow-hidden">
        {/* background flourishes */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 -z-10 opacity-[0.5]"
          style={{
            backgroundImage:
              "radial-gradient(circle at 18% 12%, rgba(44,122,123,0.18), transparent 42%), radial-gradient(circle at 88% 8%, rgba(255,107,107,0.14), transparent 38%)",
          }}
        />
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 -z-10"
          style={{
            backgroundImage:
              "linear-gradient(rgba(15,76,92,0.045) 1px, transparent 1px), linear-gradient(90deg, rgba(15,76,92,0.045) 1px, transparent 1px)",
            backgroundSize: "44px 44px",
            maskImage:
              "radial-gradient(ellipse 90% 60% at 50% 0%, black 40%, transparent 80%)",
            WebkitMaskImage:
              "radial-gradient(ellipse 90% 60% at 50% 0%, black 40%, transparent 80%)",
          }}
        />

        <div className="mx-auto grid max-w-6xl items-center gap-12 px-5 pb-20 pt-16 lg:grid-cols-[1.05fr_1fr] lg:gap-8 lg:pb-28 lg:pt-24">
          {/* copy */}
          <div>
            <Reveal>
              <span className="inline-flex items-center gap-2 rounded-full border border-petrol-mid/20 bg-white/70 px-3.5 py-1.5 text-xs font-semibold text-petrol-dark backdrop-blur">
                <Sparkles className="h-3.5 w-3.5 text-coral" />
                Free &amp; open-source · No credit card
              </span>
            </Reveal>

            <Reveal delay={0.06}>
              <h1 className="mt-5 text-[2.7rem] font-extrabold leading-[1.04] tracking-tight text-text-primary sm:text-6xl">
                Invoicing that
                <br />
                feels like{" "}
                <span className="relative whitespace-nowrap text-petrol-dark">
                  yours
                  <svg
                    viewBox="0 0 200 16"
                    className="absolute -bottom-1.5 left-0 h-2.5 w-full text-coral"
                    preserveAspectRatio="none"
                  >
                    <path
                      d="M2 11 C 50 4, 150 4, 198 9"
                      stroke="currentColor"
                      strokeWidth="4"
                      fill="none"
                      strokeLinecap="round"
                    />
                  </svg>
                </span>
                .
              </h1>
            </Reveal>

            <Reveal delay={0.12}>
              <p className="mt-6 max-w-md text-lg leading-relaxed text-text-secondary">
                Create beautiful invoices, track expenses, and get paid faster.
                MYNVOICE is the calm, modern way to run the money side of your
                business — built for freelancers and small teams.
              </p>
            </Reveal>

            <Reveal delay={0.18}>
              <div className="mt-8 flex flex-wrap items-center gap-3">
                <Link
                  href="/register"
                  className="group inline-flex items-center gap-2 rounded-[var(--radius-button)] bg-coral px-6 py-3.5 text-sm font-semibold text-white shadow-xl shadow-coral/25 transition-all hover:bg-coral-dark hover:shadow-coral/40"
                >
                  Start free
                  <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                </Link>
                <Link
                  href="/login"
                  className="inline-flex items-center gap-2 rounded-[var(--radius-button)] border border-petrol-dark/15 bg-white px-6 py-3.5 text-sm font-semibold text-petrol-dark transition-colors hover:bg-white/60"
                >
                  Sign in
                </Link>
              </div>
            </Reveal>

            <Reveal delay={0.24}>
              <div className="mt-8 flex flex-wrap items-center gap-x-6 gap-y-2 text-sm text-text-secondary">
                {["Free forever", "Open source", "Multi-currency"].map((t) => (
                  <span key={t} className="inline-flex items-center gap-1.5">
                    <Check className="h-4 w-4 text-petrol-mid" />
                    {t}
                  </span>
                ))}
              </div>
            </Reveal>
          </div>

          {/* mockup */}
          <Reveal delay={0.15} y={28} className="relative">
            <div className="relative mx-auto max-w-md lg:max-w-none">
              <InvoiceMock />

              {/* floating: paid stat */}
              <motion.div
                initial={{ opacity: 0, y: 16, rotate: -4 }}
                animate={{ opacity: 1, y: 0, rotate: -4 }}
                transition={{ delay: 0.5, duration: 0.6 }}
                className="absolute -top-8 -left-3 hidden w-40 rounded-2xl bg-white p-3.5 shadow-[0_18px_44px_-16px_rgba(15,76,92,0.5)] ring-1 ring-black/5 sm:-left-7 sm:block"
              >
                <p className="text-[11px] font-medium text-text-secondary">
                  Paid this month
                </p>
                <p className="text-xl font-extrabold text-petrol-dark">£18,640</p>
                <MiniBars />
              </motion.div>

              {/* floating: client chip */}
              <motion.div
                initial={{ opacity: 0, y: 16, rotate: 5 }}
                animate={{ opacity: 1, y: 0, rotate: 5 }}
                transition={{ delay: 0.65, duration: 0.6 }}
                className="absolute -bottom-5 -right-3 hidden items-center gap-3 rounded-2xl bg-petrol-dark p-3.5 pr-5 shadow-[0_18px_44px_-16px_rgba(15,76,92,0.7)] sm:flex"
              >
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-coral text-sm font-bold text-white">
                  AC
                </div>
                <div>
                  <p className="text-sm font-semibold text-white">Invoice paid</p>
                  <p className="text-xs text-white/55">Acme Studio · just now</p>
                </div>
                <Check className="h-5 w-5 text-emerald-400" />
              </motion.div>
            </div>
          </Reveal>
        </div>
      </section>

      {/* ===== Trust strip ===== */}
      <section className="border-y border-black/5 bg-white/60">
        <div className="mx-auto grid max-w-6xl grid-cols-2 gap-6 px-5 py-8 sm:grid-cols-4">
          {[
            { k: "100%", v: "Free & open source" },
            { k: "< 60s", v: "To your first invoice" },
            { k: "3", v: "Currencies built-in" },
            { k: "0", v: "Ads, ever" },
          ].map((s, i) => (
            <Reveal key={s.v} delay={i * 0.05}>
              <div className="text-center sm:text-left">
                <p className="text-2xl font-extrabold tracking-tight text-petrol-dark">
                  {s.k}
                </p>
                <p className="mt-0.5 text-sm text-text-secondary">{s.v}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      {/* ===== Features (bento) ===== */}
      <section id="features" className="mx-auto max-w-6xl px-5 py-20 lg:py-28">
        <Reveal>
          <div className="mx-auto max-w-2xl text-center">
            <p className="text-sm font-bold uppercase tracking-widest text-coral">
              Everything you need
            </p>
            <h2 className="mt-3 text-3xl font-extrabold tracking-tight text-text-primary sm:text-4xl">
              The whole money side, in one calm place
            </h2>
            <p className="mt-4 text-lg text-text-secondary">
              No bloat, no clutter. Just the tools that move your business
              forward — designed to be genuinely pleasant to use.
            </p>
          </div>
        </Reveal>

        <div className="mt-14 grid gap-5 md:grid-cols-3">
          {/* big dark feature */}
          <FeatureCard
            tone="dark"
            icon={Zap}
            title="Invoices in seconds"
            desc="Add line items with drag-and-drop, watch totals calculate live, save drafts, and duplicate past invoices in a click."
            className="md:col-span-2 md:row-span-1"
          >
            <div className="mt-6 grid grid-cols-3 gap-2">
              {["Drafts", "Duplicate", "Auto-totals", "Drag & drop", "Tax & discount", "Multi-currency"].map(
                (t) => (
                  <span
                    key={t}
                    className="truncate rounded-lg bg-white/[0.07] px-2.5 py-2 text-center text-[11px] font-medium text-white/70"
                  >
                    {t}
                  </span>
                )
              )}
            </div>
          </FeatureCard>

          <FeatureCard
            icon={Send}
            title="Send & get paid"
            desc="Email invoices with a polished PDF attached. A copy lands in your own inbox automatically."
          />

          <FeatureCard
            icon={BarChart3}
            title="Insightful dashboard"
            desc="Revenue, paid vs unpaid, receivables aging and monthly trends — at a glance."
          />

          <FeatureCard
            icon={Wallet}
            title="Expense tracking"
            desc="Log fixed and variable expenses with your own categories and monthly tracking."
          />

          <FeatureCard
            icon={Users}
            title="Client management"
            desc="Keep clients, contacts and addresses tidy — reused across every invoice."
          />
        </div>
      </section>

      {/* ===== How it works ===== */}
      <section id="how" className="relative overflow-hidden bg-petrol-dark py-20 lg:py-28">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 opacity-30"
          style={{
            backgroundImage:
              "radial-gradient(circle at 80% 20%, rgba(255,107,107,0.25), transparent 40%), radial-gradient(circle at 10% 90%, rgba(58,156,160,0.3), transparent 45%)",
          }}
        />
        <div className="relative mx-auto max-w-6xl px-5">
          <Reveal>
            <div className="mx-auto max-w-2xl text-center">
              <p className="text-sm font-bold uppercase tracking-widest text-coral-light">
                How it works
              </p>
              <h2 className="mt-3 text-3xl font-extrabold tracking-tight text-white sm:text-4xl">
                From blank page to paid in three steps
              </h2>
            </div>
          </Reveal>

          <div className="mt-14 grid gap-6 md:grid-cols-3">
            {[
              {
                icon: FileText,
                step: "01",
                title: "Create",
                desc: "Pick a client, drop in your line items, and let MYNVOICE handle subtotals, tax and totals automatically.",
              },
              {
                icon: Send,
                step: "02",
                title: "Send",
                desc: "Email a beautifully formatted invoice with the PDF attached — and keep a copy in your own inbox.",
              },
              {
                icon: Heart,
                step: "03",
                title: "Get paid",
                desc: "Track status from draft to paid, watch overdue invoices, and see your revenue grow on the dashboard.",
              },
            ].map((s, i) => (
              <Reveal key={s.step} delay={i * 0.1}>
                <div className="relative h-full rounded-2xl bg-white/[0.06] p-7 ring-1 ring-white/10 backdrop-blur-sm">
                  <span className="absolute right-6 top-5 text-5xl font-black text-white/[0.07]">
                    {s.step}
                  </span>
                  <div className="inline-flex h-12 w-12 items-center justify-center rounded-xl bg-coral/15 text-coral-light">
                    <s.icon className="h-6 w-6" />
                  </div>
                  <h3 className="mt-5 text-xl font-bold text-white">{s.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-white/60">
                    {s.desc}
                  </p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ===== Dashboard preview ===== */}
      <section className="mx-auto max-w-6xl px-5 py-20 lg:py-28">
        <div className="grid items-center gap-12 lg:grid-cols-2">
          <Reveal>
            <div>
              <p className="text-sm font-bold uppercase tracking-widest text-coral">
                Clarity, not clutter
              </p>
              <h2 className="mt-3 text-3xl font-extrabold tracking-tight text-text-primary sm:text-4xl">
                Know exactly where your money stands
              </h2>
              <p className="mt-4 text-lg leading-relaxed text-text-secondary">
                A dashboard that respects your attention. See revenue versus
                expenses, what&apos;s paid, what&apos;s overdue, and where your
                cash is sitting — without drowning in charts.
              </p>
              <ul className="mt-6 space-y-3">
                {[
                  "Revenue vs expenses, month by month",
                  "Receivables aging at a glance",
                  "Paid, unpaid and overdue totals",
                ].map((t) => (
                  <li key={t} className="flex items-center gap-3 text-sm font-medium text-text-primary">
                    <span className="flex h-5 w-5 flex-none items-center justify-center rounded-full bg-petrol-dark/10">
                      <Check className="h-3 w-3 text-petrol-dark" />
                    </span>
                    {t}
                  </li>
                ))}
              </ul>
            </div>
          </Reveal>

          <Reveal delay={0.1} y={28}>
            <div className="rounded-2xl bg-white p-5 shadow-[0_24px_70px_-24px_rgba(15,76,92,0.4)] ring-1 ring-black/5 sm:p-6">
              <div className="grid grid-cols-3 gap-3">
                {[
                  { l: "Revenue", v: "£42.6k", up: true },
                  { l: "Paid", v: "£31.2k", up: true },
                  { l: "Overdue", v: "£2.1k", up: false },
                ].map((s) => (
                  <div key={s.l} className="rounded-xl bg-surface-light p-3.5">
                    <p className="text-[11px] font-medium text-text-secondary">
                      {s.l}
                    </p>
                    <p className="mt-1 text-lg font-extrabold tracking-tight text-text-primary">
                      {s.v}
                    </p>
                    <span
                      className={`text-[11px] font-semibold ${
                        s.up ? "text-emerald-600" : "text-coral"
                      }`}
                    >
                      {s.up ? "▲" : "▼"} this month
                    </span>
                  </div>
                ))}
              </div>

              <div className="mt-4 rounded-xl border border-gray-100 p-4">
                <div className="mb-3 flex items-center justify-between">
                  <p className="text-sm font-semibold text-text-primary">
                    Revenue vs Expenses
                  </p>
                  <span className="flex items-center gap-3 text-[11px] text-text-secondary">
                    <span className="inline-flex items-center gap-1">
                      <span className="h-2 w-2 rounded-sm bg-petrol-dark" />
                      Revenue
                    </span>
                    <span className="inline-flex items-center gap-1">
                      <span className="h-2 w-2 rounded-sm bg-coral" />
                      Expenses
                    </span>
                  </span>
                </div>
                <div className="flex h-40 items-end gap-3">
                  {[
                    [62, 30], [48, 26], [78, 38], [55, 22], [88, 41], [70, 34],
                  ].map((pair, i) => (
                    <div key={i} className="flex flex-1 items-end justify-center gap-1">
                      <motion.span
                        initial={{ height: 0 }}
                        whileInView={{ height: `${pair[0]}%` }}
                        viewport={{ once: true }}
                        transition={{ duration: 0.6, delay: i * 0.05 }}
                        className="w-full max-w-[14px] rounded-t bg-petrol-dark"
                      />
                      <motion.span
                        initial={{ height: 0 }}
                        whileInView={{ height: `${pair[1]}%` }}
                        viewport={{ once: true }}
                        transition={{ duration: 0.6, delay: i * 0.05 + 0.08 }}
                        className="w-full max-w-[14px] rounded-t bg-coral"
                      />
                    </div>
                  ))}
                </div>
                <div className="mt-2 flex justify-between text-[10px] text-text-secondary">
                  {["Jan", "Feb", "Mar", "Apr", "May", "Jun"].map((m) => (
                    <span key={m}>{m}</span>
                  ))}
                </div>
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      {/* ===== Pricing ===== */}
      <section id="pricing" className="mx-auto max-w-6xl px-5 pb-20 lg:pb-28">
        <Reveal>
          <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-petrol-dark to-[#0a3744] px-6 py-14 text-center sm:px-12">
            <div
              aria-hidden
              className="pointer-events-none absolute inset-0 opacity-40"
              style={{
                backgroundImage:
                  "radial-gradient(circle at 85% 15%, rgba(255,107,107,0.22), transparent 35%), radial-gradient(circle at 12% 85%, rgba(58,156,160,0.28), transparent 40%)",
              }}
            />
            <div className="relative mx-auto max-w-xl">
              <span className="inline-flex items-center gap-2 rounded-full bg-white/10 px-4 py-1.5 text-xs font-semibold text-white">
                <Globe className="h-3.5 w-3.5 text-coral-light" />
                Open source · MIT
              </span>
              <h2 className="mt-5 text-4xl font-extrabold tracking-tight text-white sm:text-5xl">
                Free. Forever.
              </h2>
              <p className="mt-4 text-lg leading-relaxed text-white/70">
                MYNVOICE is free for individuals and businesses alike. No tiers,
                no paywalls, no surprise upgrades. If it helps your business, you
                can support hosting with an optional donation.
              </p>

              <div className="mt-8 flex flex-wrap justify-center gap-3">
                <Link
                  href="/register"
                  className="group inline-flex items-center gap-2 rounded-[var(--radius-button)] bg-coral px-7 py-3.5 text-sm font-semibold text-white shadow-xl shadow-coral/25 transition-all hover:bg-coral-dark"
                >
                  Create your free account
                  <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                </Link>
              </div>

              <div className="mt-8 flex flex-wrap justify-center gap-x-6 gap-y-2 text-sm text-white/60">
                {[
                  { icon: ShieldCheck, t: "Your data stays yours" },
                  { icon: Clock, t: "Set up in minutes" },
                  { icon: Heart, t: "Built with care" },
                ].map((f) => (
                  <span key={f.t} className="inline-flex items-center gap-1.5">
                    <f.icon className="h-4 w-4 text-coral-light" />
                    {f.t}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </Reveal>
      </section>

      {/* ===== Footer ===== */}
      <footer className="border-t border-black/5 bg-white/60">
        <div className="mx-auto max-w-6xl px-5 py-12">
          <div className="flex flex-col items-start justify-between gap-8 sm:flex-row">
            <div className="max-w-xs">
              <Logo height={30} href={null} />
              <p className="mt-4 text-sm leading-relaxed text-text-secondary">
                Your business. Your invoices. The free, open-source invoice &amp;
                expense manager for modern small businesses.
              </p>
            </div>
            <div className="grid grid-cols-2 gap-10 sm:gap-16">
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-text-secondary">
                  Product
                </p>
                <ul className="mt-3 space-y-2.5 text-sm">
                  <li><a href="#features" className="text-text-primary transition-colors hover:text-petrol-mid">Features</a></li>
                  <li><a href="#how" className="text-text-primary transition-colors hover:text-petrol-mid">How it works</a></li>
                  <li><a href="#pricing" className="text-text-primary transition-colors hover:text-petrol-mid">Pricing</a></li>
                </ul>
              </div>
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-text-secondary">
                  Get started
                </p>
                <ul className="mt-3 space-y-2.5 text-sm">
                  <li><Link href="/register" className="text-text-primary transition-colors hover:text-petrol-mid">Create account</Link></li>
                  <li><Link href="/login" className="text-text-primary transition-colors hover:text-petrol-mid">Sign in</Link></li>
                  <li><Link href="/support" className="inline-flex items-center gap-1.5 text-text-primary transition-colors hover:text-petrol-mid"><Heart className="h-3.5 w-3.5 text-coral" />Support us</Link></li>
                </ul>
              </div>
            </div>
          </div>

          <div className="mt-10 flex flex-col items-center justify-between gap-4 border-t border-black/5 pt-6 sm:flex-row">
            <p className="text-xs text-text-secondary">
              © 2026 MYNVOICE · Free &amp; open-source
            </p>
            <a
              href="https://github.com/AlexandreCorcos/mynvoice"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 text-xs font-medium text-text-secondary transition-colors hover:text-text-primary"
            >
              <Github className="h-4 w-4" />
              Star on GitHub
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}
