"use client";

import { Download, FileJson, Mic, Music2, AlertTriangle, Info, Piano } from "lucide-react";
import clsx from "clsx";

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

export interface ProducerData {
  analysis_summary: {
    key: string;
    mode: string;
    key_display: string;
    bpm: number;
    duration_seconds: number;
    chords: string[];
    chord_sequence: string[];
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
