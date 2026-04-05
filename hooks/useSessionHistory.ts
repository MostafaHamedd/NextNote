"use client";

import { useState, useEffect, useCallback } from "react";

const STORAGE_KEY = "music-assistant-sessions";
const MAX_SESSIONS = 20;

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
        id: crypto.randomUUID(),
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
