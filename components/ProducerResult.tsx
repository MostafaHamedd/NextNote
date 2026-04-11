"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { Download, FileJson, Mic, Music2, AlertTriangle, Info, Piano, Loader2, ChevronDown } from "lucide-react";
import clsx from "clsx";
import PianoView, { ChordData } from "@/components/PianoView";
import ScaleView from "@/components/ScaleView";
import { API_URL } from "@/lib/config";

// ── Types ─────────────────────────────────────────────────────────────────────

export interface MelodyNote {
  midi: number;
  name: string;
  start_beat: number;
  duration_beat: number;
  start_sec: number;
  duration_sec: number;
}

export interface StemHint {
  label: "vocal_like" | "melodic_instrument" | "percussive" | "mixed";
  display: string;
  note: string;
  disclaimer: string;
}

interface ChordTimelineSegment {
  chord: string;
  start_beat: number;
  duration_beat: number;
}

export interface ProducerData {
  analysis_summary: {
    key: string;
    mode: string;
    key_display: string;
    bpm: number;
    duration_seconds: number;
    chords: string[];
    chord_sequence: string[];
    chord_timeline?: ChordTimelineSegment[];
    key_confidence: number;
  };
  melody_notes: MelodyNote[];
  note_count: number;
  stem_hint: StemHint;
  chord_confidence_low: boolean;
  warnings: string[];
  midi_b64: string;
  grid_used: string;
  snap_to_key: boolean;
}

interface Props {
  data: ProducerData;
  filename: string;
}

// ── Download helpers ──────────────────────────────────────────────────────────

function triggerDownload(blob: Blob, name: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function downloadMidi(b64: string, filename: string) {
  const binary = atob(b64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  triggerDownload(new Blob([bytes], { type: "audio/midi" }), filename);
}

function downloadJson(data: object, filename: string) {
  triggerDownload(
    new Blob([JSON.stringify(data, null, 2)], { type: "application/json" }),
    filename
  );
}

// ── Sub-components ────────────────────────────────────────────────────────────

function StatCard({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="bg-surface-2 rounded-xl p-4 border border-surface-border">
      <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-widest mb-1">{label}</p>
      <p className="text-2xl font-bold text-white leading-none">{value}</p>
      {sub && <p className="text-xs text-gray-500 mt-0.5">{sub}</p>}
    </div>
  );
}

function SectionCard({
  icon: Icon,
  iconBg,
  title,
  children,
  className,
}: {
  icon: React.ElementType;
  iconBg: string;
  title: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={clsx("bg-surface-2 rounded-2xl p-5 border border-surface-border", className)}>
      <div className="flex items-center gap-2.5 mb-4">
        <div className={clsx("p-1.5 rounded-lg", iconBg)}>
          <Icon size={15} className="text-white" />
        </div>
        <h3 className="font-semibold text-gray-200 text-sm">{title}</h3>
      </div>
      {children}
    </div>
  );
}

const HINT_STYLES: Record<string, { badge: string; dot: string }> = {
  vocal_like:        { badge: "bg-purple-500/15 text-purple-300 border-purple-500/30", dot: "bg-purple-400" },
  melodic_instrument:{ badge: "bg-brand-500/15 text-brand-300 border-brand-500/30",   dot: "bg-brand-400" },
  percussive:        { badge: "bg-amber-500/15 text-amber-300 border-amber-500/30",    dot: "bg-amber-400" },
  mixed:             { badge: "bg-red-500/15 text-red-300 border-red-500/30",          dot: "bg-red-400"   },
};

function fmt(s: number) {
  return s < 60 ? `${s.toFixed(1)}s` : `${Math.floor(s / 60)}m ${Math.round(s % 60)}s`;
}

// ── Main component ────────────────────────────────────────────────────────────

export default function ProducerResult({ data, filename }: Props) {
  const { analysis_summary: a, melody_notes, note_count, stem_hint, chord_confidence_low, warnings, midi_b64, grid_used } = data;
  const baseName = filename.replace(/\.[^.]+$/, "");
  const midiFilename = `${baseName}_nextnote.mid`;
  const jsonFilename = `${baseName}_nextnote.json`;
  const hintStyle = HINT_STYLES[stem_hint.label] ?? HINT_STYLES.mixed;
  const PREVIEW_LIMIT = 32;

  // ── Piano + Scale state (auto-fetched) ──
  const [activeTab, setActiveTab] = useState<"piano" | "scales">("piano");
  const [pianoData, setPianoData] = useState<ChordData[] | null>(null);
  const [pianoLoading, setPianoLoading] = useState(false);
  const [pianoError, setPianoError] = useState<string | null>(null);

  const [scaleData, setScaleData] = useState<any | null>(null);
  const [scaleLoading, setScaleLoading] = useState(false);
  const [scaleError, setScaleError] = useState<string | null>(null);

  // ── Export dropdown ──
  const [chordMidiDownloading, setChordMidiDownloading] = useState<"standard" | "full" | "timed" | "scale" | null>(null);
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
          body: JSON.stringify({ chords: a.chords, key: a.key, mode: a.mode }),
        });
        if (!res.ok) throw new Error();
        const json = await res.json();
        if (!cancelled) setPianoData(json.chord_data);
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
          body: JSON.stringify({ key: a.key, mode: a.mode, chords: a.chords }),
        });
        if (!res.ok) throw new Error();
        const json = await res.json();
        if (!cancelled) setScaleData(json);
      } catch {
        if (!cancelled) setScaleError("Could not load scale suggestions.");
      } finally {
        if (!cancelled) setScaleLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [a]);

  // Close export dropdown on outside click
  useEffect(() => {
    if (!exportOpen) return;
    const handler = (e: MouseEvent) => {
      if (!exportRef.current?.contains(e.target as Node)) setExportOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [exportOpen]);

  const handleDownloadChordMidi = useCallback(async (
    doubleOctave: boolean,
    timed: boolean = false,
  ) => {
    const key = timed ? "timed" : doubleOctave ? "full" : "standard";
    setChordMidiDownloading(key);
    try {
      const body: Record<string, unknown> = {
        chord_sequence: a.chord_sequence ?? a.chords,
        bpm: a.bpm,
        double_octave: doubleOctave,
      };
      if (timed && a.chord_timeline?.length) {
        body.chord_timeline = a.chord_timeline;
      }
      const res = await fetch(`${API_URL}/piano-midi`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error();
      const { midi_b64: chordB64 } = await res.json();
      const binary = atob(chordB64);
      const bytes = new Uint8Array(binary.length);
      for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
      const suffix = timed ? "_chords_timed" : doubleOctave ? "_chords_full" : "_chords";
      triggerDownload(new Blob([bytes], { type: "audio/midi" }), `${baseName}${suffix}.mid`);
    } catch {
      // silently ignore
    } finally {
      setChordMidiDownloading(null);
    }
  }, [a, baseName]);

  const handleDownloadScaleMidi = useCallback(async () => {
    setChordMidiDownloading("scale");
    try {
      const res = await fetch(`${API_URL}/scale-midi`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key: a.key, mode: a.mode, bpm: a.bpm }),
      });
      if (!res.ok) throw new Error();
      const { midi_b64: scaleb64 } = await res.json();
      const binary = atob(scaleb64);
      const bytes = new Uint8Array(binary.length);
      for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
      triggerDownload(new Blob([bytes], { type: "audio/midi" }), `${baseName}_scale_${a.key}_${a.mode}.mid`);
    } catch {
      // silently ignore
    } finally {
      setChordMidiDownloading(null);
    }
  }, [a, baseName]);

  return (
    <div className="space-y-4">

      {/* ── Warnings ─────────────────────────────────────────────────────── */}
      {warnings.length > 0 && (
        <div className="space-y-2">
          {warnings.map((w, i) => (
            <div key={i} className="flex items-start gap-3 bg-amber-900/15 border border-amber-700/30 rounded-xl px-4 py-3">
              <AlertTriangle size={14} className="text-amber-400 shrink-0 mt-0.5" />
              <p className="text-amber-300/90 text-xs leading-relaxed">{w}</p>
            </div>
          ))}
        </div>
      )}

      {/* ── Session stats ─────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatCard label="Key"      value={a.key}      sub={a.mode} />
        <StatCard label="Tempo"    value={`${a.bpm}`} sub="BPM — use as Logic project tempo" />
        <StatCard label="Length"   value={fmt(a.duration_seconds)} />
        <StatCard label="Notes"    value={`${note_count}`} sub={`grid: ${grid_used}`} />
      </div>

      {/* ── Tab nav + Export ─────────────────────────────────────────────────── */}
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
          Piano
          {pianoLoading && <Loader2 size={13} className="animate-spin" />}
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
          {scaleLoading && <Loader2 size={13} className="animate-spin" />}
        </button>

        <div ref={exportRef} className="relative ml-auto">
          <button
            onClick={() => setExportOpen((v) => !v)}
            disabled={chordMidiDownloading !== null}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium bg-brand-600 hover:bg-brand-500 text-white transition-colors disabled:opacity-60"
          >
            {chordMidiDownloading ? <Loader2 size={14} className="animate-spin" /> : <Download size={14} />}
            {chordMidiDownloading ? "Generating…" : "Export"}
            {!chordMidiDownloading && <ChevronDown size={13} className={clsx("transition-transform", exportOpen && "rotate-180")} />}
          </button>

          {exportOpen && (
            <div className="absolute right-0 top-full mt-1.5 w-56 bg-surface-2 border border-surface-border rounded-xl shadow-xl z-20 overflow-hidden">
              <button
                onClick={() => { setExportOpen(false); handleDownloadChordMidi(false); }}
                className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-gray-300 hover:bg-surface-3 hover:text-white transition-colors"
              >
                <Download size={13} className="text-brand-400 shrink-0" />
                Chord MIDI — Standard
              </button>
              <div className="mx-3 border-t border-surface-border" />
              <button
                onClick={() => { setExportOpen(false); handleDownloadChordMidi(true); }}
                className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-gray-300 hover:bg-surface-3 hover:text-white transition-colors"
              >
                <Download size={13} className="text-brand-400 shrink-0" />
                Chord MIDI — Full Octave
              </button>
              {/* TODO: Match Lengths — timing accuracy needs work before shipping
              {a.chord_timeline?.length && (
                <>
                  <div className="mx-3 border-t border-surface-border" />
                  <button
                    onClick={() => { setExportOpen(false); handleDownloadChordMidi(false, true); }}
                    className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-gray-300 hover:bg-surface-3 hover:text-white transition-colors"
                  >
                    <Download size={13} className="text-brand-400 shrink-0" />
                    <span>
                      Chord MIDI — Match Lengths
                      <span className="block text-[10px] text-gray-500">Chord durations from audio</span>
                    </span>
                  </button>
                </>
              )}
              */}
              <div className="mx-3 border-t border-surface-border" />
              <button
                onClick={() => { setExportOpen(false); handleDownloadScaleMidi(); }}
                className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-gray-300 hover:bg-surface-3 hover:text-white transition-colors"
              >
                <Download size={13} className="text-amber-400 shrink-0" />
                <span>
                  Scale Reference
                  <span className="block text-[10px] text-gray-500">{a.key} {a.mode} — 8 notes</span>
                </span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* ── Active panel ─────────────────────────────────────────────────────── */}
      {activeTab === "piano" && (
        <>
          {pianoLoading && (
            <div className="bg-surface-2 border border-surface-border rounded-2xl p-6 flex items-center gap-3 text-gray-500 text-sm">
              <Loader2 size={15} className="animate-spin shrink-0" />Loading piano view…
            </div>
          )}
          {pianoError && <p className="text-xs text-red-400 px-1">{pianoError}</p>}
          {pianoData && <PianoView chordData={pianoData} bpm={a.bpm} />}
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

      {/* ── Harmony + Track Hint (2-col on large) ────────────────────────── */}
      <div className="grid gap-4 lg:grid-cols-2">

        {/* Harmony */}
        <SectionCard icon={Piano} iconBg="bg-brand-600" title="Harmony">
          {chord_confidence_low && (
            <div className="flex items-center gap-2 mb-3 bg-amber-900/15 border border-amber-700/30 rounded-lg px-3 py-2">
              <AlertTriangle size={12} className="text-amber-400 shrink-0" />
              <p className="text-amber-300/80 text-xs">Confidence may be low on this material</p>
            </div>
          )}
          <div className="mb-3">
            <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider mb-2">Progression</p>
            <div className="flex flex-wrap gap-1.5">
              {(a.chord_sequence ?? a.chords).map((chord, i) => (
                <span key={i} className="chord-pill">{chord}</span>
              ))}
            </div>
          </div>
          <div>
            <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider mb-2">Unique</p>
            <div className="flex flex-wrap gap-1.5">
              {a.chords.map((chord, i) => (
                <span key={i} className="chord-pill">{chord}</span>
              ))}
            </div>
          </div>
        </SectionCard>

        {/* Track Hint */}
        <SectionCard icon={Mic} iconBg="bg-purple-700" title="Track Character">
          <div className="mb-4">
            <span className={clsx("inline-flex items-center gap-2 text-sm font-semibold px-3 py-1.5 rounded-xl border", hintStyle.badge)}>
              <span className={clsx("w-2 h-2 rounded-full shrink-0", hintStyle.dot)} />
              {stem_hint.display}
            </span>
          </div>
          <p className="text-sm text-gray-300 leading-relaxed mb-3">{stem_hint.note}</p>
          <div className="flex items-start gap-2 bg-surface-3 rounded-xl px-3 py-2.5">
            <Info size={12} className="text-gray-500 shrink-0 mt-0.5" />
            <p className="text-xs text-gray-500 leading-relaxed">{stem_hint.disclaimer}</p>
          </div>
        </SectionCard>
      </div>

      {/* ── Melody / Notes ────────────────────────────────────────────────── */}
      <SectionCard icon={Music2} iconBg="bg-cyan-700" title="Detected Melody Line">
        {melody_notes.length === 0 ? (
          <p className="text-sm text-gray-500 italic">
            No pitched notes detected in this clip. Try a stem or a recording with a clear melodic line.
          </p>
        ) : (
          <>
            {/* Compact note list */}
            <div className="overflow-x-auto mb-4">
              <table className="w-full text-xs">
                <thead>
                  <tr className="text-gray-500 uppercase tracking-wider text-[10px]">
                    <th className="text-left pb-2 pr-4 font-semibold">Note</th>
                    <th className="text-right pb-2 pr-4 font-semibold">Beat</th>
                    <th className="text-right pb-2 font-semibold">Duration</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-surface-border">
                  {melody_notes.slice(0, PREVIEW_LIMIT).map((note, i) => (
                    <tr key={i} className="group">
                      <td className="py-1.5 pr-4 font-mono font-bold text-brand-300">{note.name}</td>
                      <td className="py-1.5 pr-4 text-right text-gray-400 tabular-nums">{note.start_beat.toFixed(2)}</td>
                      <td className="py-1.5 text-right text-gray-500 tabular-nums">{note.duration_beat.toFixed(2)} ♩</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {note_count > PREVIEW_LIMIT && (
                <p className="text-xs text-gray-600 mt-2 text-center">
                  … and {note_count - PREVIEW_LIMIT} more notes in the MIDI file
                </p>
              )}
            </div>

            {/* Download MIDI */}
            {midi_b64 && (
              <button
                onClick={() => downloadMidi(midi_b64, midiFilename)}
                className="flex items-center gap-2 px-4 py-2.5 bg-brand-600 hover:bg-brand-500 text-white text-sm font-semibold rounded-xl transition-colors"
              >
                <Download size={15} />
                Download {midiFilename}
              </button>
            )}
          </>
        )}
      </SectionCard>

      {/* ── Exports ───────────────────────────────────────────────────────── */}
      <div className="bg-surface-2 rounded-2xl p-5 border border-surface-border">
        <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-widest mb-4">Exports</p>
        <div className="flex flex-wrap gap-3">
          {midi_b64 ? (
            <button
              onClick={() => downloadMidi(midi_b64, midiFilename)}
              className="flex items-center gap-2 px-4 py-2 bg-brand-600 hover:bg-brand-500 text-white text-sm font-semibold rounded-xl transition-colors"
            >
              <Download size={14} />
              {midiFilename}
            </button>
          ) : (
            <span className="flex items-center gap-2 px-4 py-2 bg-surface-3 text-gray-600 text-sm rounded-xl cursor-not-allowed">
              <Download size={14} />
              No MIDI (no notes detected)
            </span>
          )}

          <button
            onClick={() => downloadJson(data, jsonFilename)}
            className="flex items-center gap-2 px-4 py-2 bg-surface-3 hover:bg-surface-2 border border-surface-border hover:border-brand-500/40 text-gray-300 hover:text-white text-sm font-medium rounded-xl transition-all"
          >
            <FileJson size={14} />
            {jsonFilename}
          </button>
        </div>

        <p className="text-xs text-gray-600 mt-3 leading-relaxed">
          Import the .mid into Logic Pro (⌘+Shift+I) and set your project tempo to <span className="text-gray-400 font-mono">{a.bpm} BPM</span> to align the grid.
        </p>
      </div>

    </div>
  );
}
