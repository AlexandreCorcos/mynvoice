"use client";

/* =========================================================================
   Suggest a feature.

   Lives behind the lightbulb in the topbar. The ask is deliberately small —
   one box, no category dropdown, no priority picker. Anything that turns a
   passing thought into a form gets abandoned, and a half-written thought is
   worth more to us than a well-categorised silence.
   ========================================================================= */

import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { api } from "@/lib/api";
import { Modal } from "@/components/app/modal";
import { Button } from "@/components/app/button";
import { Field, Textarea } from "@/components/app/form";

const MAX = 4000;
const MIN = 5;

export function SuggestModal({
  open,
  onClose,
  onDone,
}: {
  open: boolean;
  onClose: () => void;
  onDone: (message: string, ok: boolean) => void;
}) {
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");

  // A fresh box each time it opens — a previous send left sitting there reads
  // as "did that go?".
  useEffect(() => {
    if (open) {
      setMessage("");
      setError("");
      setSending(false);
    }
  }, [open]);

  const tooShort = message.trim().length < MIN;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (tooShort || sending) return;
    setSending(true);
    setError("");
    try {
      await api.post("/feedback", { message: message.trim() });
      onClose();
      onDone("Thank you — that's on its way.", true);
    } catch {
      // The backend stores nothing, so a failure really does mean it didn't
      // arrive. Keep the text in the box so it isn't lost on the retry.
      setError("Couldn't send that just now. Please try again in a moment.");
      setSending(false);
    }
  };

  return (
    <Modal open={open} onClose={onClose} title="Suggest a feature">
      <form onSubmit={submit} className="space-y-4">
        <p className="text-[13.5px] leading-relaxed text-ink-muted">
          What would make MYNVOICE more useful to you? Missing feature, rough
          edge, something that annoyed you today — all of it helps.
        </p>

        <Field label="Your suggestion">
          <Textarea
            autoFocus
            value={message}
            maxLength={MAX}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="I'd love to be able to…"
            className="min-h-[140px]"
          />
        </Field>

        <div className="flex items-center justify-between gap-3">
          <span className="text-[11.5px] tabular-nums text-ink-muted">
            {message.length}/{MAX}
          </span>
          {error ? (
            <span className="text-[12.5px] font-medium text-negative">{error}</span>
          ) : null}
        </div>

        <div className="flex justify-end gap-2 pt-1">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" variant="primary" disabled={tooShort || sending}>
            {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            {sending ? "Sending…" : "Send suggestion"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
