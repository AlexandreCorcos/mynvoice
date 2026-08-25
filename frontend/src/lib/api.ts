const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api/v1";

/* =========================================================================
   API client.

   The session is an `HttpOnly` cookie set by the API. Nothing here reads or
   stores a token — there is no token to read, which is the point: an injected
   script cannot take the session away.

   Two consequences worth knowing:

   * Every request needs `credentials: "include"`. The API is on a different
     origin, so the browser will not attach the cookie otherwise.
   * Signing out is a request, not a `localStorage.removeItem`. Only the
     server can delete a cookie it marked `HttpOnly`.
   ========================================================================= */

/** Routes reachable signed-out, which must never be bounced to /login. */
const PUBLIC_ROUTES = [
  "/", // the landing page — most visitors here have no account at all
  "/login",
  "/register",
  "/forgot-password",
  "/reset-password",
  "/set-password",
];

function isPublicRoute(pathname: string): boolean {
  // Exact match, or a child path. "/" only ever matches exactly, since
  // `startsWith("//")` is false for every real path.
  return PUBLIC_ROUTES.some(
    (route) => pathname === route || pathname.startsWith(`${route}/`)
  );
}

/** Per-call options. */
type RequestOptions = {
  /**
   * Whether a dead session should send the browser to /login.
   *
   * True for anything the app does on your behalf — a 401 there means your
   * session ended mid-task. False for the probe that *asks* whether you are
   * signed in: 401 is a legitimate answer to that question, not a failure,
   * and treating it as one threw every anonymous visitor off the landing
   * page.
   */
  redirectOnUnauthorized?: boolean;
};

/* The CSRF token, held in memory.
 *
 * It cannot be read from `document.cookie`: the cookie belongs to the API's
 * hostname and the app is served from another one, so the page never sees it.
 * That was the bug — every write 403'd in production while working perfectly
 * on localhost, where both sides are the same host and the cookie *is*
 * readable. The value now comes from the API and is kept here.
 *
 * Fetched on first need rather than on load, since most page views never
 * write anything.
 */
let csrfCache: string | null = null;

async function csrfToken(force = false): Promise<string | null> {
  if (csrfCache && !force) return csrfCache;
  try {
    const res = await fetch(`${API_BASE}/auth/csrf`, { credentials: "include" });
    if (!res.ok) return null;
    csrfCache = (await res.json())?.csrf_token ?? null;
    return csrfCache;
  } catch {
    return null;
  }
}

/** Did this response come back because the CSRF token was stale or missing? */
async function isCsrfFailure(res: Response): Promise<boolean> {
  if (res.status !== 403) return false;
  try {
    return (await res.clone().text()).includes("csrf_failed");
  } catch {
    return false;
  }
}

class ApiClient {
  private async request<T>(
    path: string,
    options: RequestInit = {},
    { redirectOnUnauthorized = true }: RequestOptions = {}
  ): Promise<T> {
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      ...((options.headers as Record<string, string>) || {}),
    };

    const method = (options.method ?? "GET").toUpperCase();
    const unsafe = method !== "GET" && method !== "HEAD";

    if (unsafe) {
      const csrf = await csrfToken();
      if (csrf) headers["X-CSRF-Token"] = csrf;
    }

    const send = () =>
      fetch(`${API_BASE}${path}`, { ...options, headers, credentials: "include" });

    let res = await send();

    /* A stale token — the session was renewed, or this tab sat open past the
       cookie's life. Fetch a fresh one and try once more, so the person does
       not lose what they just typed to an error they cannot act on. */
    if (unsafe && (await isCsrfFailure(res))) {
      const fresh = await csrfToken(true);
      if (fresh) {
        headers["X-CSRF-Token"] = fresh;
        res = await send();
      }
    }

    if (res.status === 401) {
      // The access cookie lasts 30 minutes; the refresh cookie lasts a week.
      // One silent renewal, then give up.
      const refreshed = await this.refreshToken();
      if (refreshed) {
        /* Renewing the session mints a new CSRF token, so the cached one is
           now the wrong one. */
        const csrf = await csrfToken(true);
        if (csrf && unsafe) {
          headers["X-CSRF-Token"] = csrf;
        }
        const retry = await send();
        if (!retry.ok) throw new ApiError(retry.status, await retry.text());
        if (retry.status === 204) return undefined as T;
        return retry.json();
      }

      /* The session is genuinely gone. Nothing to clear — the server already
         did — but don't bounce off a public auth page: someone arriving from
         a password-reset email would otherwise be thrown to /login and lose
         the token in the URL, and an expired session is exactly why people
         reset passwords. */
      if (
        redirectOnUnauthorized &&
        typeof window !== "undefined" &&
        !isPublicRoute(window.location.pathname)
      ) {
        window.location.href = "/login";
      }
      throw new ApiError(401, "Unauthorized");
    }

    if (!res.ok) {
      const body = await res.text();
      throw new ApiError(res.status, body);
    }

    if (res.status === 204) return undefined as T;
    return res.json();
  }

  private async refreshToken(): Promise<boolean> {
    try {
      const res = await fetch(`${API_BASE}/auth/refresh`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
      });
      return res.ok;
    } catch {
      return false;
    }
  }

  get<T>(path: string, opts?: RequestOptions) {
    return this.request<T>(path, {}, opts);
  }

  post<T>(path: string, body?: unknown, headers?: Record<string, string>) {
    return this.request<T>(path, {
      method: "POST",
      body: body ? JSON.stringify(body) : undefined,
      headers,
    });
  }

  put<T>(path: string, body?: unknown) {
    return this.request<T>(path, {
      method: "PUT",
      body: body ? JSON.stringify(body) : undefined,
    });
  }

  patch<T>(path: string, body?: unknown) {
    return this.request<T>(path, {
      method: "PATCH",
      body: body ? JSON.stringify(body) : undefined,
    });
  }

  delete(path: string) {
    return this.request<void>(path, { method: "DELETE" });
  }

  async upload<T>(path: string, formData: FormData): Promise<T> {
    /* No Content-Type: the browser has to set it, boundary and all. */
    const csrf = await csrfToken();
    const res = await fetch(`${API_BASE}${path}`, {
      method: "POST",
      headers: csrf ? { "X-CSRF-Token": csrf } : {},
      credentials: "include",
      body: formData,
    });

    if (!res.ok) throw new ApiError(res.status, await res.text());
    return res.json();
  }

  /** A raw authenticated fetch, for responses that aren't JSON — the PDF. */
  async raw(path: string, options: RequestInit = {}): Promise<Response> {
    return fetch(`${API_BASE}${path}`, { ...options, credentials: "include" });
  }
}

export class ApiError extends Error {
  constructor(
    public status: number,
    public body: string
  ) {
    super(`API Error ${status}: ${body}`);
  }
}

/**
 * FastAPI puts the reason in `{"detail": ...}`. Some of ours are codes the UI
 * branches on ("totp_required"), most are sentences to show as they are.
 * Returns the fallback for anything that isn't a plain string detail.
 */
export function apiDetail(error: unknown, fallback = "Something went wrong."): string {
  if (!(error instanceof ApiError)) return fallback;
  try {
    const parsed = JSON.parse(error.body);
    if (typeof parsed?.detail === "string") return parsed.detail;
  } catch {
    /* not JSON — fall through */
  }
  return fallback;
}

export const api = new ApiClient();
