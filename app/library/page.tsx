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
} from "lucide-react";
import clsx from "clsx";
import { useAuth } from "@/context/AuthContext";
import { authHeaders } from "@/lib/auth";
import { sheetStore } from "@/lib/sheetStore";
import { resultStore } from "@/lib/resultStore";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

type Tab = "overview" | "guitar" | "visualizer";

interface MeData {
  plan: "free" | "pro" | "studio";
  monthly_uses: number;
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

function SessionCard({ label, subtitle, icon: Icon, onClick, loading }: {
  label: string;
  subtitle: string;
  icon: React.ElementType;
  onClick: () => void;
  loading?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      disabled={loading}
      className="group glass rounded-2xl p-5 text-left border border-surface-border hover:border-brand-500/40 transition-all hover:bg-surface-3/50 disabled:opacity-60 w-full"
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
  );
}

export default function LibraryPage() {
  const { user } = useAuth();
  const router = useRouter();

  const [tab, setTab] = useState<Tab>("overview");
  const [me, setMe] = useState<MeData | null>(null);
  const [guitarSessions, setGuitarSessions] = useState<GuitarCard[]>([]);
  const [visualizerSessions, setVisualizerSessions] = useState<VisualizerCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [openingId, setOpeningId] = useState<number | null>(null);

  useEffect(() => {
    if (!user) {
      router.replace("/login?next=/library");
      return;
    }

    const headers = authHeaders();
    Promise.all([
      fetch(`${API_URL}/auth/me`, { headers }).then((r) => r.json()),
      fetch(`${API_URL}/sessions/guitar`, { headers }).then((r) => r.json()),
      fetch(`${API_URL}/sessions/visualizer`, { headers }).then((r) => r.json()),
    ])
      .then(([meData, guitar, visualizer]) => {
        setMe(meData);
        setGuitarSessions(Array.isArray(guitar) ? guitar : []);
        setVisualizerSessions(Array.isArray(visualizer) ? visualizer : []);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [user, router]);

  const openGuitarSession = (id: number) => {
    router.push(`/results?session=${id}`);
  };

  const openVisualizerSession = async (id: number) => {
    setOpeningId(id);
    try {
      const res = await fetch(`${API_URL}/sessions/visualizer/${id}`, { headers: authHeaders() });
      if (!res.ok) throw new Error();
      const data = await res.json();
      sheetStore.set(data.sheet);
      router.push("/visualizer/play");
    } catch {
      setOpeningId(null);
    }
  };

  if (!user) return null;

  const plan = PLAN_INFO[me?.plan ?? "free"];

  const TABS: { id: Tab; label: string }[] = [
    { id: "overview", label: "Overview" },
    { id: "guitar", label: "Guitar" },
    { id: "visualizer", label: "Visualizer" },
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
        <div className="flex bg-surface-3 rounded-2xl p-1 mb-8 border border-surface-border max-w-sm">
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
            {/* Plan card */}
            <div className={clsx("glass rounded-2xl p-5 border", plan.border, plan.bg)}>
              <div className="flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <Zap size={14} className={plan.color} />
                    <span className={clsx("font-bold text-sm", plan.color)}>{plan.label} Plan</span>
                  </div>
                  {me && (
                    <p className="text-gray-400 text-xs">
                      {me.monthly_uses} {me.monthly_uses === 1 ? "analysis" : "analyses"} this month
                    </p>
                  )}
                </div>
                {me?.plan !== "studio" && (
                  <Link
                    href="/pricing"
                    className="text-xs font-semibold text-white bg-brand-600 hover:bg-brand-500 px-3 py-1.5 rounded-lg transition-colors"
                  >
                    Upgrade
                  </Link>
                )}
              </div>
            </div>

            {/* Recent Projects */}
            <div className="space-y-3">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Recent Projects</p>
              {loading ? (
                <div className="flex items-center justify-center py-6">
                  <div className="w-5 h-5 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
                </div>
              ) : guitarSessions.length === 0 ? (
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
                  {guitarSessions.slice(0, 3).map((s) => (
                    <SessionCard
                      key={s.id}
                      label={s.label}
                      subtitle={formatDate(s.created_at)}
                      icon={Guitar}
                      onClick={() => openGuitarSession(s.id)}
                    />
                  ))}
                </div>
              )}
            </div>

            {/* CTAs */}
            <div className="space-y-3">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Tools</p>
              <CtaCard
                href="/analyze"
                icon={Guitar}
                label="Guitar → Piano"
                desc="Chords, tempo & key from a recording"
                accent
              />
              <CtaCard
                href="/visualizer"
                icon={Music2}
                label="Piano Visualizer"
                desc="MIDI & songs with a lit keyboard"
              />
            </div>

            {/* Secondary links */}
            <div className="flex gap-4 text-xs text-gray-600">
              <Link href="/account" className="hover:text-brand-400 transition-colors">Account settings</Link>
              <Link href="/pricing" className="hover:text-brand-400 transition-colors">Plans & pricing</Link>
            </div>
          </div>
        )}

        {/* ── Guitar tab ───────────────────────────────────────────────── */}
        {tab === "guitar" && (
          <div>
            <div className="mb-5">
              <Link
                href="/analyze"
                className="inline-flex items-center gap-2 text-sm font-semibold text-white bg-brand-600 hover:bg-brand-500 px-4 py-2 rounded-xl transition-colors"
              >
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
                <Link
                  href="/analyze"
                  className="flex items-center gap-2 text-sm font-semibold text-white bg-brand-600 hover:bg-brand-500 px-4 py-2 rounded-xl transition-colors"
                >
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
                  />
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── Visualizer tab ───────────────────────────────────────────── */}
        {tab === "visualizer" && (
          <div>
            <div className="mb-5">
              <Link
                href="/visualizer"
                className="inline-flex items-center gap-2 text-sm font-semibold text-white bg-brand-600 hover:bg-brand-500 px-4 py-2 rounded-xl transition-colors"
              >
                <Music2 size={15} />
                Open visualizer
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
                <p className="text-gray-600 text-sm mb-5">Use the visualizer to generate a session.</p>
                <Link
                  href="/visualizer"
                  className="flex items-center gap-2 text-sm font-semibold text-white bg-brand-600 hover:bg-brand-500 px-4 py-2 rounded-xl transition-colors"
                >
                  <Music2 size={15} />
                  Open visualizer
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
                    loading={openingId === s.id}
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
