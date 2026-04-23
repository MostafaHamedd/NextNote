/**
 * NoteFretboard — SVG guitar neck showing all positions for a single detected note.
 *
 * Geometry is intentionally aligned with ScaleView.tsx so the two boards look
 * consistent if ever shown on the same page.
 *
 * Props:
 *   primaryMidi  — MIDI number of the detected note (null → board shown empty)
 */

import { midi_to_fretboard_positions, type FretPosition } from "@/lib/fretboard";

// ── SVG layout constants (match ScaleView.tsx) ────────────────────────────────
const L   = 34;  // left padding (string labels)
const T   = 14;  // top padding
const B   = 22;  // bottom padding (fret numbers)
const FW  = 44;  // pixels per fret
const SH  = 16;  // string gap height
const W   = L + 12 * FW + 10;
const H   = T + 5 * SH + B;

const NUT_X   = L;
const noteX   = (f: number) => f === 0 ? NUT_X - 14 : NUT_X + f * FW - FW / 2;
const noteY   = (s: number) => T + (5 - s) * SH;  // s=0 low E at bottom
const inlayX  = (f: number) => NUT_X + f * FW - FW / 2;
const inlayY  = T + 2.5 * SH;
const fretTop    = T;
const fretBottom = T + 5 * SH;

const INLAY_FRETS = [3, 5, 7, 9];
const STRING_LABELS = ["e", "B", "G", "D", "A", "E"]; // index 0=high e (top) … 5=low E (bottom)

const DOT_FILL   = "#6366f1"; // indigo-500
const DOT_STROKE = "#818cf8"; // indigo-400
const DOT_R      = 7;

interface Props {
  primaryMidi: number | null;
}

export default function NoteFretboard({ primaryMidi }: Props) {
  const positions: FretPosition[] =
    primaryMidi != null ? midi_to_fretboard_positions(primaryMidi) : [];

  return (
    <div className="bg-[#0f0f13] rounded-xl border border-[#2e2e3e] p-3 overflow-x-auto">
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="w-full"
        style={{ minWidth: 420, maxHeight: 130 }}
        aria-label="Guitar fretboard showing positions for detected note"
      >
        {/* Inlay dots */}
        {INLAY_FRETS.map((f) => (
          <circle key={f} cx={inlayX(f)} cy={inlayY} r={3.5} fill="#1f2937" />
        ))}
        <circle cx={inlayX(12)} cy={inlayY - 6} r={3.5} fill="#1f2937" />
        <circle cx={inlayX(12)} cy={inlayY + 6} r={3.5} fill="#1f2937" />

        {/* String lines */}
        {[0, 1, 2, 3, 4, 5].map((s) => {
          const y = noteY(s);
          const thickness = 0.8 + (5 - s) * 0.28;
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

        {/* Fret lines */}
        {Array.from({ length: 12 }, (_, i) => i + 1).map((f) => (
          <line
            key={f}
            x1={NUT_X + f * FW} y1={fretTop}
            x2={NUT_X + f * FW} y2={fretBottom}
            stroke="#374151"
            strokeWidth={f === 12 ? 1.5 : 0.8}
          />
        ))}

        {/* Nut */}
        <line
          x1={NUT_X} y1={fretTop - 2}
          x2={NUT_X} y2={fretBottom + 2}
          stroke="#6b7280"
          strokeWidth={3}
          strokeLinecap="round"
        />

        {/* String labels */}
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

        {/* Fret numbers */}
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

        {/* Note dots */}
        {positions.map((p, i) => {
          const x = noteX(p.fret);
          const y = noteY(p.string);
          const isOpen = p.fret === 0;
          return (
            <g key={i}>
              <circle
                cx={x} cy={y}
                r={DOT_R}
                fill={isOpen ? "transparent" : DOT_FILL}
                stroke={DOT_STROKE}
                strokeWidth={isOpen ? 1.5 : 0}
              />
              <text
                x={x} y={y + 3.5}
                textAnchor="middle"
                fontSize={6.5}
                fill={isOpen ? DOT_STROKE : "white"}
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

      {positions.length === 0 && (
        <p className="text-center text-xs text-[#4a4a60] mt-1">
          Play a note to see positions
        </p>
      )}
    </div>
  );
}
