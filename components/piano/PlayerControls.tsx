"use client";

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
  onSpeedChange:(s: Speed) => void;
  onSustainToggle: () => void;
}

export default function PlayerControls({
  playing, samplerReady, progress, totalSec,
  speed, sustainOn, hasSustain,
  onPlay, onReset, onSeek, onSpeedChange, onSustainToggle,
}: Props) {
  return (
    <div className="pt-1 border-t border-surface-border space-y-2">

      {/* Row 1 — Play / Reset / Progress */}
      <div className="flex items-center gap-2">
        <button
          onClick={onPlay}
          disabled={!samplerReady}
          className={clsx(
            "flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-sm font-semibold transition-all shrink-0",
            !samplerReady
              ? "bg-surface-3 text-gray-500 cursor-wait"
              : playing
              ? "bg-red-500/20 text-red-400 border border-red-500/30 hover:bg-red-500/30"
              : "bg-brand-600 text-white hover:bg-brand-500 shadow-lg shadow-brand-900/30",
          )}
        >
          {!samplerReady
            ? <><Loader2 size={13} className="animate-spin" /><span className="hidden sm:inline ml-1">Loading…</span></>
            : playing
            ? <><Pause size={13} /><span className="ml-1">Pause</span></>
            : <><Play  size={13} /><span className="ml-1">Play</span></>}
        </button>

        <button
          onClick={onReset}
          className="p-1.5 rounded-xl text-gray-500 hover:text-gray-300 hover:bg-surface-3 transition-colors shrink-0"
        >
          <RotateCcw size={13} />
        </button>

        <span className="text-xs font-mono text-gray-600 shrink-0 w-9 text-right">
          {fmt(progress * totalSec)}
        </span>

        <div
          className="flex-1 h-1.5 bg-surface-3 rounded-full cursor-pointer relative overflow-hidden"
          onClick={onSeek}
        >
          <div
            className="absolute left-0 top-0 h-full bg-brand-500 rounded-full"
            style={{ width: `${progress * 100}%` }}
          />
        </div>

        <span className="text-xs font-mono text-gray-600 shrink-0 w-9">
          {fmt(totalSec)}
        </span>
      </div>

      {/* Row 2 — Speed + Sustain */}
      <div className="flex flex-wrap items-center gap-3">

        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs text-gray-600 shrink-0">Speed</span>
          <div className="flex flex-wrap gap-0.5 bg-surface-3 rounded-xl p-0.5 border border-surface-border">
            {SPEEDS.map(s => (
              <button
                key={s}
                onClick={() => onSpeedChange(s)}
                className={clsx(
                  "px-2.5 sm:px-3 py-1 rounded-[9px] text-[11px] sm:text-xs font-semibold transition-all shrink-0",
                  speed === s ? "bg-brand-600 text-white" : "text-gray-500 hover:text-gray-300",
                )}
              >
                {s}x
              </button>
            ))}
          </div>
        </div>

        {hasSustain && (
          <button
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
  );
}
