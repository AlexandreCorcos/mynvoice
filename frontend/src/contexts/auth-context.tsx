"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
import { api } from "@/lib/api";
import type { User, Company, TokenResponse } from "@/types";

interface AuthState {
  user: User | null;
  /** The signed-in person's own business. Null until they set one up. */
  company: Company | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
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
      const token = localStorage.getItem("access_token");
      if (!token) {
        setLoading(false);
        return;
      }
      const u = await api.get<User>("/profile/me");
      setUser(u);

      /* Best effort: no company yet is the normal state before onboarding,
         and it must never keep someone out of the app. */
      api
        .get<Company | null>("/profile/company")
        .then(setCompany)
        .catch(() => setCompany(null));
    } catch {
      localStorage.removeItem("access_token");
      localStorage.removeItem("refresh_token");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchUser();
  }, [fetchUser]);

  const login = async (email: string, password: string) => {
    const res = await api.post<TokenResponse>("/auth/login", {
      email,
      password,
    });
    localStorage.setItem("access_token", res.access_token);
    localStorage.setItem("refresh_token", res.refresh_token);
    await fetchUser();
  };

  const fetchCompany = useCallback(async () => {
    try {
      setCompany(await api.get<Company | null>("/profile/company"));
    } catch {
      setCompany(null);
    }
  }, []);

  const logout = () => {
    localStorage.removeItem("access_token");
    localStorage.removeItem("refresh_token");
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
