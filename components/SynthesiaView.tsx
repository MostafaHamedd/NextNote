"use client";

import { useMemo, useState, useEffect, useRef } from "react";
import { SheetData } from "@/lib/sheetStore";
import { normalisePitch, pitchToMidi, buildKeys } from "@/lib/pianoUtils";
import { usePianoSampler } from "@/hooks/usePianoSampler";
import { usePianoPlayback } from "@/hooks/usePianoPlayback";
import PianoKeyboard from "@/components/piano/PianoKeyboard";
import PlayerControls from "@/components/piano/PlayerControls";
import FallingNotesLane from "@/components/piano/FallingNotesLane";
import { AUTOPLAY_KEY } from "@/lib/auth";

type HandFilter = "both" | "left" | "right";

export default function SynthesiaView({ data }: { data: SheetData }) {
  const [showLane, setShowLane] = useState(true);
  const [tutorialDismissed, setTutorialDismissed] = useState(false);
  const [handFilter, setHandFilter] = useState<HandFilter>("both");
  const autoPlayFiredRef = useRef(false);

  // Auto-dismiss tutorial hint after 4 s
  useEffect(() => {
    const t = setTimeout(() => setTutorialDismissed(true), 4000);
    return () => clearTimeout(t);
  }, []);

  // Pre-process notes once
  const sortedNotes = useMemo(() =>
    data.notes
      .map(n => ({ ...n, pitch: normalisePitch(n.pitch) }))
      .sort((a, b) => a.startSec - b.startSec),
    [data.notes],
  );

  // Filter by selected hand (identity-stable so playback hook restarts cleanly)
  const filteredNotes = useMemo(() =>
    handFilter === "both" ? sortedNotes : sortedNotes.filter(n => n.hand === handFilter),
    [sortedNotes, handFilter],
  );

  const totalSec = data.totalSec > 0
    ? data.totalSec
    : Math.max(...sortedNotes.map(n => n.startSec + n.durationSec), 1);

  // ── Hooks ──────────────────────────────────────────────────────────────────
  const sampler  = usePianoSampler(sortedNotes);           // always load all samples
  const playback = usePianoPlayback(filteredNotes, totalSec, data.hasSustainEvents ?? false, sampler);

  // ── Auto-play when sampler is ready (if setting enabled) ───────────────────
  useEffect(() => {
    if (!sampler.samplerReady || autoPlayFiredRef.current) return;
    if (typeof window !== "undefined" && localStorage.getItem(AUTOPLAY_KEY) === "true") {
      autoPlayFiredRef.current = true;
      playback.handlePlay();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sampler.samplerReady]);

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
        <div className="flex items-center gap-2 text-xs shrink-0">
          {/* Hand filter buttons */}
          {(["left", "both", "right"] as HandFilter[]).map((h) => (
            <button
              key={h}
              onClick={() => setHandFilter(h)}
              className={[
                "flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium border transition-all",
                handFilter === h
                  ? h === "left"
                    ? "bg-cyan-500/20 border-cyan-500/60 text-cyan-300"
                    : h === "right"
                    ? "bg-brand-500/20 border-brand-500/60 text-brand-300"
                    : "bg-white/10 border-white/30 text-white"
                  : "bg-transparent border-surface-border text-gray-500 hover:text-gray-300 hover:border-gray-500",
              ].join(" ")}
            >
              <span className={[
                "w-2.5 h-2.5 rounded-sm inline-block",
                h === "left"  ? "bg-cyan-500"   :
                h === "right" ? "bg-brand-500"  : "bg-gradient-to-r from-cyan-500 to-brand-500",
              ].join(" ")} />
              {h === "both" ? "Both" : h === "left" ? "Left" : "Right"}
            </button>
          ))}
          {/* Falling-lane toggle with tutorial pulse */}
          <div className="relative ml-1">
            <button
              onClick={() => { setShowLane(v => !v); setTutorialDismissed(true); }}
              className={[
                "flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium border transition-all",
                showLane
                  ? "bg-brand-500/20 border-brand-500/50 text-brand-300 hover:bg-brand-500/30"
                  : "bg-surface-border/40 border-surface-border text-gray-400 hover:text-white hover:border-gray-500",
              ].join(" ")}
            >
              {/* Toggle pill */}
              <span
                className={[
                  "w-6 h-3.5 rounded-full flex items-center transition-all duration-200",
                  showLane ? "bg-brand-500 justify-end pr-0.5" : "bg-gray-600 justify-start pl-0.5",
                ].join(" ")}
              >
                <span className="w-2.5 h-2.5 rounded-full bg-white block" />
              </span>
              Falling notes
            </button>
            {/* Tutorial pulse ring — fades after 4 s */}
            {!tutorialDismissed && (
              <span className="absolute inset-0 rounded-full animate-ping bg-brand-400/30 pointer-events-none" />
            )}
          </div>
        </div>
      </div>

      {/* Mobile: controls above piano; md+: piano then controls */}
      <div className="flex flex-col-reverse gap-4 md:flex-col">
        {/* Falling notes lane + keyboard stacked with no gap between */}
        <div className="flex flex-col">
          {showLane && (
            <FallingNotesLane
              sortedNotes={filteredNotes}
              whiteKeys={whiteKeys}
              blackKeys={blackKeys}
              pianoW={pianoW}
              scoreTimeSec={playback.scoreTimeSec}
              sustainOn={playback.sustainOn}
            />
          )}
          <PianoKeyboard
            whiteKeys={whiteKeys}
            blackKeys={blackKeys}
            pianoW={pianoW}
            activeNotes={playback.activeNotes}
          />
        </div>
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
