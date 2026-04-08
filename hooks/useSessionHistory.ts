"use client";

import { useState, useEffect, useCallback } from "react";
import { getCurrentUser, ANON_SESSIONS_KEY } from "@/lib/auth";

const MAX_SESSIONS = 20;

/** IDs for local history; avoids crypto.randomUUID() (missing on some mobile WebViews). */
function newSessionId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  if (typeof crypto !== "undefined" && typeof crypto.getRandomValues === "function") {
    const buf = new Uint8Array(16);
    crypto.getRandomValues(buf);
    buf[6] = (buf[6] & 0x0f) | 0x40;
    buf[8] = (buf[8] & 0x3f) | 0x80;
    const h = Array.from(buf, (b) => b.toString(16).padStart(2, "0")).join("");
    return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20)}`;
  }
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 12)}`;
}

export interface Session {
  id: string;
  timestamp: number;
  label: string;
  key: string;
  mode: string;
  bpm: number;
  chords: string[];
  analysis: any;
  feedback: any;
}

export function useSessionHistory() {
  const [sessions, setSessions] = useState<Session[]>([]);

  // Recompute on every render — reflects live auth state without needing context
  const loggedIn = typeof window !== "undefined" && getCurrentUser() !== null;

  useEffect(() => {
    if (loggedIn) {
      // Clear any locally loaded sessions — server is the source of truth when authed
      setSessions([]);
      return;
    }
    try {
      const raw = localStorage.getItem(ANON_SESSIONS_KEY);
      if (raw) setSessions(JSON.parse(raw));
    } catch {}
  }, [loggedIn]);

  const persist = (updated: Session[]) => {
    try {
      localStorage.setItem(ANON_SESSIONS_KEY, JSON.stringify(updated));
    } catch {}
  };

  const saveSession = useCallback(
    (session: Omit<Session, "id" | "timestamp">) => {
      if (loggedIn) return; // server persists via /analyze when Bearer is sent
      const entry: Session = {
        ...session,
        id: newSessionId(),
        timestamp: Date.now(),
      };
      setSessions((prev) => {
        const updated = [entry, ...prev].slice(0, MAX_SESSIONS);
        persist(updated);
        return updated;
      });
    },
    [loggedIn]
  );

  const deleteSession = useCallback((id: string) => {
    if (loggedIn) return;
    setSessions((prev) => {
      const updated = prev.filter((s) => s.id !== id);
      persist(updated);
      return updated;
    });
  }, [loggedIn]);

  const clearAll = useCallback(() => {
    if (loggedIn) return;
    setSessions([]);
    try {
      localStorage.removeItem(ANON_SESSIONS_KEY);
    } catch {}
  }, [loggedIn]);

  return { sessions, saveSession, deleteSession, clearAll };
}
