"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { ChevronLeft, ChevronRight, Square, RotateCcw, X } from "lucide-react";
import clsx from "clsx";
import {
  pitchToMidi,
  normalisePitch,
  midiToSoundfontUrl,
  playSample,
} from "@/lib/pianoUtils";

// ─── Types ───────────────────────────────────────────────────────────────────

export interface ChordData {
  name: string;
  notes: string[];
  display: string;
}

interface PianoViewProps {
  chordData: ChordData[];
  bpm: number;
  onClose?: () => void;
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

/** MIDI numbers for every key on this keyboard (same FluidR3 samples as the visualizer). */
const PIANO_KEY_MIDIS = Array.from(
  new Set(
    [...WHITE_KEYS, ...BLACK_KEYS]
      .map(({ note }) => pitchToMidi(normalisePitch(note)))
      .filter((m) => m >= 0),
  ),
).sort((a, b) => a - b);

// ─── Component ───────────────────────────────────────────────────────────────

export default function PianoView({ chordData, bpm, onClose }: PianoViewProps) {
  const [activeIdx, setActiveIdx] = useState(0);
  const [selectedMode, setSelectedMode] = useState<"arpeggio" | "chord">("chord");
  const [isAuto, setIsAuto] = useState(false);
  const [pianoViewW, setPianoViewW] = useState(0);
  const pianoContainerRef = useRef<HTMLDivElement>(null);

  // Fit keyboard to container width — no horizontal scroll.
  useEffect(() => {
    const el = pianoContainerRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setPianoViewW(el.clientWidth));
    ro.observe(el);
    setPianoViewW(el.clientWidth);
    return () => ro.disconnect();
  }, []);

  const pianoScale =
    pianoViewW > 0 ? pianoViewW / PIANO_WIDTH : 1;

  const audioCtxRef = useRef<AudioContext | null>(null);
  const compressorRef = useRef<DynamicsCompressorNode | null>(null);
  const buffersRef = useRef<Map<number, AudioBuffer>>(new Map());
  const playingSourcesRef = useRef<AudioScheduledSourceNode[]>([]);
  const autoTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [samplerReady, setSamplerReady] = useState(false);

  const activeIdxRef = useRef(activeIdx);
  activeIdxRef.current = activeIdx;
  const selectedModeRef = useRef(selectedMode);
  selectedModeRef.current = selectedMode;

  const activeChord = chordData[activeIdx] ?? chordData[0];
  const activeNotes = new Set(activeChord?.notes ?? []);

  // Same MusyngKite grand-piano chain as usePianoSampler (visualizer).
  useEffect(() => {
    let cancelled = false;
    setSamplerReady(false);
    buffersRef.current = new Map();

    const ctx = new AudioContext();
    const comp = ctx.createDynamicsCompressor();
    comp.threshold.setValueAtTime(-22, ctx.currentTime);
    comp.ratio.setValueAtTime(6, ctx.currentTime);
    const master = ctx.createGain();
    master.gain.value = 4.48;
    comp.connect(master);
    master.connect(ctx.destination);
    audioCtxRef.current = ctx;
    compressorRef.current = comp;

    Promise.all(
      PIANO_KEY_MIDIS.map(async (midi) => {
        try {
          const res = await fetch(midiToSoundfontUrl(midi));
          if (!res.ok) return;
          const ab = await res.arrayBuffer();
          const buf = await ctx.decodeAudioData(ab);
          if (!cancelled) buffersRef.current.set(midi, buf);
        } catch {
          /* skip */
        }
      }),
    ).then(() => {
      if (!cancelled) setSamplerReady(true);
    });

    return () => {
      cancelled = true;
      ctx.close();
    };
  }, []);

  const ensureAudio = useCallback((): [AudioContext, AudioNode] | null => {
    const ctx = audioCtxRef.current;
    const comp = compressorRef.current;
    if (!ctx || !comp || ctx.state === "closed") return null;
    if (ctx.state === "suspended") void ctx.resume();
    return [ctx, comp];
  }, []);

  const playSampleNote = useCallback(
    (
      note: string,
      ctx: AudioContext,
      dest: AudioNode,
      startTime: number,
      durSec: number,
      velocity: number,
      out: AudioScheduledSourceNode[],
    ) => {
      const midi = pitchToMidi(normalisePitch(note));
      if (midi < 0) return;
      const buffer = buffersRef.current.get(midi);
      if (!buffer) return;
      playSample(ctx, dest, buffer, startTime, durSec, velocity, out);
    },
    [],
  );

  const stopPlayback = useCallback(() => {
    playingSourcesRef.current.forEach((n) => {
      try {
        n.stop();
      } catch {
        /* already stopped */
      }
    });
    playingSourcesRef.current = [];
  }, []);

  /** Click a key → single-note preview (does not stop chord / arpeggio bus). */
  const previewNote = useCallback(
    (note: string) => {
      if (!samplerReady) return;
      const pair = ensureAudio();
      if (!pair) return;
      const [ctx, dest] = pair;
      playSampleNote(note, ctx, dest, ctx.currentTime, 1.15, 0.62, []);
    },
    [samplerReady, ensureAudio, playSampleNote],
  );

  /** Ascending → descending arpeggio; one note per eighth at `tempo` BPM. */
  const playArpeggio = useCallback(
    (notes: string[], tempo: number) => {
      stopPlayback();
      if (!samplerReady || !notes.length) return;
      const pair = ensureAudio();
      if (!pair) return;
      const [ctx, dest] = pair;
      const quarterSec = 60 / tempo;
      const stepSecs = quarterSec / 2;
      const pattern = [...notes, ...[...notes].reverse().slice(1)];
      const startAt = ctx.currentTime + 0.05;
      const allSources: AudioScheduledSourceNode[] = [];
      const noteDur = Math.max(0.55, stepSecs * 0.92);

      pattern.forEach((raw, i) => {
        const t = startAt + i * stepSecs;
        playSampleNote(raw, ctx, dest, t, noteDur, 0.66, allSources);
      });

      playingSourcesRef.current = allSources;
    },
    [stopPlayback, samplerReady, ensureAudio, playSampleNote],
  );

  /** All notes struck together (slight strum stagger). */
  const playChord = useCallback(
    (notes: string[]) => {
      stopPlayback();
      if (!samplerReady || !notes.length) return;
      const pair = ensureAudio();
      if (!pair) return;
      const [ctx, dest] = pair;
      const allSources: AudioScheduledSourceNode[] = [];
      const chordDur = 1.85;

      notes.forEach((raw, i) => {
        const t = ctx.currentTime + 0.02 + i * 0.012;
        playSampleNote(raw, ctx, dest, t, chordDur, 0.6, allSources);
      });

      playingSourcesRef.current = allSources;
    },
    [stopPlayback, samplerReady, ensureAudio, playSampleNote],
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
    <div className="bg-surface-1 rounded-2xl border border-surface-border p-3 sm:p-5">

      {/* Header */}
      <div className="flex items-center justify-between gap-2 mb-3 flex-wrap">

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
            disabled={!samplerReady}
            className={clsx(
              "flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-sm font-medium border transition-all",
              !samplerReady && "opacity-40 cursor-wait",
              isAuto
                ? "bg-red-500/20 text-red-400 border-red-500/30 hover:bg-red-500/30"
                : "bg-brand-500/20 text-brand-300 border-brand-500/30 hover:bg-brand-500/30",
            )}
          >
            {isAuto ? <><Square size={13} /> Stop</> : <><RotateCcw size={13} /> Auto Play</>}
          </button>

          {onClose && (
            <button onClick={() => { stopAuto(); onClose(); }} className="p-1.5 rounded-lg hover:bg-surface-3 text-gray-500 hover:text-gray-300 transition-colors">
              <X size={16} />
            </button>
          )}
        </div>
        {!samplerReady && (
          <p className="w-full text-center text-[11px] text-gray-500 sm:text-left sm:w-auto">Loading piano sound…</p>
        )}
      </div>

      {/* Piano keyboard */}
      <div
        ref={pianoContainerRef}
        className="w-full overflow-hidden pb-1"
        style={{ height: WH * pianoScale }}
      >
        <div
          className="relative select-none"
          style={{
            width: PIANO_WIDTH,
            height: WH,
            transform: `scale(${pianoScale})`,
            transformOrigin: "top left",
          }}
        >

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
                  <span
                    className="absolute left-0 right-0 text-center font-bold font-mono text-white pointer-events-none drop-shadow-[0_1px_2px_rgba(0,0,0,0.85)] leading-none"
                    style={{
                      bottom: pianoScale < 0.5 ? 4 : 10,
                      fontSize: pianoScale < 0.42 ? 9 : 11,
                    }}
                  >
                    {note}
                  </span>
                )}
                {!active && note.startsWith("C") && pianoScale > 0.32 && (
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
                  <span
                    className="absolute left-0 right-0 text-center font-bold font-mono text-white pointer-events-none drop-shadow-[0_1px_2px_rgba(0,0,0,0.9)] leading-none"
                    style={{
                      bottom: pianoScale < 0.5 ? 3 : 8,
                      fontSize: pianoScale < 0.42 ? 7 : 9,
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
