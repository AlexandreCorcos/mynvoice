"use client";

/* =========================================================================
   Step-up authentication for the admin actions that are hard to take back.

   The session says you are an admin. It does not say you are the one at the
   keyboard. Granting admin, deactivating an account and forcing a password
   reset ask for a code from your authenticator; everything else does not.

   A code opens a five-minute window rather than being demanded per click, so
   a run of admin work costs one code. The window token lives in memory only
   — never localStorage — so closing the tab ends it.

   `guard()` wraps an action: it runs it, and if the server says a step-up is
   missing it opens the right modal, then replays the action once you pass.
   Callers never branch on the 403 themselves.
   ========================================================================= */

import { useCallback, useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { KeyRound, Loader2, ShieldCheck, ShieldOff, Smartphone } from "lucide-react";
import QRCode from "qrcode";
import { api, apiDetail } from "@/lib/api";
import { cn } from "@/lib/utils";
import { Button } from "@/components/app/button";
import { Field, Input } from "@/components/app/form";
import { Modal } from "@/components/app/modal";

type Granted = { token: string; expires_at: string };
type Enrolment = { secret: string; uri: string };

/** Headers to send with a guarded request. */
export type StepUpHeaders = Record<string, string>;

export type StepUp = ReturnType<typeof useStepUp>;

/**
 * `enabled` gates the status fetch. Hooks can't sit behind an early return, so
 * a non-admin landing on the panel would otherwise fire /sys/totp and collect
 * a 403 in the console for nothing.
 */
export function useStepUp({ enabled = true }: { enabled?: boolean } = {}) {
  const [enrolled, setEnrolled] = useState<boolean | null>(null);
  const [unlockedUntil, setUnlockedUntil] = useState<number | null>(null);
  const [prompt, setPrompt] = useState<null | "code" | "enrol" | "manage">(null);
  const [enrolment, setEnrolment] = useState<Enrolment | null>(null);
  const [qr, setQr] = useState<string | null>(null);
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  /* The token never leaves memory, and the pending action is a ref so that
     re-renders between the 403 and the retry cannot lose it. */
  const tokenRef = useRef<string | null>(null);
  const pendingRef = useRef<((headers: StepUpHeaders) => Promise<void>) | null>(null);

  useEffect(() => {
    if (!enabled) return;
    api
      .get<{ enrolled: boolean }>("/sys/totp")
      .then((s) => setEnrolled(s.enrolled))
      .catch(() => setEnrolled(null));
  }, [enabled]);

  /* Drives the countdown chip, and drops the token the moment it expires. */
  useEffect(() => {
    if (!unlockedUntil) return;
    const timer = setInterval(() => {
      if (Date.now() >= unlockedUntil) {
        tokenRef.current = null;
        setUnlockedUntil(null);
      } else {
        setUnlockedUntil((u) => u);
      }
    }, 1000);
    return () => clearInterval(timer);
  }, [unlockedUntil]);

  const headers = useCallback((): StepUpHeaders => {
    if (!tokenRef.current || !unlockedUntil || Date.now() >= unlockedUntil) return {};
    return { "X-Admin-Step-Up": tokenRef.current };
  }, [unlockedUntil]);

  const beginEnrolment = useCallback(async () => {
    setError(null);
    setCode("");
    setBusy(true);
    try {
      const started = await api.post<Enrolment>("/sys/totp/begin");
      setEnrolment(started);
      setQr(
        await QRCode.toDataURL(started.uri, {
          margin: 1,
          width: 440,
          color: { dark: "#1C1917", light: "#FFFFFF" },
        })
      );
      setPrompt("enrol");
    } catch (err) {
      setError(apiDetail(err, "Couldn't start the setup."));
      setPrompt("enrol");
    } finally {
      setBusy(false);
    }
  }, []);

  const accept = useCallback((granted: Granted) => {
    tokenRef.current = granted.token;
    setUnlockedUntil(new Date(granted.expires_at).getTime());
  }, []);

  /** Runs `action`, prompting for a code or enrolment if the server asks. */
  const guard = useCallback(
    async (action: (headers: StepUpHeaders) => Promise<void>) => {
      try {
        await action(headers());
      } catch (err) {
        const detail = apiDetail(err, "");
        if (detail === "totp_required") {
          pendingRef.current = action;
          setCode("");
          setError(null);
          setPrompt("code");
          return;
        }
        if (detail === "totp_enrolment_required") {
          pendingRef.current = action;
          setEnrolled(false);
          await beginEnrolment();
          return;
        }
        throw err;
      }
    },
    [headers, beginEnrolment]
  );

  const replay = useCallback(async () => {
    const pending = pendingRef.current;
    pendingRef.current = null;
    if (!pending) return;
    await pending(
      tokenRef.current ? { "X-Admin-Step-Up": tokenRef.current } : {}
    );
  }, []);

  const submitCode = useCallback(async () => {
    setBusy(true);
    setError(null);
    try {
      const path = prompt === "enrol" ? "/sys/totp/confirm" : "/sys/totp/verify";
      accept(await api.post<Granted>(path, { code }));
      if (prompt === "enrol") setEnrolled(true);
      setPrompt(null);
      setEnrolment(null);
      setQr(null);
      setCode("");
      await replay();
    } catch (err) {
      setError(apiDetail(err, "That code is not right."));
    } finally {
      setBusy(false);
    }
  }, [prompt, code, accept, replay]);

  const disable = useCallback(async () => {
    setBusy(true);
    setError(null);
    try {
      await guard(async (h) => {
        await api.post("/sys/totp/disable", undefined, h);
        setEnrolled(false);
        tokenRef.current = null;
        setUnlockedUntil(null);
        setPrompt(null);
      });
    } catch (err) {
      setError(apiDetail(err, "Couldn't remove it."));
    } finally {
      setBusy(false);
    }
  }, [guard]);

  const dismiss = useCallback(() => {
    pendingRef.current = null;
    setPrompt(null);
    setEnrolment(null);
    setQr(null);
    setCode("");
    setError(null);
  }, []);

  return {
    enrolled,
    unlockedUntil,
    guard,
    prompt,
    enrolment,
    qr,
    code,
    setCode,
    error,
    busy,
    beginEnrolment,
    submitCode,
    disable,
    dismiss,
    openManage: () => {
      setError(null);
      setPrompt("manage");
    },
  };
}

/* ------------------------------------------------------------------ */
/* Chip                                                                */
/* ------------------------------------------------------------------ */

function remaining(until: number): string {
  const seconds = Math.max(0, Math.round((until - Date.now()) / 1000));
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`;
}

/** Header control: state of the second factor, and the way to change it. */
export function StepUpChip({ ctl }: { ctl: StepUp }) {
  const unlocked = Boolean(ctl.unlockedUntil && ctl.unlockedUntil > Date.now());

  return (
    <button
      onClick={ctl.openManage}
      className={cn(
        "inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-[12px] font-semibold ring-1 transition-colors",
        unlocked
          ? "bg-positive/10 text-positive ring-positive/25"
          : ctl.enrolled
            ? "bg-elevated text-ink-muted ring-line hover:text-ink"
            : "bg-brass/[0.09] text-brass-ink ring-brass/20 hover:bg-brass/[0.14]"
      )}
    >
      {ctl.enrolled ? (
        <ShieldCheck className="h-3.5 w-3.5" />
      ) : (
        <ShieldOff className="h-3.5 w-3.5" />
      )}
      {unlocked
        ? `Unlocked ${remaining(ctl.unlockedUntil!)}`
        : ctl.enrolled
          ? "Two-factor on"
          : "Set up two-factor"}
    </button>
  );
}

/* ------------------------------------------------------------------ */
/* Modals                                                              */
/* ------------------------------------------------------------------ */

function CodeField({
  value,
  onChange,
  onSubmit,
}: {
  value: string;
  onChange: (v: string) => void;
  onSubmit: () => void;
}) {
  return (
    <Field label="Six-digit code">
      <Input
        autoFocus
        inputMode="numeric"
        autoComplete="one-time-code"
        placeholder="000000"
        maxLength={6}
        value={value}
        onChange={(e) => onChange(e.target.value.replace(/\D/g, "").slice(0, 6))}
        onKeyDown={(e) => {
          if (e.key === "Enter" && value.length === 6) onSubmit();
        }}
        className="text-center text-[22px] font-bold tracking-[0.4em] tabular-nums"
      />
    </Field>
  );
}

export function StepUpModals({ ctl }: { ctl: StepUp }) {
  return (
    <>
      {/* Just-in-time code prompt */}
      <Modal
        open={ctl.prompt === "code"}
        onClose={ctl.dismiss}
        title="Confirm it's you"
        description="This action can't easily be undone. Enter the current code from your authenticator — it unlocks admin actions for five minutes."
        footer={
          <>
            <Button variant="secondary" onClick={ctl.dismiss}>
              Cancel
            </Button>
            <Button
              variant="primary"
              onClick={ctl.submitCode}
              disabled={ctl.busy || ctl.code.length !== 6}
            >
              {ctl.busy ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <KeyRound className="h-4 w-4" />
              )}
              Unlock
            </Button>
          </>
        }
      >
        <CodeField value={ctl.code} onChange={ctl.setCode} onSubmit={ctl.submitCode} />
        {ctl.error ? (
          <p className="mt-3 text-[12.5px] font-medium text-negative">{ctl.error}</p>
        ) : null}
      </Modal>

      {/* Enrolment */}
      <Modal
        open={ctl.prompt === "enrol"}
        onClose={ctl.dismiss}
        size="md"
        title="Set up two-factor"
        description="Scan this with Google Authenticator, 1Password, Authy — anything that does TOTP. Then type the code it shows."
        footer={
          <>
            <Button variant="secondary" onClick={ctl.dismiss}>
              Cancel
            </Button>
            <Button
              variant="primary"
              onClick={ctl.submitCode}
              disabled={ctl.busy || ctl.code.length !== 6}
            >
              {ctl.busy ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <ShieldCheck className="h-4 w-4" />
              )}
              Turn it on
            </Button>
          </>
        }
      >
        <div className="grid gap-5 sm:grid-cols-[auto_1fr] sm:items-start">
          {/* Always white: a scanner wants the contrast it was designed for,
              so this one tile deliberately ignores the theme. */}
          <div className="mx-auto flex h-[188px] w-[188px] flex-none items-center justify-center rounded-[14px] bg-white p-2.5 ring-1 ring-line">
            {ctl.qr ? (
              <motion.img
                initial={{ opacity: 0, scale: 0.96 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.3 }}
                src={ctl.qr}
                alt="Two-factor setup QR code"
                className="h-full w-full"
              />
            ) : (
              <Loader2 className="h-5 w-5 animate-spin text-ink-muted" />
            )}
          </div>

          <div className="min-w-0">
            <CodeField
              value={ctl.code}
              onChange={ctl.setCode}
              onSubmit={ctl.submitCode}
            />

            {ctl.enrolment ? (
              <div className="mt-4">
                <p className="flex items-center gap-1.5 text-[11.5px] font-semibold uppercase tracking-[0.08em] text-ink-muted">
                  <Smartphone className="h-3.5 w-3.5" />
                  Can&apos;t scan?
                </p>
                <p className="mt-1.5 break-all rounded-[10px] bg-elevated px-3 py-2 font-mono text-[12px] text-ink">
                  {ctl.enrolment.secret}
                </p>
              </div>
            ) : null}

            {ctl.error ? (
              <p className="mt-3 text-[12.5px] font-medium text-negative">{ctl.error}</p>
            ) : null}
          </div>
        </div>

        <p className="mt-5 border-t border-line pt-4 text-[12px] leading-relaxed text-ink-muted">
          Lose the authenticator and only the server can clear it —{" "}
          <span className="font-mono text-[11.5px]">
            python -m app.cli reset-totp {"<email>"}
          </span>
          . That is deliberate: if the panel could clear it, it would not be a
          second factor.
        </p>
      </Modal>

      {/* Status / management */}
      <Modal
        open={ctl.prompt === "manage"}
        onClose={ctl.dismiss}
        title={ctl.enrolled ? "Two-factor is on" : "Two-factor is off"}
        description={
          ctl.enrolled
            ? "Granting admin, deactivating an account and forcing a password reset ask for a code. Everything else doesn't."
            : "Right now anyone holding your session can grant admin, deactivate accounts and force password resets. A code from your phone closes that."
        }
        footer={
          ctl.enrolled ? (
            <>
              <Button variant="secondary" onClick={ctl.dismiss}>
                Close
              </Button>
              <Button variant="danger" onClick={ctl.disable} disabled={ctl.busy}>
                {ctl.busy ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <ShieldOff className="h-4 w-4" />
                )}
                Remove authenticator
              </Button>
            </>
          ) : (
            <>
              <Button variant="secondary" onClick={ctl.dismiss}>
                Not now
              </Button>
              <Button variant="primary" onClick={ctl.beginEnrolment} disabled={ctl.busy}>
                {ctl.busy ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <ShieldCheck className="h-4 w-4" />
                )}
                Set it up
              </Button>
            </>
          )
        }
      >
        {ctl.error ? (
          <p className="text-[12.5px] font-medium text-negative">{ctl.error}</p>
        ) : null}
      </Modal>
    </>
  );
}
