"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import {
  Music, Zap, Lightbulb, Star, ArrowRight,
  Sparkles, Tag, Loader2, Download, ChevronDown,
} from "lucide-react";
import clsx from "clsx";
import PianoView, { ChordData } from "@/components/PianoView";
import ScaleView from "@/components/ScaleView";
import { API_URL } from "@/lib/config";

// ─── Types ────────────────────────────────────────────────────────────────────

interface ChordTimelineSegment {
  chord: string;
  start_beat: number;
  duration_beat: number;
}

interface Analysis {
  key: string;
  mode: string;
  key_display: string;
  bpm: number;
  duration_seconds: number;
  chords: string[];
  chord_sequence: string[];
  chord_timeline?: ChordTimelineSegment[];
  feel: { tone: string; dynamic: string; texture: string; brightness_score: number };
  playing_style: string;
}

interface Feedback {
  current_stage: string;
  what_is_working: string;
  what_is_missing: string;
  next_step: string;
  next_step_detail: string;
  optional_step: string;
  why_it_works: string;
  genre_suggestions: string[];
  mood_tags: string[];
  producer_note: string;
}

interface Props {
  analysis: Analysis;
  feedback: Feedback;
}

const FEEDBACK_PENDING = "In progress";

function feedbackBodyClass(text: string) {
  return text === FEEDBACK_PENDING
    ? "text-sm text-gray-500 italic"
    : "text-gray-300 text-sm leading-relaxed";
}

const MOOD_COLORS: Record<string, string> = {
  default: "bg-brand-500/15 text-brand-300 border-brand-500/30",
  warm:    "bg-amber-500/15 text-amber-300 border-amber-500/30",
  dark:    "bg-purple-500/15 text-purple-300 border-purple-500/30",
  bright:  "bg-cyan-500/15 text-cyan-300 border-cyan-500/30",
  chill:   "bg-green-500/15 text-green-300 border-green-500/30",
};
function moodColor(tag: string) {
  const t = tag.toLowerCase();
  if (t.includes("warm") || t.includes("mellow")) return MOOD_COLORS.warm;
  if (t.includes("dark") || t.includes("moody"))  return MOOD_COLORS.dark;
  if (t.includes("bright") || t.includes("uplift")) return MOOD_COLORS.bright;
  if (t.includes("chill") || t.includes("relax"))  return MOOD_COLORS.chill;
  return MOOD_COLORS.default;
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function StatCard({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="bg-surface-2 rounded-xl p-4 border border-surface-border">
      <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-widest mb-1">{label}</p>
      <p className="text-2xl font-bold text-white leading-none">{value}</p>
      {sub && <p className="text-xs text-gray-500 mt-0.5 capitalize">{sub}</p>}
    </div>
  );
}

function Card({
  icon: Icon,
  title,
  iconBg,
  children,
  className,
}: {
  icon: React.ElementType;
  title: string;
  iconBg: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={clsx("bg-surface-2 rounded-2xl p-5 border border-surface-border", className)}>
      <div className="flex items-center gap-2.5 mb-4">
        <div className={clsx("p-1.5 rounded-lg", iconBg)}>
          <Icon size={16} className="text-white" />
        </div>
        <h3 className="font-semibold text-gray-200 text-sm">{title}</h3>
      </div>
      {children}
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function AnalysisResult({ analysis, feedback }: Props) {
  const [pianoData, setPianoData] = useState<ChordData[] | null>(null);
  const [pianoLoading, setPianoLoading] = useState(false);
  const [pianoError, setPianoError] = useState<string | null>(null);

  const [scaleData, setScaleData] = useState<any | null>(null);
  const [scaleLoading, setScaleLoading] = useState(false);
  const [scaleError, setScaleError] = useState<string | null>(null);

  const [activeTab, setActiveTab] = useState<"piano" | "scales">("piano");
  const [midiDownloading, setMidiDownloading] = useState<"standard" | "full" | "timed" | null>(null);
  const [exportOpen, setExportOpen] = useState(false);
  const exportRef = useRef<HTMLDivElement>(null);

  // Auto-fetch piano + scale on mount
  useEffect(() => {
    let cancelled = false;
    (async () => {
      setPianoLoading(true);
      try {
        const res = await fetch(`${API_URL}/piano-chords`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ chords: analysis.chords, key: analysis.key, mode: analysis.mode }),
        });
        if (!res.ok) throw new Error();
        const data = await res.json();
        if (!cancelled) setPianoData(data.chord_data);
      } catch {
        if (!cancelled) setPianoError("Could not load piano view.");
      } finally {
        if (!cancelled) setPianoLoading(false);
      }
    })();
    (async () => {
      setScaleLoading(true);
      try {
        const res = await fetch(`${API_URL}/scale-suggestions`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ key: analysis.key, mode: analysis.mode, chords: analysis.chords }),
        });
        if (!res.ok) throw new Error();
        const data = await res.json();
        if (!cancelled) setScaleData(data);
      } catch {
        if (!cancelled) setScaleError("Could not load scale suggestions.");
      } finally {
        if (!cancelled) setScaleLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [analysis]);

  // Close export dropdown on outside click
  useEffect(() => {
    if (!exportOpen) return;
    const handler = (e: MouseEvent) => {
      if (!exportRef.current?.contains(e.target as Node)) setExportOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [exportOpen]);

  const fmt = (s: number) =>
    s < 60 ? `${s}s` : `${Math.floor(s / 60)}m ${Math.round(s % 60)}s`;

  const [styleMain, styleSub] = analysis.playing_style.split("/");

  const handleDownloadMidi = useCallback(async (
    doubleOctave: boolean,
    timed: boolean = false,
  ) => {
    const key = timed ? "timed" : doubleOctave ? "full" : "standard";
    setMidiDownloading(key);
    try {
      const body: Record<string, unknown> = {
        chord_sequence: analysis.chord_sequence ?? analysis.chords,
        bpm: analysis.bpm,
        double_octave: doubleOctave,
      };
      if (timed && analysis.chord_timeline?.length) {
        body.chord_timeline = analysis.chord_timeline;
      }
      const res = await fetch(`${API_URL}/piano-midi`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error();
      const { midi_b64 } = await res.json();
      const binary = atob(midi_b64);
      const bytes = new Uint8Array(binary.length);
      for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
      const suffix = timed ? "_timed" : doubleOctave ? "_full" : "";
      const url = URL.createObjectURL(new Blob([bytes], { type: "audio/midi" }));
      const a = document.createElement("a");
      a.href = url;
      a.download = `${analysis.key}_${analysis.mode}_${analysis.bpm}bpm_piano${suffix}.mid`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch {
      // silently ignore
    } finally {
      setMidiDownloading(null);
    }
  }, [analysis]);

  return (
    <div className="space-y-4">

      {/* ── Row 1: Stats ── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatCard label="Key"      value={analysis.key}   sub={analysis.mode} />
        <StatCard label="Tempo"    value={`${analysis.bpm}`} sub="BPM" />
        <StatCard label="Duration" value={fmt(analysis.duration_seconds)} />
        <StatCard label="Style"    value={styleMain}      sub={styleSub} />
      </div>

      {/* ── Row 2: Tab nav + Export ── */}
      <div className="bg-surface-2 border border-surface-border rounded-2xl px-4 py-2 flex items-center gap-1">
        <button
          onClick={() => setActiveTab("piano")}
          className={clsx(
            "flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all",
            activeTab === "piano"
              ? "bg-brand-600/20 text-brand-300 border border-brand-500/40"
              : "text-gray-400 hover:text-gray-200 border border-transparent"
          )}
        >
          {pianoLoading && activeTab !== "piano" ? <Loader2 size={13} className="animate-spin" /> : null}
          Piano
          {pianoLoading && <Loader2 size={13} className="animate-spin ml-1" />}
        </button>
        <button
          onClick={() => setActiveTab("scales")}
          className={clsx(
            "flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all",
            activeTab === "scales"
              ? "bg-amber-600/15 text-amber-300 border border-amber-500/35"
              : "text-gray-400 hover:text-gray-200 border border-transparent"
          )}
        >
          Scales
          {scaleLoading && <Loader2 size={13} className="animate-spin ml-1" />}
        </button>

        <div ref={exportRef} className="relative ml-auto">
          <button
            onClick={() => setExportOpen((v) => !v)}
            disabled={midiDownloading !== null}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium bg-brand-600 hover:bg-brand-500 text-white transition-colors disabled:opacity-60"
          >
            {midiDownloading ? <Loader2 size={14} className="animate-spin" /> : <Download size={14} />}
            {midiDownloading ? "Generating…" : "Export"}
            {!midiDownloading && <ChevronDown size={13} className={clsx("transition-transform", exportOpen && "rotate-180")} />}
          </button>

          {exportOpen && (
            <div className="absolute right-0 top-full mt-1.5 w-56 bg-surface-2 border border-surface-border rounded-xl shadow-xl z-20 overflow-hidden">
              <button
                onClick={() => { setExportOpen(false); handleDownloadMidi(false); }}
                className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-gray-300 hover:bg-surface-3 hover:text-white transition-colors"
              >
                <Download size={13} className="text-brand-400 shrink-0" />
                MIDI — Standard
              </button>
              <div className="mx-3 border-t border-surface-border" />
              <button
                onClick={() => { setExportOpen(false); handleDownloadMidi(true); }}
                className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-gray-300 hover:bg-surface-3 hover:text-white transition-colors"
              >
                <Download size={13} className="text-brand-400 shrink-0" />
                MIDI — Full Octave
              </button>
              {/* TODO: Match Lengths — timing accuracy needs work before shipping
              {analysis.chord_timeline?.length && (
                <>
                  <div className="mx-3 border-t border-surface-border" />
                  <button
                    onClick={() => { setExportOpen(false); handleDownloadMidi(false, true); }}
                    className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-gray-300 hover:bg-surface-3 hover:text-white transition-colors"
                  >
                    <Download size={13} className="text-amber-400 shrink-0" />
                    <span>
                      MIDI — Match Lengths
                      <span className="block text-[10px] text-gray-500">Chord durations from audio</span>
                    </span>
                  </button>
                </>
              )}
              */}
            </div>
          )}
        </div>
      </div>

      {/* ── Row 3: Active panel ── */}
      {activeTab === "piano" && (
        <>
          {pianoLoading && (
            <div className="bg-surface-2 border border-surface-border rounded-2xl p-6 flex items-center gap-3 text-gray-500 text-sm">
              <Loader2 size={15} className="animate-spin shrink-0" />Loading piano view…
            </div>
          )}
          {pianoError && <p className="text-xs text-red-400 px-1">{pianoError}</p>}
          {pianoData && <PianoView chordData={pianoData} bpm={analysis.bpm} />}
        </>
      )}
      {activeTab === "scales" && (
        <>
          {scaleLoading && (
            <div className="bg-surface-2 border border-surface-border rounded-2xl p-6 flex items-center gap-3 text-gray-500 text-sm">
              <Loader2 size={15} className="animate-spin shrink-0" />Loading scale suggestions…
            </div>
          )}
          {scaleError && <p className="text-xs text-red-400 px-1">{scaleError}</p>}
          {scaleData && <ScaleView data={scaleData} />}
        </>
      )}

      {/* ── Row 4: Sonic | Chords (enlarged) | Feedback ── */}
      <div className="flex flex-col gap-4 lg:grid lg:grid-cols-[200px_1fr_220px] lg:gap-4 lg:items-start">

        {/* Left: Sonic Feel */}
        <div className="space-y-4 w-full lg:self-start">
          <Card icon={Sparkles} title="Sonic Feel" iconBg="bg-purple-600">
            <div className="grid grid-cols-1 gap-2">
              {[
                { label: "Tone",    val: analysis.feel.tone },
                { label: "Dynamic", val: analysis.feel.dynamic },
                { label: "Texture", val: analysis.feel.texture },
              ].map(({ label, val }) => (
                <div key={label} className="bg-surface-3 rounded-xl p-3 flex justify-between items-center">
                  <p className="text-[10px] text-gray-500 uppercase tracking-wider">{label}</p>
                  <p className="text-sm font-semibold text-gray-200 capitalize">{val}</p>
                </div>
              ))}
            </div>
            <div className="mt-3">
              <div className="flex justify-between text-[10px] text-gray-500 mb-1">
                <span>Dark</span><span>Bright</span>
              </div>
              <div className="h-1.5 bg-surface-3 rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-brand-600 to-cyan-400 transition-all"
                  style={{ width: `${analysis.feel.brightness_score * 100}%` }}
                />
              </div>
            </div>
          </Card>
        </div>

        {/* Center: Chord Progression — enlarged */}
        <div className="w-full min-w-0 lg:self-start">
          <div className="bg-surface-2 rounded-2xl p-6 border border-surface-border">
            <div className="flex items-center gap-2.5 mb-5">
              <div className="p-1.5 rounded-lg bg-brand-600">
                <Music size={16} className="text-white" />
              </div>
              <h3 className="font-semibold text-gray-200 text-sm">Chord Progression</h3>
            </div>

            <div className="mb-4">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Order Played</p>
              <div className="flex flex-wrap gap-2.5">
                {(analysis.chord_sequence ?? analysis.chords).map((chord, i) => (
                  <span key={i} className="chord-pill text-sm px-3 py-1.5">{chord}</span>
                ))}
              </div>
            </div>

            <div className="border-t border-surface-border pt-4">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Unique Chords</p>
              <div className="flex flex-wrap gap-2.5">
                {analysis.chords.map((chord, i) => (
                  <span key={i} className="chord-pill text-sm px-3 py-1.5">{chord}</span>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Right: Stage / Working / Missing */}
        <div className="space-y-4 w-full lg:self-start">
          <div className="flex items-start gap-3 bg-surface-2 rounded-2xl p-5 border border-surface-border">
            <div className="p-1.5 bg-gradient-to-br from-brand-600 to-accent-purple rounded-lg shrink-0">
              <Zap size={16} className="text-white" />
            </div>
            <div>
              <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-widest mb-1">Current Stage</p>
              <p className={clsx("text-sm font-semibold", feedback.current_stage === FEEDBACK_PENDING ? "text-gray-500 italic" : "text-gray-200")}>
                {feedback.current_stage}
              </p>
            </div>
          </div>

          <div className="bg-surface-2 rounded-2xl p-5 border border-surface-border">
            <div className="flex items-center gap-2 mb-3">
              <Star size={14} className="text-green-400 shrink-0" />
              <p className="text-[10px] font-semibold text-green-400 uppercase tracking-widest">What's Working</p>
            </div>
            <p className={feedbackBodyClass(feedback.what_is_working)}>{feedback.what_is_working}</p>
          </div>

          <div className="bg-surface-2 rounded-2xl p-5 border border-surface-border">
            <div className="flex items-center gap-2 mb-3">
              <ArrowRight size={14} className="text-amber-400 shrink-0" />
              <p className="text-[10px] font-semibold text-amber-400 uppercase tracking-widest">What's Missing</p>
            </div>
            <p className={feedbackBodyClass(feedback.what_is_missing)}>{feedback.what_is_missing}</p>
          </div>
        </div>
      </div>

      {/* ── Next Step hero ── */}
      <div className="gradient-border">
        <div className="bg-surface-1 rounded-2xl p-6">
          <div className="flex items-center gap-2 mb-3">
            <div className="p-1.5 bg-gradient-to-br from-brand-500 to-accent-purple rounded-lg">
              <Lightbulb size={15} className="text-white" />
            </div>
            <span className="text-[10px] font-bold uppercase tracking-widest text-brand-400">Next Step</span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <p className={clsx("mb-3", feedback.next_step === FEEDBACK_PENDING ? "text-xl font-semibold text-gray-500 italic" : "text-xl font-bold text-white")}>
                {feedback.next_step}
              </p>
              <p className={feedbackBodyClass(feedback.next_step_detail)}>{feedback.next_step_detail}</p>
            </div>
            {feedback.optional_step && (
              <div className="border-t md:border-t-0 md:border-l border-surface-border pt-4 md:pt-0 md:pl-6">
                <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider mb-2">Also Consider</p>
                <p className={feedbackBodyClass(feedback.optional_step)}>{feedback.optional_step}</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Genre / Mood / Why ── */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-surface-2 rounded-2xl p-5 border border-surface-border">
          <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-widest mb-3">Genre Directions</p>
          {feedback.genre_suggestions?.length ? (
            <div className="flex flex-wrap gap-1.5">
              {feedback.genre_suggestions.map((g) => (
                <span key={g} className="text-xs bg-surface-3 border border-surface-border text-gray-300 rounded-lg px-2.5 py-1">{g}</span>
              ))}
            </div>
          ) : (
            <p className="text-sm text-gray-500 italic">In progress</p>
          )}
        </div>

        <div className="bg-surface-2 rounded-2xl p-5 border border-surface-border">
          <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-widest mb-3 flex items-center gap-1.5">
            <Tag size={10} /> Mood Tags
          </p>
          {feedback.mood_tags?.length ? (
            <div className="flex flex-wrap gap-1.5">
              {feedback.mood_tags.map((m) => (
                <span key={m} className={clsx("text-xs border rounded-lg px-2.5 py-1", moodColor(m))}>{m}</span>
              ))}
            </div>
          ) : (
            <p className="text-sm text-gray-500 italic">In progress</p>
          )}
        </div>

        <Card icon={Lightbulb} title="Why It Works" iconBg="bg-cyan-600">
          <p className={clsx("text-xs leading-relaxed", feedback.why_it_works === FEEDBACK_PENDING ? "text-gray-500 italic" : "text-gray-400")}>
            {feedback.why_it_works}
          </p>
        </Card>
      </div>

      {/* ── Producer note ── */}
      <div className="bg-gradient-to-r from-brand-900/30 to-accent-purple/10 rounded-2xl p-5 border border-brand-800/30">
        <div className="flex gap-3">
          <span className="text-2xl shrink-0">🎸</span>
          <p className={clsx("text-sm leading-relaxed", feedback.producer_note === FEEDBACK_PENDING ? "text-gray-500 italic" : "text-gray-300 italic")}>
            {feedback.producer_note}
          </p>
        </div>
      </div>

    </div>
  );
}
