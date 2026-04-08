"use client";

import { useEffect, useRef, useState, useMemo, ReactElement } from "react";
import { SheetNote } from "@/lib/sheetStore";
import { KeyDef, WK, BKW } from "@/lib/pianoUtils";

const LANE_H = 180;   // px (unscaled) — height of the falling zone
const PPS    = 80;    // pixels per score second
const MIN_H  = 6;     // minimum bar height in px

interface Props {
  sortedNotes:  SheetNote[];
  whiteKeys:    KeyDef[];
  blackKeys:    KeyDef[];
  pianoW:       number;
  scoreTimeSec: number;
  sustainOn:    boolean;
}

export default function FallingNotesLane({
  sortedNotes, whiteKeys, blackKeys, pianoW, scoreTimeSec, sustainOn,
}: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [viewW, setViewW] = useState(0);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setViewW(el.clientWidth));
    ro.observe(el);
    setViewW(el.clientWidth);
    return () => ro.disconnect();
  }, [pianoW]);

  const scale = pianoW > 0 && viewW > 0 ? viewW / pianoW : 1;

  // Build lookup: pitch → {x, w, isBlack}
  const keyMap = useMemo(() => {
    const m = new Map<string, { x: number; w: number; isBlack: boolean }>();
    for (const k of whiteKeys) m.set(k.note, { x: k.x, w: WK - 1, isBlack: false });
    for (const k of blackKeys) m.set(k.note, { x: k.x, w: BKW,    isBlack: true  });
    return m;
  }, [whiteKeys, blackKeys]);

  // Time window to render
  const visibleSec = LANE_H / PPS + 0.5;

  // Separate white-key notes and black-key notes (black renders on top)
  const { whiteBars, blackBars } = useMemo(() => {
    const wb: ReactElement[] = [];
    const bb: ReactElement[] = [];

    for (const note of sortedNotes) {
      const dur   = sustainOn ? note.durationSec : note.durationSecRaw;
      const endSec = note.startSec + dur;

      // Visibility cull
      if (endSec < scoreTimeSec - 0.1) continue;
      if (note.startSec > scoreTimeSec + visibleSec) break;

      const key = keyMap.get(note.pitch);
      if (!key) continue;

      const barH    = Math.max(MIN_H, (endSec - note.startSec) * PPS);
      const yBottom = LANE_H - (note.startSec - scoreTimeSec) * PPS;
      const yTop    = yBottom - barH;

      // Is this note currently playing?
      const isActive = scoreTimeSec >= note.startSec && scoreTimeSec < endSec;

      const isRight = note.hand === "right";
      const baseColor = isRight
        ? isActive ? "rgba(99,102,241,0.95)"  : "rgba(99,102,241,0.7)"
        : isActive ? "rgba(6,182,212,0.95)"   : "rgba(6,182,212,0.7)";
      const glowColor = isRight
        ? "rgba(99,102,241,0.6)"
        : "rgba(6,182,212,0.6)";

      const el = (
        <div
          key={`${note.pitch}-${note.startSec}`}
          style={{
            position:     "absolute",
            left:         key.x,
            width:        key.w,
            top:          Math.max(0, yTop),
            height:       yTop < 0 ? yBottom : barH,
            background:   baseColor,
            borderRadius: key.isBlack ? 3 : 4,
            boxShadow:    isActive ? `0 0 8px 2px ${glowColor}` : undefined,
            zIndex:       key.isBlack ? 20 : 10,
          }}
        />
      );

      if (key.isBlack) bb.push(el);
      else             wb.push(el);
    }

    return { whiteBars: wb, blackBars: bb };
  }, [sortedNotes, keyMap, scoreTimeSec, sustainOn, visibleSec]);

  return (
    <div
      ref={containerRef}
      className="w-full overflow-hidden"
      style={{ height: LANE_H * scale, position: "relative" }}
    >
      {/* Scaled inner canvas */}
      <div
        style={{
          width:           pianoW,
          height:          LANE_H,
          transform:       `scale(${scale})`,
          transformOrigin: "top left",
          position:        "relative",
          overflow:        "hidden",
        }}
      >
        {/* Subtle vertical key-boundary guide lines */}
        {whiteKeys.map(({ note, x }) => (
          <div
            key={note}
            style={{
              position:        "absolute",
              left:            x,
              top:             0,
              bottom:          0,
              width:           1,
              background:      "rgba(255,255,255,0.04)",
              pointerEvents:   "none",
            }}
          />
        ))}

        {/* Note bars: white first, black on top */}
        {whiteBars}
        {blackBars}

        {/* Hit line at the bottom */}
        <div
          style={{
            position:   "absolute",
            bottom:     0,
            left:       0,
            right:      0,
            height:     2,
            background: "rgba(255,255,255,0.15)",
            zIndex:     30,
          }}
        />
      </div>
    </div>
  );
}
