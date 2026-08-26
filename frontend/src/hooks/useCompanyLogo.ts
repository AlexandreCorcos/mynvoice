"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";

/**
 * The company logo as a URL an `<img>` can use.
 *
 * The logo cannot be linked directly. It lives in the same bucket as the
 * original PDFs of imported invoices — client names, amounts, bank details —
 * so that bucket's public access is deliberately off, and the stored
 * `logo_url` answers 401 to the browser. The bytes come through the
 * authenticated API instead and become an object URL here.
 *
 * Pass `logoUrl` from the company record: it is not fetched, only used as the
 * signal that a logo exists at all, and to refetch when it changes (an upload
 * writes a new key). Returns null while loading, or when there is no logo.
 */
export function useCompanyLogo(logoUrl: string | null | undefined): string | null {
  const [src, setSrc] = useState<string | null>(null);

  useEffect(() => {
    if (!logoUrl) {
      setSrc(null);
      return;
    }

    let objectUrl: string | null = null;
    // The request outlives a fast navigation, so a late response must not
    // write into an unmounted component or leak the object URL it created.
    let cancelled = false;

    (async () => {
      try {
        const res = await api.raw("/profile/company/logo");
        if (!res.ok) return;
        objectUrl = URL.createObjectURL(await res.blob());
        if (cancelled) {
          URL.revokeObjectURL(objectUrl);
          objectUrl = null;
          return;
        }
        setSrc(objectUrl);
      } catch {
        /* No logo is a cosmetic loss; never surface it as an error. */
      }
    })();

    return () => {
      cancelled = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [logoUrl]);

  return src;
}
