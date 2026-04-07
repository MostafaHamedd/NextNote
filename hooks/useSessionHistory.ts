"use client";

import { useState, useEffect, useCallback } from "react";

const STORAGE_KEY = "music-assistant-sessions";
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

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) setSessions(JSON.parse(raw));
    } catch {}
  }, []);

  const persist = (updated: Session[]) => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    } catch {}
  };

  const saveSession = useCallback(
    (session: Omit<Session, "id" | "timestamp">) => {
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
    []
  );

  const deleteSession = useCallback((id: string) => {
    setSessions((prev) => {
      const updated = prev.filter((s) => s.id !== id);
      persist(updated);
      return updated;
    });
  }, []);

  const clearAll = useCallback(() => {
    setSessions([]);
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {}
  }, []);

  return { sessions, saveSession, deleteSession, clearAll };
}
