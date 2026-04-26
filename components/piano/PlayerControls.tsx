"use client";

import { useState, useCallback } from "react";
import { Play, Pause, RotateCcw, Loader2 } from "lucide-react";
import clsx from "clsx";
import { SPEEDS, Speed } from "@/hooks/usePianoPlayback";
import { fmt } from "@/lib/pianoUtils";

interface Props {
  playing:      boolean;
  samplerReady: boolean;
  progress:     number;
  totalSec:     number;
  speed:        Speed;
  sustainOn:    boolean;
  hasSustain:   boolean;
  onPlay:       () => void;
  onReset:      () => void;
  onSeek:       (e: React.MouseEvent<HTMLDivElement>) => void;
  onSeekTo:     (frac: number) => void;
  onSpeedChange:(s: Speed) => void;
  onSustainToggle: () => void;
}

const selectClass = clsx(
  "rounded-xl border border-surface-border bg-surface-3",
  "text-xs font-semibold text-gray-200 py-2 pl-2.5 pr-7",
  "appearance-none bg-[length:1rem] bg-[right_0.4rem_center] bg-no-repeat",
  "focus:outline-none focus:ring-2 focus:ring-brand-500/40 focus:border-brand-500/50",
);

const chevronBg =
  "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='%239ca3af' stroke-width='2'%3E%3Cpath d='M6 9l6 6 6-6'/%3E%3C/svg%3E\")";

export default function PlayerControls({
  playing, samplerReady, progress, totalSec,
  speed, sustainOn, hasSustain,
  onPlay, onReset, onSeek, onSeekTo, onSpeedChange, onSustainToggle,
}: Props) {
  const [isDragging, setIsDragging] = useState(false);
  const [dragFrac, setDragFrac]     = useState<number | null>(null);

  const handleRangeChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const frac = parseInt(e.target.value) / 1000;
    setDragFrac(frac);
    onSeekTo(frac);
  }, [onSeekTo]);

  const handleRangeStart = useCallback(() => setIsDragging(true), []);

  const handleRangeEnd = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const frac = parseInt(e.target.value) / 1000;
    onSeekTo(frac);
    setIsDragging(false);
    setDragFrac(null);
  }, [onSeekTo]);

  // ── Keyboard seek ±5 s ───────────────────────────────────────────────────
  const onKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === "ArrowRight") { e.preventDefault(); onSeekTo(Math.min(1, progress + 5 / totalSec)); }
    if (e.key === "ArrowLeft")  { e.preventDefault(); onSeekTo(Math.max(0, progress - 5 / totalSec)); }
  }, [onSeekTo, progress, totalSec]);

  const displayFrac = dragFrac ?? progress;
  const playBtn = (
    <button
      type="button"
      onClick={onPlay}
      disabled={!samplerReady}
      className={clsx(
        "flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-sm font-semibold transition-all shrink-0 min-h-[2.5rem] min-w-[2.5rem] md:min-w-0",
        !samplerReady
          ? "bg-surface-3 text-gray-500 cursor-wait"
          : playing
          ? "bg-red-500/20 text-red-400 border border-red-500/30 hover:bg-red-500/30"
          : "bg-brand-600 text-white hover:bg-brand-500 shadow-lg shadow-brand-900/30",
      )}
    >
      {!samplerReady ? (
        <Loader2 size={16} className="animate-spin" />
      ) : playing ? (
        <>
          <Pause size={16} />
          <span className="hidden sm:inline">Pause</span>
        </>
      ) : (
        <>
          <Play size={16} className="ml-0.5" />
          <span className="hidden sm:inline">Play</span>
        </>
      )}
    </button>
  );

  const resetBtn = (
    <button
      type="button"
      onClick={onReset}
      className="p-2 rounded-xl text-gray-500 hover:text-gray-300 hover:bg-surface-3 transition-colors shrink-0 min-h-[2.5rem] min-w-[2.5rem] flex items-center justify-center"
      aria-label="Reset playback"
    >
      <RotateCcw size={16} />
    </button>
  );

  const speedSelect = (
    <label className="flex items-center gap-1.5 min-w-0 shrink">
      <span className="sr-only">Playback speed</span>
      <select
        value={String(speed)}
        onChange={e => {
          const v = parseFloat(e.target.value);
          if (SPEEDS.includes(v as Speed)) onSpeedChange(v as Speed);
        }}
        className={clsx(selectClass, "min-w-[4.5rem] max-w-[6.5rem] sm:min-w-[5.25rem] sm:max-w-none")}
        style={{ backgroundImage: chevronBg }}
      >
        {SPEEDS.map(s => (
          <option key={s} value={String(s)}>
            {s === 1 ? "1× (normal)" : `${s}×`}
          </option>
        ))}
      </select>
    </label>
  );

  const pedalBtn = hasSustain ? (
    <button
      type="button"
      onClick={onSustainToggle}
      title={sustainOn ? "Sustain pedal ON — tap to disable" : "Sustain pedal OFF — tap to enable"}
      className={clsx(
        "shrink-0 rounded-lg border px-2 py-1.5 text-[10px] font-medium transition-colors min-h-[2.5rem] flex items-center",
        sustainOn
          ? "bg-amber-500/15 border-amber-500/30 text-amber-400 hover:bg-amber-500/25"
          : "bg-surface-3 border-surface-border text-gray-500 hover:text-gray-300",
      )}
    >
      🎹 {sustainOn ? "On" : "Off"}
    </button>
  ) : null;

  const progressRow = (
    <div className="flex items-center gap-2 w-full min-w-0">
      <span className="text-xs font-mono text-gray-600 shrink-0 w-9 text-right tabular-nums">
        {fmt(displayFrac * totalSec)}
      </span>

      {/* Scrubber — native range handles all mouse/touch/keyboard interaction */}
      <div className="flex-1 relative flex items-center min-w-0" style={{ height: 28 }}>
        {/* Visual track (decorative, pointer-events-none) */}
        <div className="absolute left-0 right-0 top-1/2 -translate-y-1/2 h-1.5 bg-surface-3 rounded-full pointer-events-none">
          <div
            className="absolute left-0 top-0 h-full bg-brand-500 rounded-full"
            style={{ width: `${displayFrac * 100}%` }}
          />
          <div
            className={clsx(
              "absolute top-1/2 -translate-y-1/2 -translate-x-1/2 rounded-full bg-white border-2 border-brand-500 shadow transition-transform duration-100",
              isDragging ? "w-4 h-4 scale-110" : "w-3.5 h-3.5",
            )}
            style={{ left: `${displayFrac * 100}%` }}
          />
        </div>

        {/* Tooltip while dragging */}
        {isDragging && (
          <div
            className="absolute -top-7 pointer-events-none z-50"
            style={{ left: `${displayFrac * 100}%`, transform: "translateX(-50%)" }}
          >
            <span className="bg-gray-800 text-white text-[10px] font-mono px-1.5 py-0.5 rounded shadow whitespace-nowrap">
              {fmt(displayFrac * totalSec)}
            </span>
          </div>
        )}

        {/* Native range input — fully transparent overlay, handles all interaction */}
        <input
          type="range"
          min={0}
          max={1000}
          step={1}
          value={Math.round(displayFrac * 1000)}
          onChange={handleRangeChange}
          onMouseDown={handleRangeStart}
          onTouchStart={handleRangeStart}
          onMouseUp={handleRangeEnd}
          onTouchEnd={handleRangeEnd}
          onKeyDown={onKeyDown}
          aria-label="Playback position"
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
        />
      </div>

      <span className="text-xs font-mono text-gray-600 shrink-0 w-9 tabular-nums">
        {fmt(totalSec)}
      </span>
    </div>
  );

  return (
    <div
      className={clsx(
        "space-y-2",
        "border-b border-surface-border pb-3 mb-0",
        "md:border-b-0 md:border-t md:border-surface-border md:pt-1 md:pb-0",
      )}
    >

      {/* Phone: speed + pedal left, play + reset right; then scrubber */}
      <div className="md:hidden flex flex-col gap-3">
        <div className="flex items-center justify-between gap-2 min-w-0">
          <div className="flex items-center gap-2 min-w-0 flex-1">
            {speedSelect}
            {pedalBtn}
          </div>
          <div className="flex items-center gap-1 shrink-0">
            {resetBtn}
            {playBtn}
          </div>
        </div>
        {progressRow}
      </div>

      {/* Desktop / tablet */}
      <div className="hidden md:block space-y-2">
        <div className="flex items-center gap-2">
          {playBtn}
          {resetBtn}
          {progressRow}
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <label className="flex items-center gap-2 min-w-0">
            <span className="text-xs text-gray-600 shrink-0">Speed</span>
            <select
              value={String(speed)}
              onChange={e => {
                const v = parseFloat(e.target.value);
                if (SPEEDS.includes(v as Speed)) onSpeedChange(v as Speed);
              }}
              className={clsx(selectClass, "pl-3 pr-8")}
              style={{ backgroundImage: chevronBg }}
            >
              {SPEEDS.map(s => (
                <option key={s} value={String(s)}>
                  {s === 1 ? "1× (normal)" : `${s}×`}
                </option>
              ))}
            </select>
          </label>
          {hasSustain && (
            <button
              type="button"
              onClick={onSustainToggle}
              title={sustainOn ? "Sustain pedal ON — click to disable" : "Sustain pedal OFF — click to enable"}
              className={clsx(
                "flex items-center gap-1 px-1.5 py-0.5 rounded-md border text-[10px] font-medium transition-colors",
                sustainOn
                  ? "bg-amber-500/15 border-amber-500/30 text-amber-400 hover:bg-amber-500/25"
                  : "bg-surface-3 border-surface-border text-gray-500 hover:text-gray-300",
              )}
            >
              🎹 Pedal {sustainOn ? "On" : "Off"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
