"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
import { api } from "@/lib/api";
import type { User, Company } from "@/types";

interface AuthState {
  user: User | null;
  /** The signed-in person's own business. Null until they set one up. */
  company: Company | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
  /** Call after changing the company — the sidebar shows its logo. */
  refreshCompany: () => Promise<void>;
}

const AuthContext = createContext<AuthState | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [company, setCompany] = useState<Company | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchUser = useCallback(async () => {
    try {
      // No token to check first — the cookie either travels with this
      // request or it doesn't, and the server is the one that knows.
      const u = await api.get<User>("/profile/me");
      setUser(u);

      /* Best effort: no company yet is the normal state before onboarding,
         and it must never keep someone out of the app. */
      api
        .get<Company | null>("/profile/company")
        .then(setCompany)
        .catch(() => setCompany(null));
    } catch {
      /* Not signed in, or the session expired. */
      setUser(null);
      setCompany(null);
    } finally {
      setLoading(false);
    }
  }, []);

  /* Purge the tokens the old scheme left behind.
     Anyone signed in before the move to cookies still has a refresh token
     sitting in localStorage, valid for a week. Leaving it there would undo
     the point of the change for every existing user — the session they can
     no longer use is still readable by any script for seven days. */
  useEffect(() => {
    try {
      localStorage.removeItem("access_token");
      localStorage.removeItem("refresh_token");
    } catch {
      /* storage disabled — nothing to purge */
    }
  }, []);

  useEffect(() => {
    fetchUser();
  }, [fetchUser]);

  const login = async (email: string, password: string) => {
    /* The response still carries tokens, for clients without a cookie jar.
       We ignore them — what signs this browser in is the Set-Cookie. */
    await api.post("/auth/login", { email, password });
    await fetchUser();
  };

  const fetchCompany = useCallback(async () => {
    try {
      setCompany(await api.get<Company | null>("/profile/company"));
    } catch {
      setCompany(null);
    }
  }, []);

  /* A round trip now: the cookie is HttpOnly, so only the server that set it
     can remove it. Local state is cleared either way — a failed call must not
     strand someone in a session they asked to leave. */
  const logout = async () => {
    try {
      await api.post("/auth/logout");
    } catch {
      /* already signed out, or offline */
    }
    setUser(null);
    setCompany(null);
  };

  return (
    <AuthContext.Provider value={{
        user,
        company,
        loading,
        login,
        logout,
        refreshUser: fetchUser,
        refreshCompany: fetchCompany,
      }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
