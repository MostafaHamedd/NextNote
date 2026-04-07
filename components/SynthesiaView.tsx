"use client";

import { useMemo } from "react";
import { SheetData } from "@/lib/sheetStore";
import { normalisePitch, pitchToMidi, buildKeys } from "@/lib/pianoUtils";
import { usePianoSampler } from "@/hooks/usePianoSampler";
import { usePianoPlayback } from "@/hooks/usePianoPlayback";
import PianoKeyboard from "@/components/piano/PianoKeyboard";
import PlayerControls from "@/components/piano/PlayerControls";

export default function SynthesiaView({ data }: { data: SheetData }) {
  // Pre-process notes once
  const sortedNotes = useMemo(() =>
    data.notes
      .map(n => ({ ...n, pitch: normalisePitch(n.pitch) }))
      .sort((a, b) => a.startSec - b.startSec),
    [data.notes],
  );

  const totalSec = data.totalSec > 0
    ? data.totalSec
    : Math.max(...sortedNotes.map(n => n.startSec + n.durationSec), 1);

  // ── Hooks ──────────────────────────────────────────────────────────────────
  const sampler  = usePianoSampler(sortedNotes);
  const playback = usePianoPlayback(sortedNotes, totalSec, data.hasSustainEvents ?? false, sampler);

  // ── Keyboard layout ────────────────────────────────────────────────────────
  const midis   = sortedNotes.map(n => pitchToMidi(n.pitch)).filter(m => m >= 0);
  const minOct  = midis.length ? Math.max(0, Math.floor(Math.min(...midis) / 12) - 1) : 3;
  const maxOct  = midis.length ? Math.min(9, Math.ceil(Math.max(...midis)  / 12) + 1) : 5;
  const keys      = buildKeys(minOct, maxOct);
  const whiteKeys = keys.filter(k => !k.isBlack);
  const blackKeys = keys.filter(k => k.isBlack);
  const pianoW    = whiteKeys.length * 28; // WK = 28

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="bg-surface-1 rounded-2xl border border-surface-border p-5 space-y-4 w-full min-w-0">

      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-2 min-w-0">
        <div className="min-w-0">
          <p className="font-bold text-white text-base truncate">{data.title || "Piece"}</p>
          <p className="text-xs text-gray-500">
            {data.timeSignature} · {data.tempo} BPM · {Math.round(totalSec)}s
          </p>
        </div>
        <div className="flex items-center gap-3 text-xs text-gray-500 shrink-0">
          <span className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-sm bg-cyan-500 inline-block" />
            Left hand
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-sm bg-brand-500 inline-block" />
            Right hand
          </span>
        </div>
      </div>

      {/* Mobile: controls above piano; md+: piano then controls */}
      <div className="flex flex-col-reverse gap-4 md:flex-col">
        <PianoKeyboard
          whiteKeys={whiteKeys}
          blackKeys={blackKeys}
          pianoW={pianoW}
          activeNotes={playback.activeNotes}
        />
        <PlayerControls
          playing={playback.playing}
          samplerReady={sampler.samplerReady}
          progress={playback.progress}
          totalSec={totalSec}
          speed={playback.speed}
          sustainOn={playback.sustainOn}
          hasSustain={data.hasSustainEvents ?? false}
          onPlay={playback.handlePlay}
          onReset={playback.handleReset}
          onSeek={playback.handleSeek}
          onSpeedChange={playback.setSpeed}
          onSustainToggle={() => playback.setSustainOn(v => !v)}
        />
      </div>
    </div>
  );
}
