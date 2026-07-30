"use client";

/* =========================================================================
   Form primitives.

   Labels are always visible — a placeholder is not a label, and the moment
   someone types, a placeholder-only field forgets what it was asking for.
   Errors sit next to the field that caused them.
   ========================================================================= */

import { Search } from "lucide-react";
import type { ComponentProps, ReactNode } from "react";
import { cn } from "@/lib/utils";

const CONTROL =
  "w-full rounded-[10px] bg-card px-3 text-[13.5px] text-ink ring-1 ring-line transition-colors " +
  "placeholder:text-ink-muted/70 focus:outline-none focus:ring-2 focus:ring-brass-soft " +
  "disabled:cursor-not-allowed disabled:opacity-60";

export function Field({
  label,
  hint,
  error,
  required,
  children,
  className,
}: {
  label?: string;
  hint?: string;
  error?: string;
  required?: boolean;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("min-w-0", className)}>
      {label ? (
        <label className="mb-1.5 block text-[12px] font-semibold text-ink">
          {label}
          {required ? <span className="ml-0.5 text-negative">*</span> : null}
        </label>
      ) : null}
      {children}
      {error ? (
        <p className="mt-1.5 text-[11.5px] font-medium text-negative">{error}</p>
      ) : hint ? (
        <p className="mt-1.5 text-[11.5px] text-ink-muted">{hint}</p>
      ) : null}
    </div>
  );
}

export function Input({
  className,
  invalid,
  ...rest
}: ComponentProps<"input"> & { invalid?: boolean }) {
  return (
    <input
      className={cn(CONTROL, "h-10", invalid && "ring-negative focus:ring-negative", className)}
      {...rest}
    />
  );
}

export function Textarea({
  className,
  ...rest
}: ComponentProps<"textarea">) {
  return <textarea className={cn(CONTROL, "min-h-[88px] py-2.5", className)} {...rest} />;
}

export function Select({
  className,
  children,
  ...rest
}: ComponentProps<"select">) {
  return (
    <select className={cn(CONTROL, "h-10 cursor-pointer pr-8", className)} {...rest}>
      {children}
    </select>
  );
}

/**
 * A switch, with its label as part of the control — the whole row is the
 * hit target, which is the difference between "works on a phone" and
 * "technically has a checkbox".
 */
export function Toggle({
  checked,
  onChange,
  label,
  hint,
  className,
}: {
  checked: boolean;
  onChange: (next: boolean) => void;
  label: string;
  hint?: string;
  className?: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className={cn(
        "flex w-full items-start gap-3 rounded-[10px] p-1 text-left transition-colors",
        className
      )}
    >
      <span
        className={cn(
          "relative mt-0.5 inline-flex h-[22px] w-[38px] flex-none rounded-full transition-colors duration-200",
          checked ? "bg-brass" : "bg-line"
        )}
      >
        <span
          className={cn(
            "pointer-events-none absolute top-[3px] h-4 w-4 rounded-full bg-white shadow-sm transition-transform duration-200",
            checked ? "translate-x-[19px]" : "translate-x-[3px]"
          )}
        />
      </span>
      <span className="min-w-0">
        <span className="block text-[13px] font-semibold text-ink">{label}</span>
        {hint ? (
          <span className="mt-0.5 block text-[11.5px] leading-relaxed text-ink-muted">
            {hint}
          </span>
        ) : null}
      </span>
    </button>
  );
}

export function SearchInput({
  className,
  ...rest
}: ComponentProps<"input">) {
  return (
    <div className={cn("relative", className)}>
      <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-muted" />
      <input
        type="search"
        className={cn(CONTROL, "h-10 pl-9")}
        {...rest}
      />
    </div>
  );
}
