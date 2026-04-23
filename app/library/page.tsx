"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Guitar,
  Music2,
  Clock,
  BookOpen,
  Upload,
  ArrowRight,
  Zap,
  PlusCircle,
  Wand2,
  Trash2,
  Lock,
} from "lucide-react";
import clsx from "clsx";
import { useAuth } from "@/context/AuthContext";
import { usePlatform } from "@/context/PlatformContext";
import { authHeaders, getFingerprint } from "@/lib/auth";
import { sheetStore } from "@/lib/sheetStore";
import { resultStore } from "@/lib/resultStore";
import { API_URL } from "@/lib/config";

type Tab = "overview" | "guitar" | "visualizer" | "producer";

interface MeData {
  plan: "free" | "pro" | "studio";
  monthly_uses: number;
}

interface AnonStatus {
  uses_remaining: number;
  monthly_uses: number;
  limit: number;
}

interface GuitarCard {
  id: number;
  label: string;
  created_at: string;
}

interface VisualizerCard {
  id: number;
  title: string;
  source: "learn" | "midi";
  created_at: string;
}

interface ProducerCard {
  id: number;
  title: string;
  created_at: string;
}

const PLAN_INFO = {
  free:    { label: "Free",   color: "text-gray-400",   bg: "bg-surface-3",       border: "border-surface-border" },
  pro:     { label: "Pro",    color: "text-brand-400",  bg: "bg-brand-600/10",    border: "border-brand-500/30"  },
  studio:  { label: "Studio", color: "text-amber-400",  bg: "bg-amber-600/10",    border: "border-amber-500/30"  },
};

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function CtaCard({ href, icon: Icon, label, desc, accent = false }: {
  href: string;
  icon: React.ElementType;
  label: string;
  desc: string;
  accent?: boolean;
}) {
  return (
    <Link
      href={href}
      className={clsx(
        "group flex items-center gap-4 w-full glass rounded-2xl border p-4 text-left transition-all hover:bg-brand-500/5",
        accent ? "border-brand-500/30 hover:border-brand-400/50" : "border-surface-border hover:border-brand-500/30"
      )}
    >
      <div className={clsx("p-3 rounded-xl shrink-0", accent ? "bg-brand-600/20 text-brand-400" : "bg-surface-3 text-gray-400")}>
        <Icon size={20} strokeWidth={1.75} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-semibold text-white text-sm">{label}</p>
        <p className="text-xs text-gray-500 mt-0.5">{desc}</p>
      </div>
      <ArrowRight size={16} className="text-gray-600 group-hover:text-brand-400 shrink-0 transition-colors" />
    </Link>
  );
}

function SessionCard({ label, subtitle, icon: Icon, onClick, onDelete, loading, deleting }: {
  label: string;
  subtitle: string;
  icon: React.ElementType;
  onClick: () => void;
  onDelete?: () => void;
  loading?: boolean;
  deleting?: boolean;
}) {
  return (
    <div className={clsx("group relative glass rounded-2xl border border-surface-border hover:border-brand-500/40 transition-all hover:bg-surface-3/50", deleting && "opacity-50 pointer-events-none")}>
      <button
        onClick={onClick}
        disabled={loading || deleting}
        className="w-full p-5 text-left disabled:opacity-60"
      >
        <div className="flex items-start justify-between gap-3">
          <div className="w-9 h-9 bg-brand-600/15 rounded-xl flex items-center justify-center shrink-0">
            <Icon size={16} className="text-brand-400" />
          </div>
          {loading ? (
            <div className="w-4 h-4 border-2 border-brand-500 border-t-transparent rounded-full animate-spin mt-0.5 shrink-0" />
          ) : (
            <ArrowRight size={15} className="text-gray-600 group-hover:text-brand-400 transition-colors mt-0.5 shrink-0" />
          )}
        </div>
        <p className="text-white font-semibold text-sm mt-3 truncate">{label}</p>
        <div className="flex items-center gap-1.5 mt-1.5">
          <Clock size={11} className="text-gray-600" />
          <p className="text-gray-500 text-xs">{subtitle}</p>
        </div>
      </button>
      {onDelete && (
        <button
          onClick={(e) => { e.stopPropagation(); onDelete(); }}
          className="absolute top-3 right-3 p-1.5 rounded-lg text-gray-600 hover:text-red-400 hover:bg-red-500/10 transition-all opacity-0 group-hover:opacity-100"
          title="Delete"
        >
          <Trash2 size={13} />
        </button>
      )}
    </div>
  );
}

function isMeData(x: unknown): x is MeData {
  return (
    typeof x === "object" &&
    x !== null &&
    "plan" in x &&
    typeof (x as MeData).plan === "string" &&
    ["free", "pro", "studio"].includes((x as MeData).plan) &&
    "monthly_uses" in x &&
    typeof (x as MeData).monthly_uses === "number"
  );
}

async function parseJsonIfOk(res: Response): Promise<unknown | null> {
  if (!res.ok) return null;
  try { return await res.json(); } catch { return null; }
}

export default function LibraryPage() {
  const { user, token } = useAuth();
  const { free_mode, producer_enabled } = usePlatform();
  const router = useRouter();

  const [tab, setTab] = useState<Tab>("overview");
  const [me, setMe] = useState<MeData | null>(null);
  const [anonStatus, setAnonStatus] = useState<AnonStatus | null>(null);
  const [guitarSessions, setGuitarSessions] = useState<GuitarCard[]>([]);
  const [visualizerSessions, setVisualizerSessions] = useState<VisualizerCard[]>([]);
  const [producerSessions, setProducerSessions] = useState<ProducerCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [openingId, setOpeningId] = useState<number | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);

    if (token) {
      // Authenticated: fetch user data + sessions
      const headers: HeadersInit = { Authorization: `Bearer ${token}` };
      Promise.allSettled([
        fetch(`${API_URL}/auth/me`, { headers }).then(parseJsonIfOk),
        fetch(`${API_URL}/sessions/guitar`, { headers }).then(parseJsonIfOk),
        fetch(`${API_URL}/sessions/visualizer`, { headers }).then(parseJsonIfOk),
        fetch(`${API_URL}/sessions/producer`, { headers }).then(parseJsonIfOk),
      ])
        .then((outcomes) => {
          const meRaw = outcomes[0].status === "fulfilled" ? outcomes[0].value : null;
          const guitarRaw = outcomes[1].status === "fulfilled" ? outcomes[1].value : null;
          const visualizerRaw = outcomes[2].status === "fulfilled" ? outcomes[2].value : null;
          const producerRaw = outcomes[3].status === "fulfilled" ? outcomes[3].value : null;
          setMe(isMeData(meRaw) ? meRaw : null);
          setGuitarSessions(Array.isArray(guitarRaw) ? guitarRaw : []);
          setVisualizerSessions(Array.isArray(visualizerRaw) ? visualizerRaw : []);
          setProducerSessions(Array.isArray(producerRaw) ? producerRaw : []);
        })
        .finally(() => setLoading(false));
    } else {
      // Anonymous: fetch sessions by fingerprint
      const headers = authHeaders();
      Promise.allSettled([
        fetch(`${API_URL}/auth/anonymous-status`, { headers }).then(parseJsonIfOk),
        fetch(`${API_URL}/sessions/anonymous/guitar`, { headers }).then(parseJsonIfOk),
        fetch(`${API_URL}/sessions/anonymous/visualizer`, { headers }).then(parseJsonIfOk),
        fetch(`${API_URL}/sessions/anonymous/producer`, { headers }).then(parseJsonIfOk),
      ])
        .then((outcomes) => {
          const statusRaw = outcomes[0].status === "fulfilled" ? outcomes[0].value : null;
          const guitarRaw = outcomes[1].status === "fulfilled" ? outcomes[1].value : null;
          const visualizerRaw = outcomes[2].status === "fulfilled" ? outcomes[2].value : null;
          const producerRaw = outcomes[3].status === "fulfilled" ? outcomes[3].value : null;
          if (statusRaw && typeof statusRaw === "object" && "uses_remaining" in statusRaw) {
            setAnonStatus(statusRaw as AnonStatus);
          }
          setGuitarSessions(Array.isArray(guitarRaw) ? guitarRaw : []);
          setVisualizerSessions(Array.isArray(visualizerRaw) ? visualizerRaw : []);
          setProducerSessions(Array.isArray(producerRaw) ? producerRaw : []);
        })
        .finally(() => setLoading(false));
    }
  }, [token]);

  const sessionPrefix = user ? "sessions" : "sessions/anonymous";

  const openGuitarSession = (id: number) => {
    router.push(`/results?session=${id}${!user ? "&anon=1" : ""}`);
  };

  const openProducerSession = (id: number) => {
    router.push(`/producer?session=${id}${!user ? "&anon=1" : ""}`);
  };

  const deleteSession = async (type: "guitar" | "visualizer" | "producer", id: number) => {
    const key = `${type}-${id}`;
    setDeletingId(key);
    try {
      await fetch(`${API_URL}/${sessionPrefix}/${type}/${id}`, {
        method: "DELETE",
        headers: authHeaders(),
      });
      if (type === "guitar") setGuitarSessions((p) => p.filter((s) => s.id !== id));
      if (type === "visualizer") setVisualizerSessions((p) => p.filter((s) => s.id !== id));
      if (type === "producer") setProducerSessions((p) => p.filter((s) => s.id !== id));
    } finally {
      setDeletingId(null);
    }
  };

  const openVisualizerSession = async (id: number) => {
    setOpeningId(id);
    try {
      const res = await fetch(`${API_URL}/${sessionPrefix}/visualizer/${id}`, { headers: authHeaders() });
      if (!res.ok) throw new Error();
      const data = await res.json();
      sheetStore.set(data.sheet);
      router.push("/visualizer/play");
    } catch {
      setOpeningId(null);
    }
  };

  const TABS: { id: Tab; label: string }[] = [
    { id: "overview", label: "Overview" },
    { id: "guitar", label: "Guitar" },
    { id: "visualizer", label: "Piano visualizer" },
    { id: "producer", label: "Producer" },
  ];

  return (
    <div className="min-h-screen bg-surface relative overflow-hidden">
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          backgroundImage:
            "linear-gradient(rgba(99,102,241,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(99,102,241,0.03) 1px, transparent 1px)",
          backgroundSize: "40px 40px",
        }}
      />

      <div className="relative z-10 max-w-4xl mx-auto px-4 py-10 sm:py-14">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-white">Library</h1>
          <p className="text-gray-500 text-sm mt-1">Your sessions and account</p>
        </div>

        {/* Tab switcher */}
        <div className="flex bg-surface-3 rounded-2xl p-1 mb-8 border border-surface-border max-w-md">
          {TABS.map(({ id, label }) => (
            <button
              key={id}
              onClick={() => setTab(id)}
              className={clsx(
                "flex-1 py-2 px-3 rounded-xl font-medium text-sm transition-all",
                tab === id
                  ? "bg-brand-600 text-white shadow-lg shadow-brand-900/30"
                  : "text-gray-500 hover:text-gray-300"
              )}
            >
              {label}
            </button>
          ))}
        </div>

        {/* ── Overview tab ──────────────────────────────────────────────── */}
        {tab === "overview" && (
          <div className="space-y-6">
            {/* Plan card — authenticated */}
            {user && (
              <div className={clsx("glass rounded-2xl p-5 border", PLAN_INFO[me?.plan ?? "free"].border, PLAN_INFO[me?.plan ?? "free"].bg)}>
                <div className="flex items-center justify-between">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <Zap size={14} className={PLAN_INFO[me?.plan ?? "free"].color} />
                      <span className={clsx("font-bold text-sm", PLAN_INFO[me?.plan ?? "free"].color)}>
                        {PLAN_INFO[me?.plan ?? "free"].label} Plan
                      </span>
                    </div>
                    {me && (
                      <p className="text-gray-400 text-xs">
                        {me.plan === "free"
                          ? `${me.monthly_uses} / 3 analyses used this month`
                          : "Unlimited analyses"}
                      </p>
                    )}
                  </div>
                  {me?.plan === "free" && !free_mode && (
                    <Link
                      href="/pricing"
                      className="text-xs font-semibold text-white bg-brand-600 hover:bg-brand-500 px-3 py-1.5 rounded-lg transition-colors"
                    >
                      Upgrade
                    </Link>
                  )}
                </div>
              </div>
            )}

            {/* Anonymous usage card */}
            {!user && (
              <div className="glass rounded-2xl p-5 border border-surface-border">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <Lock size={14} className="text-gray-400" />
                      <span className="font-bold text-sm text-gray-300">Guest</span>
                    </div>
                    {!free_mode && anonStatus ? (
                      <p className="text-gray-400 text-xs">
                        {anonStatus.monthly_uses} / {anonStatus.limit} free analyses used
                        {anonStatus.uses_remaining === 0 ? " — limit reached" : ""}
                      </p>
                    ) : (
                      <p className="text-gray-400 text-xs">Sign in to save your sessions permanently</p>
                    )}
                  </div>
                  <Link
                    href="/login"
                    className="text-xs font-semibold text-white bg-brand-600 hover:bg-brand-500 px-3 py-1.5 rounded-lg transition-colors"
                  >
                    Sign in
                  </Link>
                </div>
              </div>
            )}

            {/* Recent Projects */}
            {(() => {
              const recentProjects = [
                ...guitarSessions.map((s) => ({ type: "guitar" as const, id: s.id, label: s.label, created_at: s.created_at })),
                ...producerSessions.map((s) => ({ type: "producer" as const, id: s.id, label: s.title, created_at: s.created_at })),
              ]
                .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
                .slice(0, 3);

              return (
                <div className="space-y-3">
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Recent Projects</p>
                  {loading ? (
                    <div className="flex items-center justify-center py-6">
                      <div className="w-5 h-5 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
                    </div>
                  ) : recentProjects.length === 0 ? (
                    <div className="glass rounded-2xl border border-surface-border p-6 text-center">
                      <p className="text-gray-400 text-sm font-medium mb-1">No projects created yet</p>
                      <Link
                        href="/analyze"
                        className="inline-flex items-center gap-1.5 text-xs text-brand-400 hover:text-brand-300 font-semibold transition-colors mt-1"
                      >
                        <PlusCircle size={13} />
                        Create your first project
                      </Link>
                    </div>
                  ) : (
                    <div className="grid gap-3 sm:grid-cols-2">
                      {recentProjects.map((p) => (
                        <SessionCard
                          key={`${p.type}-${p.id}`}
                          label={p.label}
                          subtitle={formatDate(p.created_at)}
                          icon={p.type === "producer" ? Wand2 : Guitar}
                          onClick={() => p.type === "producer" ? openProducerSession(p.id) : openGuitarSession(p.id)}
                          onDelete={() => deleteSession(p.type, p.id)}
                          deleting={deletingId === `${p.type}-${p.id}`}
                        />
                      ))}
                    </div>
                  )}
                </div>
              );
            })()}

            {/* CTAs */}
            <div className="space-y-3">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Tools</p>
              <CtaCard href="/analyze" icon={Guitar} label="Guitar → Piano" desc="Chords, tempo & key from a recording" accent />
              <CtaCard href="/visualizer" icon={Music2} label="Piano visualizer" desc="MIDI & songs with a lit keyboard" />
              {producer_enabled && <CtaCard href="/producer" icon={Wand2} label="Producer" desc="Full mixes — harmony, melody & MIDI export" />}
            </div>

            {/* Secondary links */}
            <div className="flex gap-4 text-xs text-gray-600">
              {user && <Link href="/account" className="hover:text-brand-400 transition-colors">Account settings</Link>}
              {!free_mode && <Link href="/pricing" className="hover:text-brand-400 transition-colors">Plans & pricing</Link>}
              {!user && (
                <Link href="/login" className="hover:text-brand-400 transition-colors">Sign in</Link>
              )}
            </div>
          </div>
        )}

        {/* ── Guitar tab ───────────────────────────────────────────────── */}
        {tab === "guitar" && (
          <div>
            <div className="mb-5">
              <Link href="/analyze" className="inline-flex items-center gap-2 text-sm font-semibold text-white bg-brand-600 hover:bg-brand-500 px-4 py-2 rounded-xl transition-colors">
                <PlusCircle size={15} />
                New analysis
              </Link>
            </div>
            {loading ? (
              <div className="flex items-center justify-center py-20">
                <div className="w-6 h-6 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
              </div>
            ) : guitarSessions.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 text-center">
                <Guitar size={40} className="text-gray-600 mb-4" />
                <p className="text-gray-400 font-medium mb-1">No sessions yet</p>
                <p className="text-gray-600 text-sm mb-5">Analyze a guitar recording to save it here.</p>
                <Link href="/analyze" className="flex items-center gap-2 text-sm font-semibold text-white bg-brand-600 hover:bg-brand-500 px-4 py-2 rounded-xl transition-colors">
                  <PlusCircle size={15} />
                  Go to Guitar → Piano
                </Link>
              </div>
            ) : (
              <div className="grid gap-3 sm:grid-cols-2">
                {guitarSessions.map((s) => (
                  <SessionCard
                    key={s.id}
                    label={s.label}
                    subtitle={formatDate(s.created_at)}
                    icon={Guitar}
                    onClick={() => openGuitarSession(s.id)}
                    onDelete={() => deleteSession("guitar", s.id)}
                    deleting={deletingId === `guitar-${s.id}`}
                  />
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── Piano visualizer tab ─────────────────────────────────────── */}
        {tab === "visualizer" && (
          <div>
            <div className="mb-5">
              <Link href="/visualizer" className="inline-flex items-center gap-2 text-sm font-semibold text-white bg-brand-600 hover:bg-brand-500 px-4 py-2 rounded-xl transition-colors">
                <Music2 size={15} />
                Open piano visualizer
              </Link>
            </div>
            {loading ? (
              <div className="flex items-center justify-center py-20">
                <div className="w-6 h-6 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
              </div>
            ) : visualizerSessions.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 text-center">
                <Music2 size={40} className="text-gray-600 mb-4" />
                <p className="text-gray-400 font-medium mb-1">No sessions yet</p>
                <p className="text-gray-600 text-sm mb-5">Use the piano visualizer to generate a session.</p>
                <Link href="/visualizer" className="flex items-center gap-2 text-sm font-semibold text-white bg-brand-600 hover:bg-brand-500 px-4 py-2 rounded-xl transition-colors">
                  <Music2 size={15} />
                  Open piano visualizer
                </Link>
              </div>
            ) : (
              <div className="grid gap-3 sm:grid-cols-2">
                {visualizerSessions.map((s) => (
                  <SessionCard
                    key={s.id}
                    label={s.title}
                    subtitle={`${s.source === "midi" ? "MIDI • " : ""}${formatDate(s.created_at)}`}
                    icon={s.source === "midi" ? Upload : BookOpen}
                    onClick={() => openVisualizerSession(s.id)}
                    onDelete={() => deleteSession("visualizer", s.id)}
                    loading={openingId === s.id}
                    deleting={deletingId === `visualizer-${s.id}`}
                  />
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── Producer tab ─────────────────────────────────────────────── */}
        {tab === "producer" && (
          <div>
            <div className="mb-5">
              <Link href="/producer" className="inline-flex items-center gap-2 text-sm font-semibold text-white bg-brand-600 hover:bg-brand-500 px-4 py-2 rounded-xl transition-colors">
                <Wand2 size={15} />
                New analysis
              </Link>
            </div>
            {loading ? (
              <div className="flex items-center justify-center py-20">
                <div className="w-6 h-6 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
              </div>
            ) : producerSessions.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 text-center">
                <Wand2 size={40} className="text-gray-600 mb-4" />
                <p className="text-gray-400 font-medium mb-1">No sessions yet</p>
                <p className="text-gray-600 text-sm mb-5">Analyse audio with Producer to save it here.</p>
                <Link href="/producer" className="flex items-center gap-2 text-sm font-semibold text-white bg-brand-600 hover:bg-brand-500 px-4 py-2 rounded-xl transition-colors">
                  <Wand2 size={15} />
                  Go to Producer
                </Link>
              </div>
            ) : (
              <div className="grid gap-3 sm:grid-cols-2">
                {producerSessions.map((s) => (
                  <SessionCard
                    key={s.id}
                    label={s.title}
                    subtitle={formatDate(s.created_at)}
                    icon={Wand2}
                    onClick={() => openProducerSession(s.id)}
                    onDelete={() => deleteSession("producer", s.id)}
                    loading={openingId === s.id}
                    deleting={deletingId === `producer-${s.id}`}
                  />
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
