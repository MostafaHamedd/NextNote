"use client";

import { createContext, useContext, useState, useEffect, useCallback } from "react";
import {
  getToken,
  setToken,
  removeToken,
  getCurrentUser,
  resetFreeAttempts,
  readAnonSessions,
  clearAnonSessions,
  type AuthUser,
} from "@/lib/auth";
import { resultStore } from "@/lib/resultStore";
import { sheetStore } from "@/lib/sheetStore";
import { API_URL } from "@/lib/config";

interface AuthContextValue {
  user: AuthUser | null;
  token: string | null;
  isLoading: boolean;
  login: (token: string) => void;
  logout: () => void;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue>({
  user: null,
  token: null,
  isLoading: true,
  login: () => {},
  logout: () => {},
  refreshProfile: async () => {},
});

async function importAnonSessions(
  token: string,
  sessions: Array<{ label: string; analysis: any; feedback: any }>
) {
  try {
    await fetch(`${API_URL}/sessions/guitar/import`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ sessions }),
    });
  } catch {
    // best-effort — silently swallow errors
  }
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [token, setTokenState] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const t = getToken();
    if (!t) {
      setIsLoading(false);
      return;
    }
    const decoded = getCurrentUser(); // validates expiry
    if (!decoded) {
      removeToken();
      setIsLoading(false);
      return;
    }
    // Set from JWT immediately so the UI renders without waiting for the network
    setTokenState(t);
    setUser(decoded);
    // Then sync plan with the server (handles webhook-driven plan changes)
    fetch(`${API_URL}/auth/me`, { headers: { Authorization: `Bearer ${t}` } })
      .then((res) => {
        if (res.status === 401) {
          removeToken();
          setTokenState(null);
          setUser(null);
          return null;
        }
        return res.json();
      })
      .then((profile) => {
        if (profile) setUser({ id: profile.id, email: profile.email, plan: profile.plan, subscription_status: profile.subscription_status ?? null, current_period_end: profile.current_period_end ?? null, created_at: profile.created_at ?? null });
      })
      .catch(() => {}) // network error — keep JWT-decoded user
      .finally(() => setIsLoading(false));
  }, []);

  const refreshProfile = useCallback(async () => {
    const t = getToken();
    if (!t) return;
    try {
      const res = await fetch(`${API_URL}/auth/me`, {
        headers: { Authorization: `Bearer ${t}` },
      });
      if (res.status === 401) {
        removeToken();
        setTokenState(null);
        setUser(null);
        return;
      }
      if (!res.ok) return;
      const profile = await res.json();
      setUser({ id: profile.id, email: profile.email, plan: profile.plan, subscription_status: profile.subscription_status ?? null, current_period_end: profile.current_period_end ?? null, created_at: profile.created_at ?? null });
    } catch {}
  }, []);

  const login = useCallback((newToken: string) => {
    const prevUserId = getCurrentUser()?.id ?? null;

    setToken(newToken);
    const newUser = getCurrentUser();

    resultStore.clear();
    sheetStore.clear();

    if (prevUserId === null && newUser) {
      const anonSessions = readAnonSessions();
      clearAnonSessions();
      if (anonSessions.length > 0) {
        importAnonSessions(newToken, anonSessions);
      }
    } else {
      clearAnonSessions();
    }

    setTokenState(newToken);
    setUser(newUser);
    resetFreeAttempts();
  }, []);

  const logout = useCallback(() => {
    removeToken();
    resetFreeAttempts();
    setTokenState(null);
    setUser(null);
    resultStore.clear();
    sheetStore.clear();
  }, []);

  return (
    <AuthContext.Provider value={{ user, token, isLoading, login, logout, refreshProfile }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
