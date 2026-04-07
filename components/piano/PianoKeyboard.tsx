"use client";

import clsx from "clsx";
import { KeyDef, WK, WH, BKW, BKH } from "@/lib/pianoUtils";

interface Props {
  whiteKeys:   KeyDef[];
  blackKeys:   KeyDef[];
  pianoW:      number;
  activeNotes: Map<string, "left" | "right">;
}

export default function PianoKeyboard({ whiteKeys, blackKeys, pianoW, activeNotes }: Props) {
  return (
    <div className="overflow-x-auto pb-1">
      <div className="relative select-none mx-auto" style={{ width: pianoW, height: WH }}>

        {whiteKeys.map(({ note, x }) => {
          const hand   = activeNotes.get(note);
          const active = hand !== undefined;
          return (
            <div
              key={note}
              title={note}
              className={clsx(
                "absolute rounded-b-md border",
                active
                  ? hand === "left"
                    ? "bg-gradient-to-b from-cyan-400 to-cyan-600 border-cyan-500 z-10 shadow-lg shadow-cyan-500/30"
                    : "bg-gradient-to-b from-brand-400 to-brand-600 border-brand-500 z-10 shadow-lg shadow-brand-500/30"
                  : "bg-white border-gray-300 z-0",
              )}
              style={{ left: x, top: 0, width: WK - 1, height: WH }}
            >
              {active && (
                <span className="absolute bottom-3 left-0 right-0 text-center text-[10px] font-bold font-mono text-white/90 pointer-events-none">
                  {note}
                </span>
              )}
              {!active && note.startsWith("C") && (
                <span className="absolute bottom-2 left-0 right-0 text-center text-[9px] text-gray-400 pointer-events-none">
                  {note}
                </span>
              )}
            </div>
          );
        })}

        {blackKeys.map(({ note, x }) => {
          const hand   = activeNotes.get(note);
          const active = hand !== undefined;
          return (
            <div
              key={note}
              title={note}
              className={clsx(
                "absolute rounded-b-md z-20",
                active
                  ? hand === "left"
                    ? "bg-gradient-to-b from-cyan-600 to-cyan-800 shadow-lg shadow-cyan-500/50"
                    : "bg-gradient-to-b from-accent-purple to-brand-700 shadow-lg shadow-purple-500/50"
                  : "bg-gray-900 border border-gray-700",
              )}
              style={{ left: x, top: 0, width: BKW, height: BKH }}
            >
              {active && (
                <span className="absolute bottom-2 left-0 right-0 text-center text-[8px] font-bold font-mono text-white/90 pointer-events-none">
                  {note.replace("#", "♯")}
                </span>
              )}
            </div>
          );
        })}

      </div>
    </div>
  );
}
