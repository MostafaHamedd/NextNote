"use client";

import { useState } from "react";
import clsx from "clsx";
import { X } from "lucide-react";

// ── Types ─────────────────────────────────────────────────────────────────────

interface FretPosition {
  string: number; // 0=low E … 5=high E
  fret:   number; // 0=open, 1-12
  role:   "root" | "chord" | "scale";
  note:   string;
}

interface ScaleSuggestion {
  name:             string;
  short:            string;
  notes:            string[];
  intervals_label:  string;
  description:      string;
  category:         "pentatonic" | "diatonic" | "modal" | "blues";
  score:            number;
  positions:        FretPosition[];
}

interface ScaleData {
  key_root:    string;
  chord_tones: string[];
  suggestions: ScaleSuggestion[];
}

interface Props {
  data:    ScaleData;
  onClose?: () => void;
}

// ── Fretboard constants ────────────────────────────────────────────────────────

const STRING_LABELS = ["e", "B", "G", "D", "A", "E"]; // index 0=high E (top) … 5=low E (bottom)
const INLAY_FRETS   = [3, 5, 7, 9];
const DOUBLE_DOT    = 12;

// SVG layout
const L = 34;   // left padding (string labels)
const T = 14;   // top padding
const B = 22;   // bottom padding (fret numbers)
const FW = 44;  // fret width (px per fret)
const SH = 16;  // string gap height
const W  = L + 12 * FW + 10;   // total width
const H  = T + 5 * SH + B;     // total height

// x of the nut
const NUT_X = L;
// x of note dot at fret f (1-12)
const noteX = (f: number) => f === 0 ? NUT_X - 14 : NUT_X + f * FW - FW / 2;
// y of string s: s=0 low E (bottom), s=5 high E (top)
const noteY = (s: number) => T + (5 - s) * SH;
// y of fret line (top to bottom of strings)
const fretTop    = T;
const fretBottom = T + 5 * SH;
// x of inlay dot for fret f
const inlayX = (f: number) => NUT_X + f * FW - FW / 2;
const inlayY = T + 2.5 * SH;

// ── Role colours ───────────────────────────────────────────────────────────────

const ROLE_FILL: Record<FretPosition["role"], string> = {
  root:  "#f43f5e", // rose-500
  chord: "#6366f1", // indigo-500
  scale: "#4b5563", // gray-600
};
const ROLE_STROKE: Record<FretPosition["role"], string> = {
  root:  "#fb7185",
  chord: "#818cf8",
  scale: "#6b7280",
};
const DOT_R = 7; // dot radius

// ── Category badge ─────────────────────────────────────────────────────────────

const CATEGORY_STYLE: Record<string, string> = {
  pentatonic: "bg-cyan-500/15 text-cyan-300 border-cyan-500/30",
  diatonic:   "bg-brand-500/15 text-brand-300 border-brand-500/30",
  modal:      "bg-purple-500/15 text-purple-300 border-purple-500/30",
  blues:      "bg-amber-500/15 text-amber-300 border-amber-500/30",
};

// ── Fretboard SVG ──────────────────────────────────────────────────────────────

function Fretboard({ positions }: { positions: FretPosition[] }) {
  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      className="w-full"
      style={{ maxHeight: 130 }}
      aria-label="Guitar fretboard scale diagram"
    >
      {/* ── Inlay dots ───────────────────────────────────────────────────── */}
      {INLAY_FRETS.map((f) => (
        <circle key={f} cx={inlayX(f)} cy={inlayY} r={3.5} fill="#1f2937" />
      ))}
      {/* Double dot at fret 12 */}
      <circle cx={inlayX(DOUBLE_DOT)} cy={inlayY - 6} r={3.5} fill="#1f2937" />
      <circle cx={inlayX(DOUBLE_DOT)} cy={inlayY + 6} r={3.5} fill="#1f2937" />

      {/* ── String lines ─────────────────────────────────────────────────── */}
      {[0, 1, 2, 3, 4, 5].map((s) => {
        const y = noteY(s);
        const thickness = 0.8 + (5 - s) * 0.28; // high E thin, low E thick
        return (
          <line
            key={s}
            x1={NUT_X} y1={y}
            x2={NUT_X + 12 * FW} y2={y}
            stroke="#374151"
            strokeWidth={thickness}
          />
        );
      })}

      {/* ── Fret lines ───────────────────────────────────────────────────── */}
      {Array.from({ length: 12 }, (_, i) => i + 1).map((f) => (
        <line
          key={f}
          x1={NUT_X + f * FW} y1={fretTop}
          x2={NUT_X + f * FW} y2={fretBottom}
          stroke="#374151"
          strokeWidth={f === 12 ? 1.5 : 0.8}
        />
      ))}

      {/* ── Nut ──────────────────────────────────────────────────────────── */}
      <line
        x1={NUT_X} y1={fretTop - 2}
        x2={NUT_X} y2={fretBottom + 2}
        stroke="#6b7280"
        strokeWidth={3}
        strokeLinecap="round"
      />

      {/* ── String labels ────────────────────────────────────────────────── */}
      {[0, 1, 2, 3, 4, 5].map((s) => (
        <text
          key={s}
          x={NUT_X - 9}
          y={noteY(s) + 4}
          textAnchor="middle"
          fontSize={9}
          fill="#6b7280"
          fontFamily="monospace"
        >
          {STRING_LABELS[5 - s]}
        </text>
      ))}

      {/* ── Fret numbers ─────────────────────────────────────────────────── */}
      {[3, 5, 7, 9, 12].map((f) => (
        <text
          key={f}
          x={inlayX(f)}
          y={H - 4}
          textAnchor="middle"
          fontSize={9}
          fill="#4b5563"
          fontFamily="sans-serif"
        >
          {f}
        </text>
      ))}

      {/* ── Note dots ────────────────────────────────────────────────────── */}
      {positions.map((p, i) => {
        const x = noteX(p.fret);
        const y = noteY(p.string);
        const fill   = ROLE_FILL[p.role];
        const stroke = ROLE_STROKE[p.role];
        const isOpen = p.fret === 0;
        return (
          <g key={i}>
            <circle
              cx={x} cy={y}
              r={DOT_R}
              fill={isOpen ? "transparent" : fill}
              stroke={stroke}
              strokeWidth={isOpen ? 1.5 : 0}
            />
            <text
              x={x} y={y + 3.5}
              textAnchor="middle"
              fontSize={6.5}
              fill={isOpen ? stroke : "white"}
              fontWeight="600"
              fontFamily="sans-serif"
              style={{ pointerEvents: "none" }}
            >
              {p.note}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

// ── Main component ─────────────────────────────────────────────────────────────

export default function ScaleView({ data, onClose }: Props) {
  const [selected, setSelected] = useState(0);
  const scale = data.suggestions[selected];

  return (
    <div className="bg-surface-2 rounded-2xl border border-surface-border overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-3.5 border-b border-surface-border">
        <div className="flex items-center gap-2.5">
          <div className="p-1.5 bg-amber-600/20 rounded-lg">
            {/* guitar icon inline */}
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#fbbf24" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 3H5a2 2 0 0 0-2 2v4m6-6h10a2 2 0 0 1 2 2v4M9 3v18m0 0h10a2 2 0 0 0 2-2v-4M9 21H5a2 2 0 0 1-2-2v-4m0 0h18"/>
            </svg>
          </div>
          <h3 className="font-semibold text-gray-200 text-sm">Scale & Mode Suggestions</h3>
          <span className="text-xs text-gray-500">for {data.key_root}</span>
        </div>
        {onClose && (
          <button
            onClick={onClose}
            className="p-1 rounded-lg hover:bg-surface-3 text-gray-500 hover:text-gray-300 transition-colors"
          >
            <X size={14} />
          </button>
        )}
      </div>

      <div className="p-5 space-y-5">
        {/* Scale tabs */}
        <div className="flex flex-wrap gap-2">
          {data.suggestions.map((s, i) => (
            <button
              key={i}
              onClick={() => setSelected(i)}
              className={clsx(
                "px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all",
                selected === i
                  ? "bg-brand-600/20 text-brand-300 border-brand-500/50"
                  : "bg-surface-3 text-gray-400 border-surface-border hover:text-white hover:border-gray-500"
              )}
            >
              {s.short}
            </button>
          ))}
        </div>

        {/* Fretboard */}
        <div className="bg-surface-1 rounded-xl p-3 border border-surface-border overflow-x-auto">
          <Fretboard positions={scale.positions} />
        </div>

        {/* Legend */}
        <div className="flex flex-wrap items-center gap-4 text-xs text-gray-400">
          {(["root", "chord", "scale"] as const).map((role) => (
            <span key={role} className="flex items-center gap-1.5">
              <span
                className="w-3 h-3 rounded-full inline-block"
                style={{ background: ROLE_FILL[role] }}
              />
              {role === "root" ? "Root note" : role === "chord" ? "Chord tone" : "Passing tone"}
            </span>
          ))}
        </div>

        {/* Scale info */}
        <div className="flex flex-col sm:flex-row gap-4 items-start">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1.5 flex-wrap">
              <span className="text-base font-bold text-white">{scale.name}</span>
              <span className={clsx(
                "text-[10px] font-semibold uppercase tracking-wide px-2 py-0.5 rounded-full border",
                CATEGORY_STYLE[scale.category] ?? CATEGORY_STYLE.diatonic
              )}>
                {scale.category}
              </span>
            </div>
            <p className="text-sm text-gray-400 leading-relaxed">{scale.description}</p>
          </div>

          {/* Notes + intervals */}
          <div className="shrink-0 space-y-2">
            <div>
              <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider mb-1">Notes</p>
              <div className="flex gap-1.5 flex-wrap">
                {scale.notes.map((n) => (
                  <span
                    key={n}
                    className={clsx(
                      "w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold border",
                      n === data.key_root
                        ? "bg-rose-500/20 text-rose-300 border-rose-500/40"
                        : data.chord_tones.includes(n)
                        ? "bg-brand-500/20 text-brand-300 border-brand-500/30"
                        : "bg-surface-3 text-gray-400 border-surface-border"
                    )}
                  >
                    {n}
                  </span>
                ))}
              </div>
            </div>
            <div>
              <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider mb-1">Formula</p>
              <p className="text-xs font-mono text-gray-300 tracking-widest">{scale.intervals_label}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
