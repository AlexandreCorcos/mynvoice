"use client";

/* =========================================================================
   Reports.

   One question per block: how much came in against what was billed, who
   it came from, and what it cost to earn. The period and year controls sit
   together at the top because changing one almost always means checking
   the other.

   Three series on the main chart, each with a meaning rather than a
   palette slot: brass is what you billed, positive is what arrived,
   negative is what's still out.
   ========================================================================= */

import { useCallback, useEffect, useMemo, useState } from "react";
import { BarChart3, ChevronLeft, ChevronRight, Receipt, TrendingUp, Wallet } from "lucide-react";
import { api } from "@/lib/api";
import {
  formatCompactCurrency,
  formatCurrency,
  formatPeriodLabel,
  num,
} from "@/lib/utils";
import { useAuth } from "@/contexts/auth-context";
import { PageHeader } from "@/components/app/page-header";
import { Button } from "@/components/app/button";
import { Panel, PanelHeader } from "@/components/app/panel";
import { MetricCard } from "@/components/app/metric";
import { SegmentedControl } from "@/components/app/segmented-control";
import { ChartLegend, GroupedBarChart, RankedList } from "@/components/app/charts";
import EmptyState from "@/components/ui/empty-state";

/* ------------------------------------------------------------------ */
/* Types                                                               */
/* ------------------------------------------------------------------ */

type PeriodRevenue = {
  period: string;
  invoiced: number;
  received: number;
  outstanding: number;
};

type ClientRevenue = {
  client_id: string | null;
  client_name: string | null;
  invoiced: number;
  received: number;
  outstanding: number;
};

type ExpenseCategoryRow = {
  category: string | null;
  total: number;
  count: number;
};

type ReportData = {
  summary: {
    total_invoiced: number;
    total_received: number;
    total_outstanding: number;
    total_expenses: number;
  };
  revenue_by_period: PeriodRevenue[];
  revenue_by_client: ClientRevenue[];
  expenses_by_category: ExpenseCategoryRow[];
};

type Period = "month" | "quarter" | "year";

const CURRENT_YEAR = new Date().getFullYear();

/* ------------------------------------------------------------------ */
/* Screen                                                              */
/* ------------------------------------------------------------------ */

export default function ReportsPage() {
  const { user } = useAuth();
  const currency = user?.currency || "GBP";

  const [period, setPeriod] = useState<Period>("month");
  const [year, setYear] = useState(CURRENT_YEAR);
  const [data, setData] = useState<ReportData | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchReports = useCallback(async () => {
    setLoading(true);
    try {
      setData(await api.get<ReportData>(`/reports/?period=${period}&year=${year}`));
    } catch {
      /* keep whatever was on screen rather than blanking it */
    } finally {
      setLoading(false);
    }
  }, [period, year]);

  useEffect(() => {
    fetchReports();
  }, [fetchReports]);

  const money = (n: number) => formatCurrency(n, currency);
  const compact = (n: number) => formatCompactCurrency(n, currency);

  const summary = data?.summary;
  const byPeriod = useMemo(() => data?.revenue_by_period ?? [], [data]);
  const byClient = data?.revenue_by_client ?? [];
  const byCategory = data?.expenses_by_category ?? [];

  /* Collection rate is the number this screen exists to surface: of what
     you billed, how much actually landed. */
  const collected = num(summary?.total_invoiced)
    ? Math.round((num(summary?.total_received) / num(summary?.total_invoiced)) * 100)
    : 0;

  const net = num(summary?.total_received) - num(summary?.total_expenses);
  const receivedSeries = byPeriod.map((p) => num(p.received));
  const hasData = byPeriod.some(
    (p) => num(p.invoiced) > 0 || num(p.received) > 0 || num(p.outstanding) > 0
  );

  if (loading && !data) {
    return (
      <div className="space-y-6">
        <div className="h-4 w-28 animate-pulse rounded-full bg-elevated" />
        <div className="h-9 w-80 animate-pulse rounded-lg bg-elevated" />
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-[136px] animate-pulse rounded-[16px] bg-elevated" />
          ))}
        </div>
        <div className="h-[420px] animate-pulse rounded-[16px] bg-elevated" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Reports"
        title="What the year actually did."
        subtitle="Billed against collected, who it came from, and what it cost to earn."
      />

      {/* ── period controls ──────────────────────────────────────── */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <SegmentedControl<Period>
          layoutId="report-period"
          value={period}
          onChange={setPeriod}
          options={[
            { value: "month", label: "Monthly" },
            { value: "quarter", label: "Quarterly" },
            { value: "year", label: "Yearly" },
          ]}
        />

        <div className="flex items-center gap-1 rounded-[12px] bg-elevated p-1 ring-1 ring-line">
          <Button
            variant="ghost"
            size="sm"
            aria-label="Previous year"
            onClick={() => setYear((y) => y - 1)}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="min-w-[4rem] text-center text-[13.5px] font-bold tabular-nums text-ink">
            {year}
          </span>
          <Button
            variant="ghost"
            size="sm"
            aria-label="Next year"
            disabled={year >= CURRENT_YEAR}
            onClick={() => setYear((y) => Math.min(CURRENT_YEAR, y + 1))}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* ── the four figures ─────────────────────────────────────── */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          index={0}
          label="Invoiced"
          value={num(summary?.total_invoiced)}
          format={money}
          icon={Receipt}
          tone="brass"
          caption={`in ${year}`}
          series={receivedSeries}
        />
        <MetricCard
          index={1}
          label="Received"
          value={num(summary?.total_received)}
          format={money}
          icon={TrendingUp}
          tone="positive"
          delta={num(summary?.total_invoiced) ? `${collected}%` : undefined}
          deltaUp={collected >= 70}
          caption="of what you billed"
        />
        <MetricCard
          index={2}
          label="Still outstanding"
          value={num(summary?.total_outstanding)}
          format={money}
          icon={BarChart3}
          tone={num(summary?.total_outstanding) > 0 ? "negative" : "default"}
          caption="not yet collected"
        />
        <MetricCard
          index={3}
          label="Expenses"
          value={num(summary?.total_expenses)}
          format={money}
          icon={Wallet}
          caption={`net ${money(net)}`}
        />
      </div>

      {/* ── the trend ────────────────────────────────────────────── */}
      <Panel>
        <PanelHeader
          title={
            period === "month"
              ? "Month by month"
              : period === "quarter"
                ? "Quarter by quarter"
                : "Year by year"
          }
          caption="Billed, collected, and what's still out"
          action={
            <ChartLegend
              items={[
                { label: "Invoiced", tone: "brass" },
                { label: "Received", tone: "positive" },
                { label: "Outstanding", tone: "negative" },
              ]}
            />
          }
        />

        <div className="mt-6">
          {hasData ? (
            <GroupedBarChart
              data={byPeriod.map((p) => ({
                period: formatPeriodLabel(p.period),
                invoiced: num(p.invoiced),
                received: num(p.received),
                outstanding: num(p.outstanding),
              }))}
              xKey="period"
              series={[
                { key: "invoiced", name: "Invoiced", tone: "brass" },
                { key: "received", name: "Received", tone: "positive" },
                { key: "outstanding", name: "Outstanding", tone: "negative" },
              ]}
              formatValue={money}
              compactValue={compact}
              height={340}
            />
          ) : (
            <div className="flex h-[340px] items-center justify-center rounded-xl border border-dashed border-line">
              <p className="max-w-[18rem] text-center text-[13px] text-ink-muted">
                Nothing recorded for {year} yet. Send an invoice and this fills in.
              </p>
            </div>
          )}
        </div>
      </Panel>

      {/* ── who and what ─────────────────────────────────────────── */}
      <div className="grid gap-4 lg:grid-cols-2">
        <Panel>
          <PanelHeader title="Top clients" caption="By what they've actually paid" />
          <div className="mt-5">
            <RankedList
              tone="positive"
              formatValue={money}
              emptyLabel="No client revenue recorded for this year."
              rows={[...byClient]
                .sort((a, b) => num(b.received) - num(a.received))
                .slice(0, 6)
                .map((c) => ({
                  label: c.client_name ?? "No client",
                  value: num(c.received),
                  caption:
                    num(c.outstanding) > 0
                      ? `${money(num(c.outstanding))} still outstanding`
                      : undefined,
                }))}
            />
          </div>
        </Panel>

        <Panel>
          <PanelHeader title="Expenses by category" caption="Where the money went" />
          <div className="mt-5">
            <RankedList
              tone="muted"
              formatValue={money}
              emptyLabel="No expenses recorded for this year."
              rows={[...byCategory]
                .sort((a, b) => num(b.total) - num(a.total))
                .slice(0, 6)
                .map((c) => ({
                  label: c.category ?? "Uncategorised",
                  value: num(c.total),
                  caption: `${c.count} ${c.count === 1 ? "entry" : "entries"}`,
                }))}
            />
          </div>
        </Panel>
      </div>

      {!loading && !hasData && byClient.length === 0 && byCategory.length === 0 ? (
        <EmptyState
          icon={BarChart3}
          title={`Nothing to report for ${year}`}
          description="Reports fill in as you send invoices, record payments and log expenses."
        />
      ) : null}
    </div>
  );
}
