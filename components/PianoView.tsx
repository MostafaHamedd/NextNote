"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { ChevronLeft, ChevronRight, Square, RotateCcw, X } from "lucide-react";
import clsx from "clsx";

// ─── Types ───────────────────────────────────────────────────────────────────

export interface ChordData {
  name: string;
  notes: string[];
  display: string;
}

interface PianoViewProps {
  chordData: ChordData[];
  bpm: number;
  onClose: () => void;
}

// ─── Piano key layout (C3–C5, white key width = 40 px) ───────────────────────

const WK = 40;
const WH = 130;
const BKW = 24;
const BKH = 82;

const WHITE_KEYS: { note: string; x: number }[] = [
  { note: "C3", x: 0 },  { note: "D3", x: 40 },  { note: "E3", x: 80 },
  { note: "F3", x: 120 }, { note: "G3", x: 160 }, { note: "A3", x: 200 },
  { note: "B3", x: 240 },
  { note: "C4", x: 280 }, { note: "D4", x: 320 }, { note: "E4", x: 360 },
  { note: "F4", x: 400 }, { note: "G4", x: 440 }, { note: "A4", x: 480 },
  { note: "B4", x: 520 },
  { note: "C5", x: 560 },
];

const BLACK_KEYS: { note: string; x: number }[] = [
  { note: "C#3", x: 25 },  { note: "D#3", x: 63 },
  { note: "F#3", x: 143 }, { note: "G#3", x: 181 }, { note: "A#3", x: 219 },
  { note: "C#4", x: 305 }, { note: "D#4", x: 343 },
  { note: "F#4", x: 423 }, { note: "G#4", x: 461 }, { note: "A#4", x: 499 },
];

const PIANO_WIDTH = 600;

// ─── Frequencies ─────────────────────────────────────────────────────────────

const NOTE_FREQ: Record<string, number> = {
  C3: 130.81, "C#3": 138.59, D3: 146.83, "D#3": 155.56, E3: 164.81,
  F3: 174.61, "F#3": 185.00, G3: 196.00, "G#3": 207.65, A3: 220.00,
  "A#3": 233.08, B3: 246.94,
  C4: 261.63, "C#4": 277.18, D4: 293.66, "D#4": 311.13, E4: 329.63,
  F4: 349.23, "F#4": 369.99, G4: 392.00, "G#4": 415.30, A4: 440.00,
  "A#4": 466.16, B4: 493.88,
  C5: 523.25,
};

// ─── Piano synthesis ──────────────────────────────────────────────────────────
//
// A concert grand is modelled with:
//   • 6 sine-wave partials at harmonic multiples, each with an independent
//     two-stage envelope (fast initial decay → long tail).  Lower partials
//     sustain much longer than higher ones, matching real piano physics.
//   • A brief bandpass-filtered noise burst for the hammer strike transient.
//   • A DynamicsCompressorNode shared across all notes so chords don't clip.
//
// Returns the note's sustain duration (seconds) so callers know when it ends.

const HARMONICS = [
  { ratio: 1.0, gain: 1.00, decayFrac: 1.00 },
  { ratio: 2.0, gain: 0.50, decayFrac: 0.70 },
  { ratio: 3.0, gain: 0.25, decayFrac: 0.52 },
  { ratio: 4.0, gain: 0.12, decayFrac: 0.40 },
  { ratio: 5.0, gain: 0.07, decayFrac: 0.32 },
  { ratio: 6.0, gain: 0.04, decayFrac: 0.25 },
];

function schedulePianoNote(
  ctx: AudioContext,
  dest: AudioNode,
  freq: number,
  startTime: number,
  velocity = 0.65,
  out: AudioScheduledSourceNode[],
): number {
  // Lower notes sustain longer — mirrors real string physics
  const duration = Math.max(1.5, 2.8 - freq / 500);

  // Per-note master gain (velocity)
  const master = ctx.createGain();
  master.gain.setValueAtTime(velocity * 0.38, startTime);
  master.connect(dest);

  // Harmonic partials
  HARMONICS.forEach(({ ratio, gain, decayFrac }) => {
    const decay = duration * decayFrac;
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = "sine";
    osc.frequency.setValueAtTime(freq * ratio, startTime);

    // Two-stage piano envelope:
    //   0 → peak in 3 ms (hammer strike)
    //   peak → 55 % in 60 ms (fast initial decay, the "thump")
    //   55 % → near-zero over full decay (the piano's long ring-out)
    g.gain.setValueAtTime(0, startTime);
    g.gain.linearRampToValueAtTime(gain, startTime + 0.003);
    g.gain.exponentialRampToValueAtTime(gain * 0.55, startTime + 0.06);
    g.gain.exponentialRampToValueAtTime(0.0001, startTime + decay);

    osc.connect(g);
    g.connect(master);
    osc.start(startTime);
    osc.stop(startTime + decay + 0.05);
    out.push(osc);
  });

  // Hammer-strike noise: brief burst of bandpass-filtered white noise
  const noiseDur = 0.03;
  const noiseLen = Math.ceil(ctx.sampleRate * noiseDur);
  const noiseBuf = ctx.createBuffer(1, noiseLen, ctx.sampleRate);
  const d = noiseBuf.getChannelData(0);
  for (let i = 0; i < noiseLen; i++) d[i] = Math.random() * 2 - 1;

  const noise = ctx.createBufferSource();
  noise.buffer = noiseBuf;

  const noiseFilter = ctx.createBiquadFilter();
  noiseFilter.type = "bandpass";
  noiseFilter.frequency.setValueAtTime(
    Math.min(freq * 3, ctx.sampleRate * 0.4),
    startTime,
  );
  noiseFilter.Q.setValueAtTime(1.2, startTime);

  const noiseGain = ctx.createGain();
  noiseGain.gain.setValueAtTime(velocity * 0.10, startTime);
  noiseGain.gain.exponentialRampToValueAtTime(0.0001, startTime + noiseDur);

  noise.connect(noiseFilter);
  noiseFilter.connect(noiseGain);
  noiseGain.connect(master);
  noise.start(startTime);
  out.push(noise);

  return duration;
}

// ─── Component ───────────────────────────────────────────────────────────────

export default function PianoView({ chordData, bpm, onClose }: PianoViewProps) {
  const [activeIdx, setActiveIdx] = useState(0);
  const [selectedMode, setSelectedMode] = useState<"arpeggio" | "chord">("chord");
  const [isAuto, setIsAuto] = useState(false);

  const audioCtxRef = useRef<AudioContext | null>(null);
  const compressorRef = useRef<DynamicsCompressorNode | null>(null);
  const playingSourcesRef = useRef<AudioScheduledSourceNode[]>([]);
  const autoTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const activeIdxRef = useRef(activeIdx);
  activeIdxRef.current = activeIdx;
  const selectedModeRef = useRef(selectedMode);
  selectedModeRef.current = selectedMode;

  const activeChord = chordData[activeIdx] ?? chordData[0];
  const activeNotes = new Set(activeChord?.notes ?? []);

  // ── Shared AudioContext + Compressor ────────────────────────────────────────

  const getDestination = useCallback((): [AudioContext, AudioNode] => {
    if (!audioCtxRef.current || audioCtxRef.current.state === "closed") {
      const ctx = new AudioContext();
      audioCtxRef.current = ctx;

      // Compressor prevents chords from clipping
      const comp = ctx.createDynamicsCompressor();
      comp.threshold.setValueAtTime(-18, ctx.currentTime);
      comp.knee.setValueAtTime(6, ctx.currentTime);
      comp.ratio.setValueAtTime(4, ctx.currentTime);
      comp.attack.setValueAtTime(0.003, ctx.currentTime);
      comp.release.setValueAtTime(0.25, ctx.currentTime);
      comp.connect(ctx.destination);
      compressorRef.current = comp;
    }
    if (audioCtxRef.current.state === "suspended") {
      audioCtxRef.current.resume();
    }
    return [audioCtxRef.current, compressorRef.current!];
  }, []);

  // ── Playback helpers ────────────────────────────────────────────────────────

  const stopPlayback = useCallback(() => {
    playingSourcesRef.current.forEach((n) => { try { n.stop(); } catch {} });
    playingSourcesRef.current = [];
  }, []);

  /** Click a key → instant single-note preview (does not interrupt playback). */
  const previewNote = useCallback((note: string) => {
    const freq = NOTE_FREQ[note];
    if (!freq) return;
    const [ctx, dest] = getDestination();
    schedulePianoNote(ctx, dest, freq, ctx.currentTime, 0.6, []);
  }, [getDestination]);

  /** Ascending → descending arpeggio at 8th-note steps. */
  const playArpeggio = useCallback(
    (notes: string[], tempo: number) => {
      stopPlayback();
      if (!notes.length) return;
      const [ctx, dest] = getDestination();
      const stepSecs = 60 / tempo / 12; // 3× faster than 16th-note steps
      const pattern = [...notes, ...[...notes].reverse().slice(1)];
      const startAt = ctx.currentTime + 0.05;
      const allSources: AudioScheduledSourceNode[] = [];

      pattern.forEach((note, i) => {
        const freq = NOTE_FREQ[note];
        if (!freq) return;
        const t = startAt + i * stepSecs;
        schedulePianoNote(ctx, dest, freq, t, 0.65, allSources);
      });

      playingSourcesRef.current = allSources;
    },
    [stopPlayback, getDestination],
  );

  /** All notes struck simultaneously (tiny strum stagger for naturalness). */
  const playChord = useCallback(
    (notes: string[]) => {
      stopPlayback();
      if (!notes.length) return;
      const [ctx, dest] = getDestination();
      const allSources: AudioScheduledSourceNode[] = [];

      notes.forEach((note, i) => {
        const freq = NOTE_FREQ[note];
        if (!freq) return;
        const t = ctx.currentTime + 0.02 + i * 0.012;
        schedulePianoNote(ctx, dest, freq, t, 0.60, allSources);
      });

      playingSourcesRef.current = allSources;
    },
    [stopPlayback, getDestination],
  );

  // ── Navigation ──────────────────────────────────────────────────────────────

  const goTo = useCallback(
    (idx: number) => { stopPlayback(); setActiveIdx(idx); },
    [stopPlayback],
  );

  const goPrev = () => goTo((activeIdx - 1 + chordData.length) % chordData.length);
  const goNext = () => goTo((activeIdx + 1) % chordData.length);

  // ── Auto-advance ────────────────────────────────────────────────────────────

  const stopAuto = useCallback(() => {
    if (autoTimerRef.current) clearInterval(autoTimerRef.current);
    autoTimerRef.current = null;
    stopPlayback();
    setIsAuto(false);
  }, [stopPlayback]);

  const playInSelectedMode = useCallback(
    (notes: string[]) => {
      if (selectedModeRef.current === "arpeggio") playArpeggio(notes, bpm);
      else playChord(notes);
    },
    [playArpeggio, playChord, bpm],
  );

  const toggleAuto = () => {
    if (isAuto) { stopAuto(); return; }
    setIsAuto(true);
    playInSelectedMode(chordData[activeIdxRef.current].notes);
    const msPerChord = (60 / bpm) * 4 * 1000;
    autoTimerRef.current = setInterval(() => {
      const next = (activeIdxRef.current + 1) % chordData.length;
      setActiveIdx(next);
      playInSelectedMode(chordData[next].notes);
    }, msPerChord);
  };

  useEffect(() => () => { stopAuto(); }, [stopAuto]);

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <div className="bg-surface-1 rounded-2xl border border-surface-border p-5">

      {/* Header */}
      <div className="flex items-center justify-between gap-4 mb-4 flex-wrap">

        {/* Chord navigator */}
        <div className="flex items-center gap-2">
          <button onClick={goPrev} className="p-1.5 rounded-lg hover:bg-surface-3 text-gray-400 hover:text-white transition-colors">
            <ChevronLeft size={18} />
          </button>
          <div className="min-w-[130px] text-center">
            <div className="text-xl font-bold font-mono text-white leading-tight">{activeChord.name}</div>
            <div className="text-xs text-gray-500">{activeChord.display}</div>
          </div>
          <button onClick={goNext} className="p-1.5 rounded-lg hover:bg-surface-3 text-gray-400 hover:text-white transition-colors">
            <ChevronRight size={18} />
          </button>
        </div>

        {/* Chord selector dots */}
        <div className="flex items-center gap-1.5 flex-wrap">
          {chordData.map((c, i) => (
            <button
              key={i}
              onClick={() => { goTo(i); playInSelectedMode(c.notes); }}
              className={clsx(
                "px-3 py-1 rounded-lg text-sm font-mono font-medium transition-all",
                i === activeIdx
                  ? "bg-brand-600 text-white shadow-md shadow-brand-900/40"
                  : "bg-surface-3 text-gray-400 hover:text-white border border-surface-border",
              )}
            >
              {c.name}
            </button>
          ))}
        </div>

        {/* Controls */}
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex bg-surface-3 rounded-xl p-0.5 border border-surface-border">
            {(["arpeggio", "chord"] as const).map((mode) => (
              <button
                key={mode}
                onClick={() => { stopPlayback(); setSelectedMode(mode); }}
                className={clsx(
                  "px-3 py-1.5 rounded-[10px] text-xs font-semibold capitalize transition-all",
                  selectedMode === mode ? "bg-brand-600 text-white shadow-sm" : "text-gray-500 hover:text-gray-300",
                )}
              >
                {mode === "arpeggio" ? "♪ Arpeggio" : "♫ Chord"}
              </button>
            ))}
          </div>

          <button
            onClick={toggleAuto}
            className={clsx(
              "flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-sm font-medium border transition-all",
              isAuto
                ? "bg-red-500/20 text-red-400 border-red-500/30 hover:bg-red-500/30"
                : "bg-brand-500/20 text-brand-300 border-brand-500/30 hover:bg-brand-500/30",
            )}
          >
            {isAuto ? <><Square size={13} /> Stop</> : <><RotateCcw size={13} /> Auto Play</>}
          </button>

          <button onClick={() => { stopAuto(); onClose(); }} className="p-1.5 rounded-lg hover:bg-surface-3 text-gray-500 hover:text-gray-300 transition-colors">
            <X size={16} />
          </button>
        </div>
      </div>

      {/* Piano keyboard */}
      <div className="overflow-x-auto pb-1">
        <div className="relative select-none mx-auto" style={{ width: PIANO_WIDTH, height: WH }}>

          {WHITE_KEYS.map(({ note, x }) => {
            const active = activeNotes.has(note);
            return (
              <div
                key={note}
                onClick={() => previewNote(note)}
                title={note}
                className={clsx(
                  "absolute cursor-pointer rounded-b-md border transition-all duration-200",
                  active
                    ? "bg-gradient-to-b from-brand-400 to-brand-600 border-brand-500 z-10 shadow-lg shadow-brand-500/30"
                    : "bg-white border-gray-300 hover:bg-indigo-50 z-0",
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

          {BLACK_KEYS.map(({ note, x }) => {
            const active = activeNotes.has(note);
            return (
              <div
                key={note}
                onClick={() => previewNote(note)}
                title={note}
                className={clsx(
                  "absolute cursor-pointer rounded-b-md z-20 transition-all duration-200",
                  active
                    ? "bg-gradient-to-b from-accent-purple to-brand-700 shadow-lg shadow-purple-500/50"
                    : "bg-gray-900 hover:bg-gray-800 border border-gray-700",
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

      {/* Note chips */}
      <div className="flex items-center gap-2 mt-3 pt-3 border-t border-surface-border flex-wrap">
        <span className="text-xs font-medium text-gray-500 uppercase tracking-wider shrink-0">Notes:</span>
        {activeChord.notes.map((note) => (
          <span
            key={note}
            onClick={() => previewNote(note)}
            className="text-xs font-mono bg-brand-500/15 text-brand-300 border border-brand-500/30 px-2 py-0.5 rounded cursor-pointer hover:bg-brand-500/25 transition-colors"
          >
            {note}
          </span>
        ))}
        <span className="text-xs text-gray-600 ml-auto">Click any key or note to preview</span>
      </div>
    </div>
  );
}
