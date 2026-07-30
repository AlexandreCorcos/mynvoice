"use client";

/* =========================================================================
   Chart theming.

   Every chart in the app comes through here so they share one axis style,
   one tooltip and one colour logic:

     · brass       — the series that carries the meaning (money in)
     · ink-muted   — the neutral series that gives it context (money out)
     · positive /
       negative    — only where the sign itself is the point

   No rainbows, no per-series colour picking at the call site.
   ========================================================================= */

import { motion } from "framer-motion";
import {
  Area,
  Bar,
  CartesianGrid,
  ComposedChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { EASE_OUT } from "@/components/motion";

export type TrendPoint = { month: string; revenue: number; expenses: number };

const axis = {
  tick: { fontSize: 11, fill: "var(--ink-muted)" },
  axisLine: false as const,
  tickLine: false as const,
};

/* ------------------------------------------------------------------ */
/* Tooltip                                                             */
/* ------------------------------------------------------------------ */

type TooltipEntry = { name?: string; value?: number | string; color?: string };

function ChartTooltip({
  active,
  payload,
  label,
  formatValue,
}: {
  active?: boolean;
  payload?: TooltipEntry[];
  label?: string | number;
  formatValue: (n: number) => string;
}) {
  if (!active || !payload?.length) return null;

  return (
    <div className="rounded-xl bg-card px-3 py-2.5 shadow-[var(--shadow-dropdown)] ring-1 ring-line">
      <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-ink-muted">
        {label}
      </p>
      <div className="mt-2 space-y-1.5">
        {payload.map((entry) => (
          <div key={entry.name} className="flex items-center gap-2.5">
            <span
              className="h-2 w-2 flex-none rounded-[3px]"
              style={{ background: entry.color }}
            />
            <span className="text-[12px] text-ink-muted">{entry.name}</span>
            <span className="ml-auto text-[12.5px] font-bold tabular-nums text-ink">
              {formatValue(Number(entry.value ?? 0))}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Revenue vs expenses                                                 */
/* ------------------------------------------------------------------ */

/**
 * Revenue as a brass area (the story), expenses as neutral bars behind it
 * (the context) — the same pairing the marketing page uses, so the product
 * looks like the thing that was advertised.
 */
export function RevenueTrendChart({
  data,
  formatValue,
  compactValue,
  height = 300,
}: {
  data: TrendPoint[];
  formatValue: (n: number) => string;
  /** Short form for the Y axis, e.g. "£4.2k". */
  compactValue: (n: number) => string;
  height?: number;
}) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <ComposedChart data={data} margin={{ top: 8, right: 4, bottom: 0, left: -12 }}>
        <defs>
          <linearGradient id="mv-revenue" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--brass)" stopOpacity="0.28" />
            <stop offset="100%" stopColor="var(--brass)" stopOpacity="0.02" />
          </linearGradient>
        </defs>

        <CartesianGrid stroke="var(--line)" vertical={false} />
        <XAxis dataKey="month" {...axis} dy={6} />
        <YAxis {...axis} width={64} tickFormatter={compactValue} />

        <Tooltip
          cursor={{ fill: "var(--elevated)", radius: 6 }}
          content={(props) => (
            <ChartTooltip
              active={props.active}
              payload={props.payload as TooltipEntry[] | undefined}
              label={props.label as string | number | undefined}
              formatValue={formatValue}
            />
          )}
        />

        <Bar
          dataKey="expenses"
          name="Expenses"
          fill="var(--ink-muted)"
          fillOpacity={0.4}
          radius={[4, 4, 0, 0]}
          maxBarSize={26}
          isAnimationActive={false}
        />
        <Area
          dataKey="revenue"
          name="Revenue"
          type="monotone"
          stroke="var(--brass)"
          strokeWidth={2.5}
          fill="url(#mv-revenue)"
          dot={false}
          isAnimationActive={false}
          activeDot={{
            r: 4,
            fill: "var(--brass)",
            stroke: "var(--card)",
            strokeWidth: 3,
          }}
        />
      </ComposedChart>
    </ResponsiveContainer>
  );
}

/* ------------------------------------------------------------------ */
/* Grouped bars                                                        */
/* ------------------------------------------------------------------ */

export type SeriesTone = "brass" | "muted" | "positive" | "negative";

const SERIES_FILL: Record<SeriesTone, string> = {
  brass: "var(--brass)",
  muted: "var(--ink-muted)",
  positive: "var(--positive)",
  negative: "var(--negative)",
};

export type BarSeries = { key: string; name: string; tone: SeriesTone };

/**
 * Several series side by side, for reports where the comparison between
 * them *is* the point. Tones are semantic, not decorative: brass is what
 * you billed, positive is what arrived, negative is what's still out.
 */
export function GroupedBarChart({
  data,
  series,
  xKey,
  formatValue,
  compactValue,
  height = 320,
}: {
  data: Record<string, string | number>[];
  series: BarSeries[];
  xKey: string;
  formatValue: (n: number) => string;
  compactValue: (n: number) => string;
  height?: number;
}) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <ComposedChart data={data} margin={{ top: 8, right: 4, bottom: 0, left: -12 }}>
        <CartesianGrid stroke="var(--line)" vertical={false} />
        <XAxis dataKey={xKey} {...axis} dy={6} />
        <YAxis {...axis} width={64} tickFormatter={compactValue} />
        <Tooltip
          cursor={{ fill: "var(--elevated)", radius: 6 }}
          content={(props) => (
            <ChartTooltip
              active={props.active}
              payload={props.payload as TooltipEntry[] | undefined}
              label={props.label as string | number | undefined}
              formatValue={formatValue}
            />
          )}
        />
        {series.map((s) => (
          <Bar
            key={s.key}
            dataKey={s.key}
            name={s.name}
            fill={SERIES_FILL[s.tone]}
            fillOpacity={s.tone === "muted" ? 0.35 : 0.9}
            radius={[4, 4, 0, 0]}
            maxBarSize={22}
            /* Recharts' own grow-in is unreliable here — with a dozen
               categories the rectangles simply never mount. The panel
               already animates in around the chart, so nothing is lost. */
            isAnimationActive={false}
          />
        ))}
      </ComposedChart>
    </ResponsiveContainer>
  );
}

/* ------------------------------------------------------------------ */
/* Ranked list                                                         */
/* ------------------------------------------------------------------ */

/**
 * A ranked breakdown reads better as a list with proportion bars than as
 * a pie — you can compare the values directly and read the labels without
 * a legend.
 */
export function RankedList({
  rows,
  formatValue,
  tone = "brass",
  emptyLabel = "Nothing to show yet.",
}: {
  rows: { label: string; value: number; caption?: string }[];
  formatValue: (n: number) => string;
  tone?: SeriesTone;
  emptyLabel?: string;
}) {
  const max = Math.max(...rows.map((r) => r.value), 0);

  if (rows.length === 0) {
    return <p className="py-8 text-center text-[13px] text-ink-muted">{emptyLabel}</p>;
  }

  return (
    <ul className="space-y-3">
      {rows.map((r, i) => (
        <li key={`${r.label}-${i}`}>
          <div className="flex items-baseline justify-between gap-3">
            <span className="min-w-0 truncate text-[13px] font-medium text-ink">
              {r.label}
            </span>
            <span className="flex-none text-[13px] font-bold tabular-nums text-ink">
              {formatValue(r.value)}
            </span>
          </div>
          <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-elevated">
            <motion.span
              initial={{ width: 0 }}
              whileInView={{ width: `${max > 0 ? (r.value / max) * 100 : 0}%` }}
              viewport={{ once: true }}
              transition={{ duration: 0.7, delay: 0.1 + i * 0.05, ease: EASE_OUT }}
              className="block h-full rounded-full"
              style={{ background: SERIES_FILL[tone], opacity: tone === "muted" ? 0.4 : 1 }}
            />
          </div>
          {r.caption ? (
            <p className="mt-1 text-[11.5px] text-ink-muted">{r.caption}</p>
          ) : null}
        </li>
      ))}
    </ul>
  );
}

/** The legend, written out rather than left to recharts. */
export function ChartLegend({
  items,
}: {
  items: { label: string; tone: "brass" | "muted" | "positive" | "negative" }[];
}) {
  const fill: Record<string, string> = {
    brass: "bg-brass",
    muted: "bg-ink-muted/35",
    positive: "bg-positive",
    negative: "bg-negative",
  };
  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5">
      {items.map((i) => (
        <span key={i.label} className="inline-flex items-center gap-1.5 text-[11.5px] text-ink-muted">
          <span className={`h-2 w-2 rounded-[3px] ${fill[i.tone]}`} />
          {i.label}
        </span>
      ))}
    </div>
  );
}
