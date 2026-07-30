"use client";

/* =========================================================================
   Dashboard.

   Reads top to bottom as one answer to "where does my money stand?":

     1. four figures — revenue, paid, outstanding, overdue
     2. the trend — revenue as a brass area over neutral expense bars
     3. what's owed — receivables ageing on a healthy → overdue ramp
     4. the ledger — sales, receipts and dues by period

   Everything is a token. If a `dark:` override shows up here, something is
   wrong with the token, not the screen.
   ========================================================================= */

import { useCallback, useEffect, useState } from "react";
import { motion } from "framer-motion";
import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  Clock,
  Plus,
  TrendingUp,
  Users,
  Wallet,
} from "lucide-react";
import { api } from "@/lib/api";
import { useAuth } from "@/contexts/auth-context";
import {
  formatCompactCurrency,
  formatCurrency,
  formatPeriodLabel,
  num,
} from "@/lib/utils";
import { EASE_OUT } from "@/components/motion";
import { PageHeader } from "@/components/app/page-header";
import { ButtonLink } from "@/components/app/button";
import { Panel, PanelHeader, Overline } from "@/components/app/panel";
import { MetricCard } from "@/components/app/metric";
import { ChartLegend, RevenueTrendChart } from "@/components/app/charts";
import { AGEING_RAMP, SegmentedBar } from "@/components/app/segmented-bar";
import { OnboardingChecklist } from "@/components/onboarding";
import type { DashboardData } from "@/types";

function greeting(date = new Date()) {
  const h = date.getHours();
  if (h < 12) return "Good morning";
  if (h < 18) return "Good afternoon";
  return "Good evening";
}

/* ------------------------------------------------------------------ */
/* Skeleton                                                            */
/* ------------------------------------------------------------------ */

function Shimmer({ className }: { className?: string }) {
  return <div className={`animate-pulse rounded-[16px] bg-elevated ${className}`} />;
}

function DashboardSkeleton() {
  return (
    <div className="space-y-6">
      <div className="space-y-3">
        <Shimmer className="h-4 w-32 rounded-full" />
        <Shimmer className="h-8 w-72 rounded-lg" />
      </div>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Shimmer key={i} className="h-[136px]" />
        ))}
      </div>
      <div className="grid gap-4 lg:grid-cols-[1.55fr_1fr]">
        <Shimmer className="h-[400px]" />
        <Shimmer className="h-[400px]" />
      </div>
      <Shimmer className="h-64" />
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Screen                                                              */
/* ------------------------------------------------------------------ */

export default function DashboardPage() {
  const { user } = useAuth();
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const name = user?.first_name ?? null;

  const fetchDashboard = useCallback(async () => {
    try {
      const res = await api.get<DashboardData>("/dashboard/");
      setData(res);
    } catch {
      /* leave the empty state in place */
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDashboard();
  }, [fetchDashboard]);

  if (loading) return <DashboardSkeleton />;

  const stats = data?.stats;
  const trends = data?.monthly_trends ?? [];
  const aging = data?.aging ?? [];
  const periodSummary = data?.period_summary ?? [];
  const currency = data?.currency ?? "GBP";

  const money = (n: number) => formatCurrency(n, currency);
  const compact = (n: number) => formatCompactCurrency(n, currency);

  const chartData = trends.map((t) => ({
    month: formatPeriodLabel(t.month),
    revenue: num(t.revenue),
    expenses: num(t.expenses),
  }));

  const revenueSeries = chartData.map((d) => d.revenue);

  /* Month-on-month change, only claimed when there are two months to compare. */
  const delta = (() => {
    if (revenueSeries.length < 2) return null;
    const [prev, last] = revenueSeries.slice(-2);
    if (!prev) return null;
    const pct = ((last - prev) / prev) * 100;
    return { text: `${Math.abs(pct).toFixed(0)}%`, up: pct >= 0 };
  })();

  const totalReceivables = aging.reduce((sum, b) => sum + num(b.amount), 0);
  const segments = aging.map((b, i) => ({
    label: b.label,
    amount: num(b.amount),
    count: b.count,
    tone: AGEING_RAMP[i] ?? AGEING_RAMP[AGEING_RAMP.length - 1],
  }));

  const overdueCount = stats?.invoices_overdue_count ?? 0;
  const hasTrend = chartData.length > 0;

  return (
    <div className="space-y-6">
      <OnboardingChecklist />

      <PageHeader
        eyebrow={greeting()}
        title={
          name ? (
            <>
              Here&apos;s where your money stands, {name}.
            </>
          ) : (
            "Here's where your money stands."
          )
        }
        subtitle="Everything that matters on one screen — and nothing that doesn't."
        actions={
          <>
            <ButtonLink href="/clients" variant="secondary">
              <Users className="h-4 w-4" />
              Add client
            </ButtonLink>
            <ButtonLink href="/invoices/new" variant="primary">
              <Plus className="h-4 w-4" />
              New invoice
            </ButtonLink>
          </>
        }
      />

      {/* ── the four figures ─────────────────────────────────────── */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          index={0}
          label="Total revenue"
          value={num(stats?.total_revenue)}
          format={money}
          icon={TrendingUp}
          tone="brass"
          delta={delta?.text}
          deltaUp={delta?.up}
          caption={delta ? "vs last month" : "all time"}
          series={revenueSeries}
          href="/reports"
        />
        <MetricCard
          index={1}
          label="Paid"
          value={num(stats?.total_paid)}
          format={money}
          icon={CheckCircle2}
          tone="positive"
          caption={`${stats?.invoices_paid_count ?? 0} settled`}
          href="/payments"
        />
        <MetricCard
          index={2}
          label="Outstanding"
          value={num(stats?.total_unpaid)}
          format={money}
          icon={Clock}
          caption={`${stats?.invoices_unpaid_count ?? 0} awaiting payment`}
          href="/invoices"
        />
        <MetricCard
          index={3}
          label="Overdue"
          value={num(stats?.total_overdue)}
          format={money}
          icon={AlertTriangle}
          tone={overdueCount > 0 ? "negative" : "default"}
          caption={
            overdueCount > 0
              ? `${overdueCount} need chasing`
              : "nothing overdue"
          }
          href="/invoices"
        />
      </div>

      {/* ── trend + receivables ──────────────────────────────────── */}
      <div className="grid gap-4 lg:grid-cols-[1.55fr_1fr]">
        <Panel>
          <PanelHeader
            title="Revenue trend"
            caption="Money in against money out, month by month"
            action={<ChartLegend items={[{ label: "Revenue", tone: "brass" }, { label: "Expenses", tone: "muted" }]} />}
          />

          <div className="mt-6">
            {hasTrend ? (
              <RevenueTrendChart
                data={chartData}
                formatValue={money}
                compactValue={compact}
                height={358}
              />
            ) : (
              <div className="flex h-[358px] flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-line text-center">
                <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-elevated">
                  <TrendingUp className="h-5 w-5 text-ink-muted" />
                </span>
                <p className="max-w-[16rem] text-[13px] text-ink-muted">
                  No trend yet. Send your first invoice and this fills in.
                </p>
                <ButtonLink href="/invoices/new" variant="primary" size="sm">
                  Create an invoice
                </ButtonLink>
              </div>
            )}
          </div>
        </Panel>

        <Panel>
          <PanelHeader
            title="Receivables ageing"
            caption="How long your money has been out there"
          />

          <p className="mt-5 text-[32px] font-extrabold leading-none tracking-[-0.025em] tabular-nums text-ink">
            {money(totalReceivables)}
          </p>
          <p className="mt-1.5 text-[12.5px] text-ink-muted">
            across {aging.reduce((s, b) => s + b.count, 0)} open{" "}
            {aging.reduce((s, b) => s + b.count, 0) === 1 ? "invoice" : "invoices"}
          </p>

          {totalReceivables > 0 ? (
            <SegmentedBar
              className="mt-6"
              segments={segments}
              total={totalReceivables}
              formatValue={money}
            />
          ) : (
            <div className="mt-6 rounded-xl border border-dashed border-line px-4 py-8 text-center">
              <CheckCircle2 className="mx-auto h-6 w-6 text-positive" />
              <p className="mt-2.5 text-[13px] font-semibold text-ink">All settled</p>
              <p className="mt-0.5 text-[12px] text-ink-muted">
                Nothing is waiting to be paid.
              </p>
            </div>
          )}
        </Panel>
      </div>

      {/* ── the ledger ───────────────────────────────────────────── */}
      <Panel padded={false}>
        <div className="flex items-start justify-between gap-4 p-5 sm:p-6">
          <PanelHeader
            title="Sales, receipts & dues"
            caption="What you billed, what arrived, what's still out"
            className="flex-1"
          />
          <ButtonLink href="/reports" variant="ghost" size="sm">
            Full reports
            <ArrowRight className="h-3.5 w-3.5" />
          </ButtonLink>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[520px] text-left">
            <thead>
              <tr className="border-y border-line bg-elevated/40">
                <th className="py-2.5 pl-5 pr-4 sm:pl-6">
                  <Overline>Period</Overline>
                </th>
                <th className="px-4 py-2.5 text-right">
                  <Overline>Sales</Overline>
                </th>
                <th className="px-4 py-2.5 text-right">
                  <Overline>Receipts</Overline>
                </th>
                <th className="py-2.5 pl-4 pr-5 text-right sm:pr-6">
                  <Overline>Due</Overline>
                </th>
              </tr>
            </thead>
            <tbody>
              {periodSummary.map((row, i) => (
                <motion.tr
                  key={row.label}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.45, delay: 0.1 + i * 0.05, ease: EASE_OUT }}
                  className="border-b border-line/70 transition-colors last:border-0 hover:bg-elevated/40"
                >
                  <td className="py-3 pl-5 pr-4 text-[13.5px] font-semibold text-ink sm:pl-6">
                    {row.label}
                  </td>
                  <td className="px-4 py-3 text-right text-[13.5px] tabular-nums text-ink">
                    {money(num(row.sales))}
                  </td>
                  <td className="px-4 py-3 text-right text-[13.5px] font-semibold tabular-nums text-positive">
                    {money(num(row.receipts))}
                  </td>
                  <td className="py-3 pl-4 pr-5 text-right text-[13.5px] font-semibold tabular-nums text-ink sm:pr-6">
                    <span className={num(row.due) > 0 ? "text-negative" : "text-ink-muted"}>
                      {money(num(row.due))}
                    </span>
                  </td>
                </motion.tr>
              ))}
              {periodSummary.length === 0 ? (
                <tr>
                  <td colSpan={4} className="py-10 text-center text-[13px] text-ink-muted">
                    No period data yet.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </Panel>

      {/* ── the quieter counts ───────────────────────────────────── */}
      <div className="grid gap-4 sm:grid-cols-3">
        {[
          {
            label: "Total expenses",
            value: money(num(stats?.total_expenses)),
            caption: "recorded this year",
            icon: Wallet,
            href: "/expenses",
          },
          {
            label: "Invoices",
            value: String(stats?.invoices_count ?? 0),
            caption: "created all time",
            icon: Clock,
            href: "/invoices",
          },
          {
            label: "Clients",
            value: String(stats?.clients_count ?? 0),
            caption: "on your books",
            icon: Users,
            href: "/clients",
          },
        ].map((c, i) => (
          <motion.a
            key={c.label}
            href={c.href}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.15 + i * 0.06, ease: EASE_OUT }}
            className="group flex items-center gap-4 rounded-[16px] bg-card p-4 ring-1 ring-line transition-colors hover:bg-elevated/40"
          >
            <span className="flex h-10 w-10 flex-none items-center justify-center rounded-[11px] bg-elevated text-ink-muted">
              <c.icon className="h-[18px] w-[18px]" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-[12px] text-ink-muted">{c.label}</span>
              <span className="block text-[18px] font-extrabold leading-tight tabular-nums text-ink">
                {c.value}
              </span>
              <span className="block text-[11.5px] text-ink-muted">{c.caption}</span>
            </span>
            <ArrowRight className="h-4 w-4 flex-none text-ink-muted opacity-0 transition-all duration-300 group-hover:translate-x-0.5 group-hover:opacity-100" />
          </motion.a>
        ))}
      </div>
    </div>
  );
}
