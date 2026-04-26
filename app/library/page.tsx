"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Music2, ArrowRight, PlusCircle, Trash2, RefreshCw } from "lucide-react";
import clsx from "clsx";
import { useAuth } from "@/context/AuthContext";
import { authHeaders } from "@/lib/auth";
import { API_URL } from "@/lib/config";

interface GuitarSession {
  id: number;
  label: string;
  key?: string;
  mode?: string;
  bpm?: number;
  chords?: string[];
  created_at: string;
}

function formatDate(iso: string) {
  const date = new Date(iso);
  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(today.getDate() - 1);
  if (date.toDateString() === today.toDateString()) return "Today";
  if (date.toDateString() === yesterday.toDateString()) return "Yesterday";
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

async function parseJsonIfOk(res: Response): Promise<unknown | null> {
  if (!res.ok) return null;
  try { return await res.json(); } catch { return null; }
}

export default function LibraryPage() {
  const { user, token } = useAuth();
  const router = useRouter();

  const [sessions, setSessions] = useState<GuitarSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<number | null>(null);

  const sessionPrefix = user ? "sessions" : "sessions/anonymous";

  useEffect(() => {
    setLoading(true);
    const headers = token ? { Authorization: `Bearer ${token}` } : authHeaders();
    const endpoint = token
      ? `${API_URL}/sessions/guitar`
      : `${API_URL}/sessions/anonymous/guitar`;

    fetch(endpoint, { headers })
      .then(parseJsonIfOk)
      .then((data) => {
        setSessions(Array.isArray(data) ? (data as GuitarSession[]) : []);
      })
      .catch(() => setSessions([]))
      .finally(() => setLoading(false));
  }, [token]);

  const openSession = (id: number) => {
    router.push(`/results?session=${id}${!user ? "&anon=1" : ""}`);
  };

  const deleteSession = async (id: number) => {
    setDeletingId(id);
    try {
      await fetch(`${API_URL}/${sessionPrefix}/guitar/${id}`, {
        method: "DELETE",
        headers: authHeaders(),
      });
      setSessions((prev) => prev.filter((s) => s.id !== id));
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="min-h-screen bg-surface">
      <div className="max-w-4xl mx-auto px-6 py-10">

        {/* Header */}
        <div className="flex items-start justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-white">My Library</h1>
            <p className="text-sm text-gray-500 mt-1">
              {loading ? "Loading…" : `${sessions.length} saved session${sessions.length !== 1 ? "s" : ""}`}
            </p>
          </div>
          <Link
            href="/analyze"
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold bg-teal-600 hover:bg-teal-500 text-white transition-colors shadow-lg shadow-teal-900/30"
          >
            <RefreshCw size={14} />
            New Analysis
          </Link>
        </div>

        {/* Sessions list */}
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="w-6 h-6 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : sessions.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <div className="w-14 h-14 bg-surface-2 rounded-2xl flex items-center justify-center mb-4 border border-surface-border">
              <Music2 size={24} className="text-gray-600" />
            </div>
            <p className="text-gray-400 font-medium mb-1">No sessions yet</p>
            <p className="text-gray-600 text-sm mb-6">Analyze a guitar recording to save it here.</p>
            <Link
              href="/analyze"
              className="flex items-center gap-2 text-sm font-semibold text-white bg-brand-600 hover:bg-brand-500 px-5 py-2.5 rounded-xl transition-colors"
            >
              <PlusCircle size={15} />
              Start analyzing
            </Link>
          </div>
        ) : (
          <div className="space-y-2">
            {sessions.map((session) => (
              <div
                key={session.id}
                className={clsx(
                  "group flex items-center gap-4 bg-surface-2 rounded-2xl border border-surface-border px-5 py-4 hover:border-brand-500/40 transition-all cursor-pointer",
                  deletingId === session.id && "opacity-40 pointer-events-none"
                )}
                onClick={() => openSession(session.id)}
              >
                {/* Icon */}
                <div className="w-10 h-10 bg-brand-600/20 rounded-xl flex items-center justify-center shrink-0">
                  <Music2 size={16} className="text-brand-400" />
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-white text-sm truncate">{session.label}</p>
                  <div className="flex items-center gap-2 mt-1 flex-wrap">
                    <span className="text-xs text-gray-500">{formatDate(session.created_at)}</span>
                    {session.key && (
                      <>
                        <span className="text-gray-700">·</span>
                        <span className="text-[11px] font-mono bg-surface-3 border border-surface-border text-gray-400 rounded px-1.5 py-0.5">
                          {session.key} {session.mode}
                        </span>
                      </>
                    )}
                    {session.bpm != null && (
                      <>
                        <span className="text-gray-700">·</span>
                        <span className="text-xs text-gray-500">{session.bpm} bpm</span>
                      </>
                    )}
                  </div>
                </div>

                {/* Chord bubbles */}
                {session.chords && session.chords.length > 0 && (
                  <div className="hidden sm:flex items-center gap-1.5 shrink-0">
                    {session.chords.slice(0, 4).map((chord, i) => (
                      <span
                        key={i}
                        className="text-[11px] font-medium bg-brand-600/15 border border-brand-500/25 text-brand-300 rounded-lg px-2 py-1"
                      >
                        {chord}
                      </span>
                    ))}
                  </div>
                )}

                {/* Actions */}
                <div className="flex items-center gap-1 shrink-0">
                  <button
                    onClick={(e) => { e.stopPropagation(); deleteSession(session.id); }}
                    className="p-2 rounded-lg text-gray-600 hover:text-red-400 hover:bg-red-500/10 transition-all opacity-0 group-hover:opacity-100"
                    title="Delete"
                  >
                    <Trash2 size={14} />
                  </button>
                  <ArrowRight size={16} className="text-gray-600 group-hover:text-brand-400 transition-colors" />
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Sign-in prompt for anonymous */}
        {!user && sessions.length > 0 && (
          <p className="text-center text-xs text-gray-600 mt-8">
            <Link href="/login" className="text-brand-400 hover:underline">Sign in</Link>
            {" "}to save sessions permanently across devices
          </p>
        )}
      </div>
    </div>
  );
}
