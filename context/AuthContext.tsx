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

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

interface AuthContextValue {
  user: AuthUser | null;
  token: string | null;
  isLoading: boolean;
  login: (token: string) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue>({
  user: null,
  token: null,
  isLoading: true,
  login: () => {},
  logout: () => {},
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
    if (t) {
      setTokenState(t);
      setUser(getCurrentUser());
    }
    setIsLoading(false);
  }, []);

  const login = useCallback((newToken: string) => {
    // Capture previous user BEFORE overwriting the token
    const prevUserId = getCurrentUser()?.id ?? null;

    setToken(newToken);
    const newUser = getCurrentUser();

    // Clear in-memory result stores on every login (stale across account switches)
    resultStore.clear();
    sheetStore.clear();

    if (prevUserId === null && newUser) {
      // Transitioning from anonymous → migrate any local sessions
      const anonSessions = readAnonSessions();
      clearAnonSessions(); // clear immediately so we never re-import
      if (anonSessions.length > 0) {
        importAnonSessions(newToken, anonSessions); // fire-and-forget
      }
    } else {
      // Account switch or re-login: just clean up the anonymous key
      clearAnonSessions();
    }

    setTokenState(newToken);
    setUser(newUser);
    resetFreeAttempts();
  }, []);

  const logout = useCallback(() => {
    removeToken();
    setTokenState(null);
    setUser(null);
    resultStore.clear();
    sheetStore.clear();
  }, []);

  return (
    <AuthContext.Provider value={{ user, token, isLoading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
