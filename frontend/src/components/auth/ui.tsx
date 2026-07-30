"use client";

/* =========================================================================
   Auth screen pieces.

   Five screens share a heading, an error banner and a password field, so
   those live here rather than being retyped with small differences on
   each one.
   ========================================================================= */

import { AnimatePresence, motion } from "framer-motion";
import { useState, type ComponentProps, type ReactNode } from "react";
import { AlertCircle, Eye, EyeOff } from "lucide-react";
import { EASE_OUT } from "@/components/motion";
import { Input } from "@/components/app/form";
import { cn } from "@/lib/utils";

export function AuthHeading({
  title,
  subtitle,
}: {
  title: string;
  subtitle?: ReactNode;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: EASE_OUT }}
    >
      <h1 className="text-[26px] font-extrabold leading-tight tracking-[-0.025em] text-ink">
        {title}
      </h1>
      {subtitle ? (
        <p className="mt-1.5 text-[14px] leading-relaxed text-ink-muted">{subtitle}</p>
      ) : null}
    </motion.div>
  );
}

/** Errors sit above the fields, and never shift the layout when absent. */
export function AuthError({ message }: { message?: string }) {
  return (
    <AnimatePresence mode="wait">
      {message ? (
        <motion.div
          key={message}
          initial={{ opacity: 0, y: -6, height: 0 }}
          animate={{ opacity: 1, y: 0, height: "auto" }}
          exit={{ opacity: 0, height: 0 }}
          transition={{ duration: 0.28, ease: EASE_OUT }}
          className="overflow-hidden"
        >
          <p
            role="alert"
            className="flex items-start gap-2.5 rounded-[10px] bg-negative/10 px-3.5 py-3 text-[13px] font-medium text-negative ring-1 ring-negative/20"
          >
            <AlertCircle className="mt-[1px] h-4 w-4 flex-none" />
            {message}
          </p>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}

/* ------------------------------------------------------------------ */
/* Password                                                            */
/* ------------------------------------------------------------------ */

/** Cheap, honest strength: length first, then variety. Never a green tick
    for "Password1" just because it has a digit. */
export function passwordStrength(value: string) {
  if (!value) return { score: 0, label: "", tone: "" };

  let score = 0;
  if (value.length >= 8) score += 1;
  if (value.length >= 12) score += 1;
  if (/[a-z]/.test(value) && /[A-Z]/.test(value)) score += 1;
  if (/\d/.test(value) && /[^\w\s]/.test(value)) score += 1;

  if (value.length < 8) return { score: 1, label: "Too short", tone: "negative" };
  if (score <= 2) return { score: 2, label: "Could be stronger", tone: "brass" };
  if (score === 3) return { score: 3, label: "Good", tone: "brass" };
  return { score: 4, label: "Strong", tone: "positive" };
}

export function PasswordInput({
  showStrength = false,
  value,
  className,
  ...rest
}: ComponentProps<"input"> & { showStrength?: boolean }) {
  const [visible, setVisible] = useState(false);
  const strength = passwordStrength(String(value ?? ""));

  const fill =
    strength.tone === "positive"
      ? "bg-positive"
      : strength.tone === "negative"
        ? "bg-negative"
        : "bg-brass";

  return (
    <div>
      <div className="relative">
        <Input
          type={visible ? "text" : "password"}
          value={value}
          className={cn("pr-11", className)}
          {...rest}
        />
        <button
          type="button"
          onClick={() => setVisible((v) => !v)}
          aria-label={visible ? "Hide password" : "Show password"}
          className="absolute right-1 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-lg text-ink-muted transition-colors hover:bg-elevated hover:text-ink"
        >
          {visible ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
        </button>
      </div>

      {showStrength && String(value ?? "").length > 0 ? (
        <div className="mt-2 flex items-center gap-2.5">
          <div className="flex h-1 flex-1 gap-1">
            {[1, 2, 3, 4].map((step) => (
              <span
                key={step}
                className={cn(
                  "h-full flex-1 rounded-full transition-colors duration-300",
                  step <= strength.score ? fill : "bg-line"
                )}
              />
            ))}
          </div>
          <span
            className={cn(
              "text-[11px] font-semibold",
              strength.tone === "positive"
                ? "text-positive"
                : strength.tone === "negative"
                  ? "text-negative"
                  : "text-brass-ink"
            )}
          >
            {strength.label}
          </span>
        </div>
      ) : null}
    </div>
  );
}
