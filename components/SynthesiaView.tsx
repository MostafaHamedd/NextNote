"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { Play, Pause, RotateCcw, Loader2 } from "lucide-react";
import clsx from "clsx";
import { SheetData } from "@/lib/sheetStore";

// ─── Keyboard geometry ────────────────────────────────────────────────────────

const WK  = 28;
const WH  = 110;
const BKW = 17;
const BKH = 68;

const ALL_NOTES   = ["C","C#","D","D#","E","F","F#","G","G#","A","A#","B"];
const WHITE_STEPS = [0, 2, 4, 5, 7, 9, 11];
const FLAT_MAP: Record<string, string> = {
  Db:"C#", Eb:"D#", Fb:"E", Gb:"F#", Ab:"G#", Bb:"A#", Cb:"B",
};

interface KeyDef { note: string; x: number; isBlack: boolean; }

function buildKeys(octStart: number, octEnd: number): KeyDef[] {
  const keys: KeyDef[] = [];
  let whiteX = 0;
  for (let oct = octStart; oct <= octEnd; oct++) {
    for (let si = 0; si < 12; si++) {
      const note = ALL_NOTES[si] + oct;
      if (WHITE_STEPS.includes(si)) {
        keys.push({ note, x: whiteX, isBlack: false });
        whiteX += WK;
      } else {
        keys.push({ note, x: whiteX - BKW * 0.6, isBlack: true });
      }
    }
  }
  return keys;
}

// ─── Pitch helpers ────────────────────────────────────────────────────────────

function normalisePitch(raw: string): string {
  const m = raw.match(/^([A-G]#?b?)(-?\d+)$/);
  if (!m) return raw;
  return (FLAT_MAP[m[1]] ?? m[1]) + m[2];
}

function pitchToMidi(pitch: string): number {
  const m = pitch.match(/^([A-G]#?)(-?\d+)$/);
  if (!m) return -1;
  return parseInt(m[2]) * 12 + ALL_NOTES.indexOf(m[1]);
}

// ─── Salamander Grand Piano — native Web Audio API loader ────────────────────
// 30 real piano recordings (CC-licensed), fetched and decoded as AudioBuffers.
// No Tone.js needed — we pitch-shift with AudioBufferSourceNode.playbackRate.

const SALAMANDER_BASE = "https://tonejs.github.io/audio/salamander/";

// MIDI number → filename for every sampled note
const SAMPLE_MAP: Record<number, string> = {
   21:"A0.mp3",  24:"C1.mp3",  27:"Ds1.mp3",  30:"Fs1.mp3",
   33:"A1.mp3",  36:"C2.mp3",  39:"Ds2.mp3",  42:"Fs2.mp3",
   45:"A2.mp3",  48:"C3.mp3",  51:"Ds3.mp3",  54:"Fs3.mp3",
   57:"A3.mp3",  60:"C4.mp3",  63:"Ds4.mp3",  66:"Fs4.mp3",
   69:"A4.mp3",  72:"C5.mp3",  75:"Ds5.mp3",  78:"Fs5.mp3",
   81:"A5.mp3",  84:"C6.mp3",  87:"Ds6.mp3",  90:"Fs6.mp3",
   93:"A6.mp3",  96:"C7.mp3",  99:"Ds7.mp3", 102:"Fs7.mp3",
  105:"A7.mp3", 108:"C8.mp3",
};
const SAMPLE_MIDIS = Object.keys(SAMPLE_MAP).map(Number).sort((a,b) => a - b);

/** Find the nearest sampled MIDI number to `midi`. */
function nearestSample(midi: number): number {
  return SAMPLE_MIDIS.reduce((best, m) =>
    Math.abs(m - midi) < Math.abs(best - midi) ? m : best
  );
}

/** Play one note using an AudioBuffer + pitch-shift via playbackRate. */
function playSample(
  ctx: AudioContext,
  dest: AudioNode,
  buffer: AudioBuffer,
  sampleMidi: number,
  targetMidi: number,
  startTime: number,
  durSec: number,
  velocity: number,
  out: AudioScheduledSourceNode[],
) {
  const src = ctx.createBufferSource();
  src.buffer = buffer;
  src.playbackRate.value = Math.pow(2, (targetMidi - sampleMidi) / 12);

  const g = ctx.createGain();
  const sustainEnd = startTime + Math.max(durSec, 0.5);
  const releaseEnd = sustainEnd + 0.4;
  g.gain.setValueAtTime(0.001, startTime);
  g.gain.linearRampToValueAtTime(velocity * 0.9, startTime + 0.008);
  g.gain.setValueAtTime(velocity * 0.9, sustainEnd);
  g.gain.exponentialRampToValueAtTime(0.001, releaseEnd);

  src.connect(g);
  g.connect(dest);
  src.start(startTime);
  src.stop(releaseEnd + 0.05);
  out.push(src);
}

// ─── Component ────────────────────────────────────────────────────────────────

const SPEEDS         = [0.25, 0.5, 0.75, 1, 1.25, 1.5, 1.75, 2, 2.5, 3] as const;
type Speed           = typeof SPEEDS[number];
const LOOKAHEAD_SEC  = 0.4;
const SCHED_INTERVAL = 40;

export default function SynthesiaView({ data }: { data: SheetData }) {
  const [playing, setPlaying]           = useState(false);
  const [progress, setProgress]         = useState(0);
  const [speed, setSpeed]               = useState<Speed>(1);
  const [samplerReady, setSamplerReady] = useState(false);
  const [activeNotes, setActiveNotes]   = useState<Map<string, "left" | "right">>(new Map());
  // Sustain pedal toggle — default ON when the MIDI has pedal events
  const [sustainOn, setSustainOn]       = useState(data.hasSustainEvents ?? false);

  // Web Audio API refs
  const audioCtxRef  = useRef<AudioContext | null>(null);
  const compRef      = useRef<DynamicsCompressorNode | null>(null);
  const buffersRef   = useRef<Map<number, AudioBuffer>>(new Map());
  const sourcesRef   = useRef<AudioScheduledSourceNode[]>([]);

  // Timing — all in wall-clock seconds
  const playStartRef    = useRef(0);
  const secOffsetRef    = useRef(0);   // seconds position when playback last started
  const speedRef        = useRef<Speed>(1);
  const sustainRef      = useRef(sustainOn);
  const rafRef          = useRef<number | null>(null);
  const schedIntRef     = useRef<ReturnType<typeof setInterval> | null>(null);
  const nextSchedIdxRef = useRef(0);

  speedRef.current   = speed;
  sustainRef.current = sustainOn;

  // Pre-sort notes by startSec once
  const sortedNotes = data.notes
    .map(n => ({ ...n, pitch: normalisePitch(n.pitch) }))
    .sort((a, b) => a.startSec - b.startSec);

  // ── Keyboard range ──────────────────────────────────────────────────────────
  const midis   = sortedNotes.map(n => pitchToMidi(n.pitch)).filter(m => m >= 0);
  const minOct  = midis.length ? Math.max(0, Math.floor(Math.min(...midis) / 12) - 1) : 3;
  const maxOct  = midis.length ? Math.min(9, Math.ceil(Math.max(...midis)  / 12) + 1) : 5;
  const keys      = buildKeys(minOct, maxOct);
  const whiteKeys = keys.filter(k => !k.isBlack);
  const blackKeys = keys.filter(k => k.isBlack);
  const pianoW    = whiteKeys.length * WK;

  // Use the backend-computed totalSec (accounts for all tempo changes)
  const totalSec = data.totalSec > 0 ? data.totalSec
    : Math.max(...sortedNotes.map(n => n.startSec + n.durationSec), 1);

  // ── Fetch + decode all Salamander samples on mount ──────────────────────────
  useEffect(() => {
    let cancelled = false;
    const ctx  = new AudioContext();
    const comp = ctx.createDynamicsCompressor();
    comp.threshold.setValueAtTime(-18, ctx.currentTime);
    comp.ratio.setValueAtTime(4, ctx.currentTime);
    comp.connect(ctx.destination);
    audioCtxRef.current = ctx;
    compRef.current     = comp;

    Promise.all(
      SAMPLE_MIDIS.map(async (midi) => {
        const res = await fetch(SALAMANDER_BASE + SAMPLE_MAP[midi]);
        const ab  = await res.arrayBuffer();
        const buf = await ctx.decodeAudioData(ab);
        if (!cancelled) buffersRef.current.set(midi, buf);
      })
    ).then(() => { if (!cancelled) setSamplerReady(true); })
     .catch(e => console.error("Sample load error:", e));

    return () => {
      cancelled = true;
      ctx.close();
    };
  }, []);

  // ── Stop audio ──────────────────────────────────────────────────────────────
  const stopAudio = useCallback(() => {
    if (schedIntRef.current) { clearInterval(schedIntRef.current); schedIntRef.current = null; }
    sourcesRef.current.forEach(s => { try { s.stop(); } catch {} });
    sourcesRef.current      = [];
    nextSchedIdxRef.current = 0;
  }, []);

  // ── Lookahead scheduler ─────────────────────────────────────────────────────
  const runScheduler = useCallback(() => {
    const ctx  = audioCtxRef.current;
    const comp = compRef.current;
    if (!ctx || !comp || !buffersRef.current.size) return;

    const spd        = speedRef.current;
    const elapsed    = (performance.now() - playStartRef.current) / 1000;
    const currentSec = secOffsetRef.current + elapsed * spd;
    const schedUntil = currentSec + LOOKAHEAD_SEC * spd;
    const audioNow   = ctx.currentTime + 0.02;
    const out        = sourcesRef.current;

    let idx = nextSchedIdxRef.current;
    while (idx < sortedNotes.length) {
      const note = sortedNotes[idx];
      if (note.startSec > schedUntil) break;
      const midi = pitchToMidi(note.pitch);
      if (midi >= 0) {
        const secFromNow = (note.startSec - currentSec) / spd;
        const tAudio     = audioNow + Math.max(0, secFromNow);
        const noteDur    = sustainRef.current ? note.durationSec : note.durationSecRaw;
        const durSec     = Math.max(0.05, noteDur / spd);
        const vel        = Math.min(1, (note.velocity ?? 80) / 127);
        const nearest    = nearestSample(midi);
        const buffer     = buffersRef.current.get(nearest);
        if (buffer) playSample(ctx, comp, buffer, nearest, midi, tAudio, durSec, vel, out);
      }
      idx++;
    }
    nextSchedIdxRef.current = idx;
    sourcesRef.current      = out;
  }, [sortedNotes]);

  /** Notes that should be lit at this timeline position (same as during playback). */
  const activeNotesAtSec = useCallback(
    (currentSec: number) => {
      const active = new Map<string, "left" | "right">();
      for (const note of sortedNotes) {
        if (note.startSec > currentSec + 0.05) break;
        const dur = sustainRef.current ? note.durationSec : note.durationSecRaw;
        if (currentSec < note.startSec + dur) {
          active.set(note.pitch, note.hand as "left" | "right");
        }
      }
      return active;
    },
    [sortedNotes],
  );

  // ── rAF loop: update progress bar + key highlights ─────────────────────────
  const tick = useCallback(() => {
    const elapsed     = (performance.now() - playStartRef.current) / 1000;
    const currentSec  = secOffsetRef.current + elapsed * speedRef.current;

    setProgress(Math.min(1, currentSec / totalSec));
    setActiveNotes(activeNotesAtSec(currentSec));

    if (currentSec < totalSec) {
      rafRef.current = requestAnimationFrame(tick);
    } else {
      setPlaying(false);
      setProgress(1);
      setActiveNotes(new Map());
    }
  }, [totalSec, activeNotesAtSec]);

  // ── Start playback from a given second position ─────────────────────────────
  const startFrom = useCallback((fromSec: number) => {
    stopAudio();
    // Fast-forward note index to correct start position
    let idx = 0;
    while (idx < sortedNotes.length && sortedNotes[idx].startSec < fromSec - 0.01) idx++;
    nextSchedIdxRef.current = idx;

    playStartRef.current = performance.now();
    secOffsetRef.current = fromSec;

    // Resume AudioContext if suspended by browser autoplay policy
    if (audioCtxRef.current?.state === "suspended") audioCtxRef.current.resume();

    runScheduler();
    schedIntRef.current = setInterval(runScheduler, SCHED_INTERVAL);
    rafRef.current = requestAnimationFrame(tick);
  }, [stopAudio, sortedNotes, runScheduler, tick]);

  // ── Play / Pause ────────────────────────────────────────────────────────────
  const handlePlay = useCallback(() => {
    if (playing) {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      if (schedIntRef.current) { clearInterval(schedIntRef.current); schedIntRef.current = null; }
      stopAudio();
      const elapsed = (performance.now() - playStartRef.current) / 1000;
      secOffsetRef.current += elapsed * speedRef.current;
      setPlaying(false);
      setProgress(Math.min(1, secOffsetRef.current / totalSec));
      setActiveNotes(activeNotesAtSec(secOffsetRef.current));
    } else {
      startFrom(secOffsetRef.current);
      setPlaying(true);
    }
  }, [playing, stopAudio, startFrom, totalSec, activeNotesAtSec]);

  const handleReset = useCallback(() => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    stopAudio();
    secOffsetRef.current = 0;
    setPlaying(false);
    setProgress(0);
    setActiveNotes(new Map());
  }, [stopAudio]);

  // ── Seek ────────────────────────────────────────────────────────────────────
  const handleSeek = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const frac = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    const sec  = frac * totalSec;
    setProgress(frac);
    if (playing) {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      startFrom(sec);
    } else {
      secOffsetRef.current = sec;
      setActiveNotes(activeNotesAtSec(sec));
    }
  }, [playing, totalSec, startFrom, activeNotesAtSec]);

  // ── Speed change mid-play ───────────────────────────────────────────────────
  useEffect(() => {
    if (!playing) return;
    const elapsed = (performance.now() - playStartRef.current) / 1000;
    const sec = secOffsetRef.current + elapsed * speedRef.current;
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    startFrom(sec);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [speed]);

  // ── Sustain toggle mid-play: reschedule audio ────────────────────────────
  useEffect(() => {
    if (!playing) return;
    const elapsed = (performance.now() - playStartRef.current) / 1000;
    const sec = secOffsetRef.current + elapsed * speedRef.current;
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    startFrom(sec);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sustainOn]);

  // ── Cleanup ─────────────────────────────────────────────────────────────────
  useEffect(() => () => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    stopAudio();
  }, [stopAudio]);

  const fmt = (s: number) =>
    `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, "0")}`;

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <div className="bg-surface-1 rounded-2xl border border-surface-border p-5 space-y-4 w-full min-w-0">

      {/* Title + legend */}
      <div className="flex items-center justify-between flex-wrap gap-2 min-w-0">
        <div className="min-w-0">
          <p className="font-bold text-white text-base truncate">{data.title || "Sheet Music"}</p>
          <p className="text-xs text-gray-500">
            {data.timeSignature} · {data.tempo} BPM · {Math.round(totalSec)}s
          </p>
        </div>
        <div className="flex items-center gap-3 text-xs text-gray-500 shrink-0">
          <span className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-sm bg-brand-500 inline-block" />
            Right hand
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-sm bg-cyan-500 inline-block" />
            Left hand
          </span>
          {data.hasSustainEvents && (
            <button
              onClick={() => setSustainOn(v => !v)}
              title={sustainOn
                ? "Sustain pedal ON — click to disable"
                : "Sustain pedal OFF — click to enable"}
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

      {/* Piano keyboard */}
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

      {/* Controls */}
      <div className="pt-1 border-t border-surface-border space-y-2">

        {/* Row 1 — Play / Reset / Progress */}
        <div className="flex items-center gap-2">
          <button
            onClick={handlePlay}
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
            onClick={handleReset}
            className="p-1.5 rounded-xl text-gray-500 hover:text-gray-300 hover:bg-surface-3 transition-colors shrink-0"
          >
            <RotateCcw size={13} />
          </button>

          <span className="text-xs font-mono text-gray-600 shrink-0 w-9 text-right">
            {fmt(progress * totalSec)}
          </span>

          <div
            className="flex-1 h-1.5 bg-surface-3 rounded-full cursor-pointer relative overflow-hidden"
            onClick={handleSeek}
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

        {/* Row 2 — Speed */}
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs text-gray-600 shrink-0">Speed</span>
          <div className="flex flex-wrap gap-0.5 bg-surface-3 rounded-xl p-0.5 border border-surface-border max-w-full">
            {SPEEDS.map(s => (
              <button
                key={s}
                onClick={() => setSpeed(s)}
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
      </div>
    </div>
  );
}
