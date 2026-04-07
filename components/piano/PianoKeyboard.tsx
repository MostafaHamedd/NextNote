"use client";

import { useEffect, useRef, useState } from "react";
import clsx from "clsx";
import { KeyDef, WK, WH, BKW, BKH } from "@/lib/pianoUtils";

interface Props {
  whiteKeys:   KeyDef[];
  blackKeys:   KeyDef[];
  pianoW:      number;
  activeNotes: Map<string, "left" | "right">;
}

/** Taller white keys on narrow viewports (phone) for easier seeing / tapping. */
const PHONE_KEY_TALL = 1.16;

export default function PianoKeyboard({ whiteKeys, blackKeys, pianoW, activeNotes }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [viewW, setViewW] = useState(0);
  const [phoneTallKeys, setPhoneTallKeys] = useState(false);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setViewW(el.clientWidth));
    ro.observe(el);
    setViewW(el.clientWidth);
    return () => ro.disconnect();
  }, [pianoW]);

  useEffect(() => {
    const mq = window.matchMedia("(max-width: 767px)");
    const sync = () => setPhoneTallKeys(mq.matches);
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);

  const wh = phoneTallKeys ? WH * PHONE_KEY_TALL : WH;
  const bkh = phoneTallKeys ? BKH * PHONE_KEY_TALL : BKH;

  // Always stretch to container width (scale up on wide laptop, down on phone).
  const scale =
    pianoW > 0 && viewW > 0 ? viewW / pianoW : 1;

  const showIdleKeyHints = scale > 0.32;

  return (
    <div
      ref={containerRef}
      className="w-full overflow-hidden"
      style={{ height: wh * scale }}
    >
      <div
        className="relative select-none"
        style={{
          width: pianoW,
          height: wh,
          transform: `scale(${scale})`,
          transformOrigin: "top left",
        }}
      >
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
              style={{ left: x, top: 0, width: WK - 1, height: wh }}
            >
              {active && (
                <span
                  className="absolute left-0 right-0 text-center font-bold font-mono text-white pointer-events-none drop-shadow-[0_1px_2px_rgba(0,0,0,0.85)] leading-none"
                  style={{
                    bottom: scale < 0.5 ? 4 : 10,
                    fontSize: scale < 0.42 ? 9 : 11,
                  }}
                >
                  {note}
                </span>
              )}
              {!active && note.startsWith("C") && showIdleKeyHints && (
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
              style={{ left: x, top: 0, width: BKW, height: bkh }}
            >
              {active && (
                <span
                  className="absolute left-0 right-0 text-center font-bold font-mono text-white pointer-events-none drop-shadow-[0_1px_2px_rgba(0,0,0,0.9)] leading-none"
                  style={{
                    bottom: scale < 0.5 ? 3 : 8,
                    fontSize: scale < 0.42 ? 7 : 9,
                  }}
                >
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
