"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Music2, Piano, ArrowRight, PlusCircle, Trash2, RefreshCw } from "lucide-react";
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

interface VisualizerSession {
  id: number;
  title: string;
  source: "midi" | "learn";
  created_at: string;
}

type Tab = "guitar" | "piano";

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

  const [tab, setTab] = useState<Tab>("guitar");
  const [guitarSessions, setGuitarSessions]       = useState<GuitarSession[]>([]);
  const [pianoSessions, setPianoSessions]         = useState<VisualizerSession[]>([]);
  const [loadingGuitar, setLoadingGuitar]         = useState(true);
  const [loadingPiano, setLoadingPiano]           = useState(true);
  const [deletingId, setDeletingId]               = useState<number | null>(null);

  const headers = token ? { Authorization: `Bearer ${token}` } : authHeaders();

  // ── Fetch guitar sessions ──────────────────────────────────────────────────
  useEffect(() => {
    setLoadingGuitar(true);
    const endpoint = token
      ? `${API_URL}/sessions/guitar`
      : `${API_URL}/sessions/anonymous/guitar`;
    fetch(endpoint, { headers })
      .then(parseJsonIfOk)
      .then((data) => setGuitarSessions(Array.isArray(data) ? (data as GuitarSession[]) : []))
      .catch(() => setGuitarSessions([]))
      .finally(() => setLoadingGuitar(false));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  // ── Fetch piano sessions ───────────────────────────────────────────────────
  useEffect(() => {
    setLoadingPiano(true);
    const endpoint = token
      ? `${API_URL}/sessions/visualizer`
      : `${API_URL}/sessions/anonymous/visualizer`;
    fetch(endpoint, { headers })
      .then(parseJsonIfOk)
      .then((data) => setPianoSessions(Array.isArray(data) ? (data as VisualizerSession[]) : []))
      .catch(() => setPianoSessions([]))
      .finally(() => setLoadingPiano(false));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  const openGuitar = (id: number) => router.push(`/results?session=${id}${!user ? "&anon=1" : ""}`);
  const openPiano  = (id: number) => router.push(`/visualizer/play?session=${id}${!user ? "&anon=1" : ""}`);

  const deleteGuitar = async (id: number) => {
    setDeletingId(id);
    const prefix = token ? "sessions" : "sessions/anonymous";
    try {
      await fetch(`${API_URL}/${prefix}/guitar/${id}`, { method: "DELETE", headers: authHeaders() });
      setGuitarSessions((prev) => prev.filter((s) => s.id !== id));
    } finally { setDeletingId(null); }
  };

  const deletePiano = async (id: number) => {
    setDeletingId(id);
    const prefix = token ? "sessions" : "sessions/anonymous";
    try {
      await fetch(`${API_URL}/${prefix}/visualizer/${id}`, { method: "DELETE", headers: authHeaders() });
      setPianoSessions((prev) => prev.filter((s) => s.id !== id));
    } finally { setDeletingId(null); }
  };

  const loading  = tab === "guitar" ? loadingGuitar : loadingPiano;
  const total    = tab === "guitar" ? guitarSessions.length : pianoSessions.length;

  return (
    <div className="min-h-screen bg-surface">
      <div className="max-w-4xl mx-auto px-6 py-10">

        {/* Header */}
        <div className="flex items-start justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-white">My Library</h1>
            <p className="text-sm text-gray-500 mt-1">
              {loading ? "Loading…" : `${total} saved session${total !== 1 ? "s" : ""}`}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Link
              href="/visualizer"
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold bg-brand-600 hover:bg-brand-500 text-white transition-colors shadow-lg shadow-brand-900/30"
            >
              <Piano size={14} />
              New Piano
            </Link>
            <Link
              href="/analyze"
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold bg-teal-600 hover:bg-teal-500 text-white transition-colors shadow-lg shadow-teal-900/30"
            >
              <RefreshCw size={14} />
              New Analysis
            </Link>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 bg-surface-2 p-1 rounded-xl border border-surface-border mb-6 w-fit">
          {([
            { key: "guitar", label: "Guitar Analysis", icon: Music2 },
            { key: "piano",  label: "Piano Visualizer", icon: Piano  },
          ] as { key: Tab; label: string; icon: React.ElementType }[]).map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              onClick={() => setTab(key)}
              className={clsx(
                "flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all",
                tab === key
                  ? "bg-surface-3 text-white border border-surface-border shadow-sm"
                  : "text-gray-500 hover:text-gray-300",
              )}
            >
              <Icon size={14} />
              {label}
            </button>
          ))}
        </div>

        {/* Guitar sessions */}
        {tab === "guitar" && (
          <>
            {loadingGuitar ? (
              <LoadingSpinner />
            ) : guitarSessions.length === 0 ? (
              <EmptyState
                message="No guitar sessions yet"
                sub="Analyze a guitar recording to save it here."
                href="/analyze"
                cta="Start analyzing"
                icon={Music2}
              />
            ) : (
              <div className="space-y-2">
                {guitarSessions.map((session) => (
                  <div
                    key={session.id}
                    className={clsx(
                      "group flex items-center gap-4 bg-surface-2 rounded-2xl border border-surface-border px-5 py-4 hover:border-brand-500/40 transition-all cursor-pointer",
                      deletingId === session.id && "opacity-40 pointer-events-none"
                    )}
                    onClick={() => openGuitar(session.id)}
                  >
                    <div className="w-10 h-10 bg-teal-600/20 rounded-xl flex items-center justify-center shrink-0">
                      <Music2 size={16} className="text-teal-400" />
                    </div>
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
                    {session.chords && session.chords.length > 0 && (
                      <div className="hidden sm:flex items-center gap-1.5 shrink-0">
                        {session.chords.slice(0, 4).map((chord, i) => (
                          <span key={i} className="text-[11px] font-medium bg-brand-600/15 border border-brand-500/25 text-brand-300 rounded-lg px-2 py-1">
                            {chord}
                          </span>
                        ))}
                      </div>
                    )}
                    <SessionActions onDelete={() => deleteGuitar(session.id)} />
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        {/* Piano sessions */}
        {tab === "piano" && (
          <>
            {loadingPiano ? (
              <LoadingSpinner />
            ) : pianoSessions.length === 0 ? (
              <EmptyState
                message="No piano sessions yet"
                sub="Upload a MIDI file or search a song to save it here."
                href="/visualizer"
                cta="Open Piano Visualizer"
                icon={Piano}
              />
            ) : (
              <div className="space-y-2">
                {pianoSessions.map((session) => (
                  <div
                    key={session.id}
                    className={clsx(
                      "group flex items-center gap-4 bg-surface-2 rounded-2xl border border-surface-border px-5 py-4 hover:border-brand-500/40 transition-all cursor-pointer",
                      deletingId === session.id && "opacity-40 pointer-events-none"
                    )}
                    onClick={() => openPiano(session.id)}
                  >
                    <div className="w-10 h-10 bg-brand-600/20 rounded-xl flex items-center justify-center shrink-0">
                      <Piano size={16} className="text-brand-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-white text-sm truncate">{session.title}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-xs text-gray-500">{formatDate(session.created_at)}</span>
                        <span className="text-gray-700">·</span>
                        <span className={clsx(
                          "text-[11px] font-medium rounded px-1.5 py-0.5 border",
                          session.source === "midi"
                            ? "bg-cyan-500/10 border-cyan-500/25 text-cyan-400"
                            : "bg-brand-500/10 border-brand-500/25 text-brand-400",
                        )}>
                          {session.source === "midi" ? "MIDI" : "Song"}
                        </span>
                      </div>
                    </div>
                    <SessionActions onDelete={() => deletePiano(session.id)} />
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        {/* Sign-in prompt for anonymous */}
        {!user && (guitarSessions.length > 0 || pianoSessions.length > 0) && (
          <p className="text-center text-xs text-gray-600 mt-8">
            <Link href="/login" className="text-brand-400 hover:underline">Sign in</Link>
            {" "}to save sessions permanently across devices
          </p>
        )}
      </div>
    </div>
  );
}

function LoadingSpinner() {
  return (
    <div className="flex items-center justify-center py-20">
      <div className="w-6 h-6 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
    </div>
  );
}

function EmptyState({ message, sub, href, cta, icon: Icon }: {
  message: string; sub: string; href: string; cta: string; icon: React.ElementType;
}) {
  return (
    <div className="flex flex-col items-center justify-center py-24 text-center">
      <div className="w-14 h-14 bg-surface-2 rounded-2xl flex items-center justify-center mb-4 border border-surface-border">
        <Icon size={24} className="text-gray-600" />
      </div>
      <p className="text-gray-400 font-medium mb-1">{message}</p>
      <p className="text-gray-600 text-sm mb-6">{sub}</p>
      <Link
        href={href}
        className="flex items-center gap-2 text-sm font-semibold text-white bg-brand-600 hover:bg-brand-500 px-5 py-2.5 rounded-xl transition-colors"
      >
        <PlusCircle size={15} />
        {cta}
      </Link>
    </div>
  );
}

function SessionActions({ onDelete }: { onDelete: () => void }) {
  return (
    <div className="flex items-center gap-1 shrink-0">
      <button
        onClick={(e) => { e.stopPropagation(); onDelete(); }}
        className="p-2 rounded-lg text-gray-600 hover:text-red-400 hover:bg-red-500/10 transition-all opacity-0 group-hover:opacity-100"
        title="Delete"
      >
        <Trash2 size={14} />
      </button>
      <ArrowRight size={16} className="text-gray-600 group-hover:text-brand-400 transition-colors" />
    </div>
  );
}
