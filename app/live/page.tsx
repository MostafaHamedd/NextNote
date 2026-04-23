"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import Link from "next/link";
import { Mic, MicOff, ArrowLeft, Music, Music2, Guitar, ChevronDown } from "lucide-react";
import clsx from "clsx";
import dynamic from "next/dynamic";

// Mount the fretboard only when the toggle is on (saves render cost)
const NoteFretboard = dynamic(() => import("@/components/NoteFretboard"), { ssr: false });

// ── Client-side MIDI → note name ─────────────────────────────────────────────
const _MIDI_NAMES = ["C","C#","D","D#","E","F","F#","G","G#","A","A#","B"];
function midiToNote(midi: number): string {
  const idx    = ((midi % 12) + 12) % 12;
  const octave = Math.floor((midi - 12) / 12);
  return `${_MIDI_NAMES[idx]}${octave}`;
}

// ── Note-mode (pitchy) thresholds ────────────────────────────────────────────
const CLARITY_VOICED  = 0.85;
const CLARITY_SILENT  = 0.50;
const NOTE_THROTTLE_MS = 80;   // ~12 state updates / second

// ── Chord-mode (browser chroma + templates) ───────────────────────────────────
const CHORD_THROTTLE_MS = 150; // ~6 Hz
const CHORD_HISTORY_K   = 3;   // majority-vote window

const _CHORD_INTERVALS: Record<string, number[]> = {
  "":     [0, 4, 7],
  "m":    [0, 3, 7],
  "7":    [0, 4, 7, 10],
  "maj7": [0, 4, 7, 11],
  "m7":   [0, 3, 7, 10],
  "dim":  [0, 3, 6],
  "aug":  [0, 4, 8],
  "sus4": [0, 5, 7],
  "sus2": [0, 2, 7],
};
const _NOTE_COUNT_BONUS = 0.012;
const _CHORD_THRESHOLD  = 0.62;

// Pre-build normalised templates once at module load
const _CHORD_TEMPLATES = Object.entries(_CHORD_INTERVALS).map(([quality, ivs]) => {
  const t = new Float32Array(12);
  for (const s of ivs) t[s % 12] = 1;
  const norm = Math.sqrt(t.reduce((a, v) => a + v * v, 0));
  if (norm > 0) for (let i = 0; i < 12; i++) t[i] /= norm;
  return { quality, template: t, nNotes: ivs.length };
});

function _computeChroma(analyser: AnalyserNode): Float32Array {
  const buf    = new Float32Array(analyser.frequencyBinCount);
  analyser.getFloatFrequencyData(buf);          // dB values
  const sr     = analyser.context.sampleRate;
  const binHz  = sr / analyser.fftSize;
  const chroma = new Float32Array(12);

  for (let i = 1; i < buf.length; i++) {
    const freq = i * binHz;
    if (freq < 80 || freq > 4000) continue;
    const power = Math.pow(10, buf[i] / 10);   // dB → linear power
    const midi  = 12 * Math.log2(freq / 440) + 69;
    const cls   = ((Math.round(midi) % 12) + 12) % 12;
    chroma[cls] += power;
  }

  const norm = Math.sqrt(chroma.reduce((a, v) => a + v * v, 0));
  if (norm > 1e-8) for (let i = 0; i < 12; i++) chroma[i] /= norm;
  return chroma;
}

function _matchChord(chroma: Float32Array): { chord: string; confidence: number } {
  let best = -Infinity;
  let bestChord = "N.C.";

  for (let root = 0; root < 12; root++) {
    for (const { quality, template, nNotes } of _CHORD_TEMPLATES) {
      let dot = 0;
      for (let i = 0; i < 12; i++) dot += chroma[(i + root) % 12] * template[i];
      const score = dot + nNotes * _NOTE_COUNT_BONUS;
      if (score > best) {
        best = score;
        const n = _MIDI_NAMES[root];
        bestChord = quality === "" ? n : `${n}${quality}`;
      }
    }
  }

  if (best < _CHORD_THRESHOLD) return { chord: "N.C.", confidence: 0 };
  const conf = Math.min(1, (best - _CHORD_THRESHOLD) / (1 - _CHORD_THRESHOLD));
  return { chord: bestChord, confidence: Math.round(conf * 100) / 100 };
}

// ── Chord parser ───────────────────────────────────────────────────────────────
const QUALITY_META: Record<string, { name: string; color: string; character: string }> = {
  "":     { name: "Major",         color: "text-amber-400",   character: "Bright · Stable · Happy"          },
  "m":    { name: "Minor",         color: "text-indigo-400",  character: "Dark · Melancholic · Emotional"   },
  "7":    { name: "Dominant 7th",  color: "text-orange-400",  character: "Bluesy · Tense · Wants to resolve"},
  "maj7": { name: "Major 7th",     color: "text-emerald-400", character: "Smooth · Jazzy · Dreamy"          },
  "m7":   { name: "Minor 7th",     color: "text-purple-400",  character: "Mellow · Soulful · Jazzy"         },
  "dim":  { name: "Diminished",    color: "text-red-400",     character: "Tense · Unstable · Eerie"         },
  "aug":  { name: "Augmented",     color: "text-pink-400",    character: "Floating · Ambiguous · Dreamy"    },
  "sus4": { name: "Suspended 4th", color: "text-cyan-400",    character: "Open · Unresolved · Anticipating" },
  "sus2": { name: "Suspended 2nd", color: "text-teal-400",    character: "Airy · Spacious · Minimal"        },
};

function parseChord(chord: string): {
  root: string; suffix: string;
  name: string; color: string; character: string; tones: string[];
} | null {
  if (chord === "N.C." || chord === "--") return null;

  // Try longest suffix first
  for (const suffix of ["maj7", "m7", "sus4", "sus2", "dim", "aug", "m", "7", ""]) {
    if (chord.endsWith(suffix)) {
      const root = chord.slice(0, chord.length - suffix.length);
      if (!root) continue;
      const rootIdx = _MIDI_NAMES.indexOf(root);
      if (rootIdx === -1) continue;
      const intervals = _CHORD_INTERVALS[suffix] ?? [0, 4, 7];
      const tones = intervals.map(iv => _MIDI_NAMES[(rootIdx + iv) % 12]);
      const meta  = QUALITY_META[suffix] ?? QUALITY_META[""];
      return { root, suffix, tones, ...meta };
    }
  }
  return null;
}

const LS_KEY         = "nn_live_show_fretboard";
const LS_OCTAVE_KEY  = "nn_live_show_octave";

type Mode = "note" | "chord";

interface NoteResult  { note: string; midi: number; confidence: number }
interface ChordResult { chord: string; confidence: number }

// ── Confidence bar ─────────────────────────────────────────────────────────────
function ConfidenceBar({ value }: { value: number }) {
  const pct = Math.round(value * 100);
  const color = pct >= 70 ? "bg-emerald-500" : pct >= 40 ? "bg-amber-400" : "bg-red-500";
  return (
    <div className="w-full space-y-1">
      <div className="flex justify-between text-xs text-[#9999b0]">
        <span>Confidence</span>
        <span>{pct}%</span>
      </div>
      <div className="h-2 w-full rounded-full bg-[#1e1e2a]">
        <div
          className={clsx("h-2 rounded-full transition-all duration-200", color)}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

// ── Theory corner ──────────────────────────────────────────────────────────────
const CHROMATIC   = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];
const NATURALS    = new Set(["C", "D", "E", "F", "G", "A", "B"]);

const OCTAVE_STEPS = [
  { note: "E2", label: "Low E string — open",              tag: true,  hz: "82 Hz"  },
  { note: "E3", label: "One octave up",                    tag: false, hz: "165 Hz" },
  { note: "E4", label: "High E string — open",             tag: true,  hz: "330 Hz" },
  { note: "E5", label: "Fretted territory above open strings", tag: false, hz: "659 Hz" },
];

const FRET_TIPS = [
  { label: "Lower fret",    desc: "Brighter, easier to bend", color: "text-emerald-400" },
  { label: "Higher fret",   desc: "Warmer, tighter space",    color: "text-amber-400"   },
  { label: "Thicker string", desc: "Fuller, more sustain",    color: "text-indigo-400"  },
  { label: "Thinner string", desc: "Crisper, more attack",    color: "text-purple-400"  },
];

function TheoryCorner() {
  const [open, setOpen] = useState(false);

  return (
    <div className="w-full">
      {/* Toggle */}
      <button
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="w-full flex items-center justify-between px-4 py-3.5 rounded-xl border border-[#2e2e3e] bg-[#16161d] text-sm text-[#9999b0] hover:text-[#e8e8f0] hover:border-indigo-500/30 transition-all"
      >
        <span className="flex items-center gap-2.5">
          <span className="text-base select-none">🌙</span>
          <span className="font-medium text-[#c0c0d8]">What do these labels mean?</span>
          <span className="text-[#4a4a60] text-xs hidden sm:inline">— theory for guitar beginners</span>
        </span>
        <ChevronDown
          size={14}
          className={clsx("transition-transform duration-200 shrink-0", open && "rotate-180")}
        />
      </button>

      {/* Panel */}
      {open && (
        <div className="mt-2 rounded-xl border border-[#2e2e3e] bg-[#16161d] overflow-hidden divide-y divide-[#1e1e2a]">

          {/* ── 1. Anatomy of a note name ────────────────────────────────── */}
          <section className="px-5 py-5 space-y-4">
            <h3 className="text-[10px] font-bold uppercase tracking-widest text-indigo-400">
              Reading the display
            </h3>
            <p className="text-sm text-[#9999b0] leading-relaxed">
              Every result is two things glued together — the note letter and its octave number.
            </p>

            {/* Visual split card */}
            <div className="flex rounded-xl overflow-hidden border border-[#2e2e3e] max-w-xs">
              <div className="flex-1 px-5 py-4 bg-[#1a1a2e] text-center">
                <div
                  style={{ fontFamily: "var(--font-mono)" }}
                  className="text-5xl font-black text-white leading-none"
                >
                  A
                </div>
                <div className="text-[10px] font-bold uppercase tracking-widest text-indigo-300 mt-2">
                  Pitch class
                </div>
                <div className="text-xs text-[#5a5a70] mt-0.5">which note</div>
              </div>
              <div className="w-px bg-[#2e2e3e]" />
              <div className="flex-1 px-5 py-4 bg-[#13131e] text-center">
                <div
                  style={{ fontFamily: "var(--font-mono)" }}
                  className="text-5xl font-black text-indigo-300 leading-none"
                >
                  3
                </div>
                <div className="text-[10px] font-bold uppercase tracking-widest text-purple-300 mt-2">
                  Octave
                </div>
                <div className="text-xs text-[#5a5a70] mt-0.5">which floor</div>
              </div>
            </div>
          </section>

          {/* ── 2. Octave ladder ──────────────────────────────────────────── */}
          <section className="px-5 py-5 space-y-4">
            <h3 className="text-[10px] font-bold uppercase tracking-widest text-purple-400">
              Octaves — same note, different height
            </h3>
            <p className="text-sm text-[#9999b0] leading-relaxed">
              Double the frequency and you land on the same note one octave up — same
              character, just sitting on a higher floor of the building.
            </p>

            <div className="space-y-0">
              {OCTAVE_STEPS.map(({ note, label, tag, hz }, i) => (
                <div key={note} className="flex items-start gap-3">
                  {/* Note label */}
                  <div className="w-9 pt-0.5 text-right shrink-0">
                    <span
                      style={{ fontFamily: "var(--font-mono)" }}
                      className={clsx(
                        "text-sm font-bold",
                        tag ? "text-white" : "text-[#5a5a70]"
                      )}
                    >
                      {note}
                    </span>
                  </div>

                  {/* Connecting line + dot */}
                  <div className="flex flex-col items-center shrink-0 self-stretch pt-1">
                    <div
                      className={clsx(
                        "w-2.5 h-2.5 rounded-full shrink-0",
                        tag ? "bg-indigo-500 shadow-[0_0_6px_2px_rgba(99,102,241,0.4)]" : "bg-[#2e2e3e]"
                      )}
                    />
                    {i < OCTAVE_STEPS.length - 1 && (
                      <div className="w-px flex-1 bg-[#2e2e3e] my-1" style={{ minHeight: 14 }} />
                    )}
                  </div>

                  {/* Description */}
                  <div className="flex flex-col pb-3 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs text-[#9999b0]">{label}</span>
                      {tag && (
                        <span className="text-[10px] font-medium bg-indigo-500/15 text-indigo-300 border border-indigo-500/25 px-1.5 py-0.5 rounded-full leading-none">
                          open string
                        </span>
                      )}
                    </div>
                    <span className="text-[11px] text-[#4a4a60] mt-0.5">{hz}</span>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* ── 3. The 12 notes ───────────────────────────────────────────── */}
          <section className="px-5 py-5 space-y-4">
            <h3 className="text-[10px] font-bold uppercase tracking-widest text-emerald-400">
              The 12 notes — then it loops
            </h3>
            <p className="text-sm text-[#9999b0] leading-relaxed">
              Western music uses exactly 12 distinct pitches. Hit the 13th and you're back at
              the start — one octave higher. Every song ever written uses only these.
            </p>

            <div className="flex flex-wrap gap-1.5">
              {CHROMATIC.map((n) => (
                <span
                  key={n}
                  style={{ fontFamily: "var(--font-mono)" }}
                  className={clsx(
                    "px-2.5 py-1 rounded-lg text-xs font-semibold border transition-colors",
                    NATURALS.has(n)
                      ? "bg-[#1e1e2e] text-[#c0c0d8] border-[#3a3a5e]"
                      : "bg-[#141420] text-[#5a5a78] border-[#252535]"
                  )}
                >
                  {n}
                </span>
              ))}
              <span className="px-2.5 py-1 rounded-lg text-xs text-[#3a3a50] border border-dashed border-[#252535] flex items-center gap-1">
                C <span className="text-[#2a2a40]">↩</span>
              </span>
            </div>

            {/* # and ♭ explainer */}
            <div className="space-y-2">
              <div className="flex gap-2">
                <div className="flex-1 bg-[#0f0f13] border border-[#1e1e2a] rounded-lg px-3 py-2.5">
                  <span style={{ fontFamily: "var(--font-mono)" }} className="text-sm font-bold text-white">#</span>
                  <span className="text-xs text-[#9999b0] ml-2">sharp — up one semitone</span>
                  <div className="text-[11px] text-[#4a4a60] mt-1">
                    C → C# &nbsp;·&nbsp; one small step higher
                  </div>
                </div>
                <div className="flex-1 bg-[#0f0f13] border border-[#1e1e2a] rounded-lg px-3 py-2.5">
                  <span style={{ fontFamily: "var(--font-mono)" }} className="text-sm font-bold text-white">♭</span>
                  <span className="text-xs text-[#9999b0] ml-2">flat — down one semitone</span>
                  <div className="text-[11px] text-[#4a4a60] mt-1">
                    D → D♭ &nbsp;·&nbsp; one small step lower
                  </div>
                </div>
              </div>
              <p className="text-[11px] text-[#4a4a60] leading-relaxed">
                C# and D♭ are the <span className="text-[#6a6a80]">same pitch</span> — two names for one sound. Which name gets used depends on the key of the song.
              </p>
            </div>
          </section>

          {/* ── 4. Why the same note appears everywhere ───────────────────── */}
          <section className="px-5 py-5 space-y-4">
            <h3 className="text-[10px] font-bold uppercase tracking-widest text-amber-400">
              Why the same note shows up multiple times on the neck
            </h3>
            <p className="text-sm text-[#9999b0] leading-relaxed">
              Guitar is unusual — the same pitch can live in 4, 5, even 6 different spots.
              They're all correct. The choice is about tone, comfort, and what your hand is
              already doing nearby.
            </p>

            <div className="grid grid-cols-2 gap-2">
              {FRET_TIPS.map(({ label, desc, color }) => (
                <div
                  key={label}
                  className="bg-[#0f0f13] rounded-lg px-3 py-3 border border-[#1e1e2a] space-y-0.5"
                >
                  <div className={clsx("text-xs font-semibold", color)}>{label}</div>
                  <div className="text-[11px] text-[#5a5a70] leading-snug">{desc}</div>
                </div>
              ))}
            </div>

            <p className="text-xs text-[#4a4a60] leading-relaxed">
              When you see the fretboard light up above, every dot is a valid choice for
              the detected note. Start with the lowest fret you can reach comfortably.
            </p>
          </section>

        </div>
      )}
    </div>
  );
}

// ── Page ───────────────────────────────────────────────────────────────────────
export default function LivePage() {
  const [mode, setMode]       = useState<Mode>("note");
  const [running, setRunning] = useState(false);
  const [error, setError]     = useState<string | null>(null);
  const [noteResult, setNoteResult]   = useState<NoteResult>({ note: "--", midi: 0, confidence: 0 });
  const [chordResult, setChordResult] = useState<ChordResult>({ chord: "N.C.", confidence: 0 });

  // Fretboard toggle — persisted in localStorage
  const [showFretboard, setShowFretboard] = useState(false);
  useEffect(() => {
    try { setShowFretboard(localStorage.getItem(LS_KEY) === "1"); } catch {}
  }, []);
  const toggleFretboard = useCallback(() => {
    setShowFretboard((v) => {
      const next = !v;
      try { localStorage.setItem(LS_KEY, next ? "1" : "0"); } catch {}
      return next;
    });
  }, []);

  // Octave toggle — show "F4" vs "F", persisted in localStorage
  const [showOctave, setShowOctave] = useState(true);
  useEffect(() => {
    try { setShowOctave(localStorage.getItem(LS_OCTAVE_KEY) !== "0"); } catch {}
  }, []);
  const toggleOctave = useCallback(() => {
    setShowOctave((v) => {
      const next = !v;
      try { localStorage.setItem(LS_OCTAVE_KEY, next ? "1" : "0"); } catch {}
      return next;
    });
  }, []);

  // ── Refs ───────────────────────────────────────────────────────────────────
  const modeRef = useRef<Mode>(mode);
  useEffect(() => { modeRef.current = mode; }, [mode]);

  // Audio graph (shared by both modes)
  const audioCtxRef = useRef<AudioContext | null>(null);
  const streamRef   = useRef<MediaStream | null>(null);

  // Note mode — pitchy runs entirely in the browser via requestAnimationFrame
  const analyserRef    = useRef<AnalyserNode | null>(null);
  const rafRef         = useRef<number | null>(null);
  const rafThrottleRef = useRef<number>(0);

  // Chord mode — browser-side chroma + template matching
  const chordAnalyserRef = useRef<AnalyserNode | null>(null);
  const chordRafRef      = useRef<number | null>(null);
  const chordThrottleRef = useRef<number>(0);
  const chordHistoryRef  = useRef<string[]>([]);

  // ── Pitchy note-detection loop ─────────────────────────────────────────────
  const startPitchLoop = useCallback(async (analyser: AnalyserNode) => {
    const { PitchDetector } = await import("pitchy");
    const detector = PitchDetector.forFloat32Array(analyser.fftSize);
    const buf      = new Float32Array(detector.inputLength);

    function loop() {
      analyser.getFloatTimeDomainData(buf);
      const [pitch, clarity] = detector.findPitch(buf, analyser.context.sampleRate);

      const now = performance.now();
      if (now - rafThrottleRef.current > NOTE_THROTTLE_MS) {
        rafThrottleRef.current = now;

        if (clarity >= CLARITY_VOICED && pitch > 70 && pitch < 1400) {
          const midi = Math.round(12 * Math.log2(pitch / 440) + 69);
          setNoteResult({ note: midiToNote(midi), midi, confidence: Math.round(clarity * 100) / 100 });
        } else if (clarity < CLARITY_SILENT) {
          setNoteResult({ note: "--", midi: 0, confidence: 0 });
        }
        // between thresholds → hold last value to avoid flicker
      }

      rafRef.current = requestAnimationFrame(loop);
    }

    rafRef.current = requestAnimationFrame(loop);
  }, []);

  // ── Chord detection loop ───────────────────────────────────────────────────
  const startChordLoop = useCallback((analyser: AnalyserNode) => {
    function loop() {
      const now = performance.now();
      if (now - chordThrottleRef.current > CHORD_THROTTLE_MS) {
        chordThrottleRef.current = now;

        const chroma = _computeChroma(analyser);
        const result = _matchChord(chroma);

        // K-frame majority vote to debounce flickering
        const hist = chordHistoryRef.current;
        hist.push(result.chord);
        if (hist.length > CHORD_HISTORY_K) hist.shift();

        const counts: Record<string, number> = {};
        for (const c of hist) counts[c] = (counts[c] ?? 0) + 1;
        const winner = hist.reduce((a, b) => (counts[a] ?? 0) >= (counts[b] ?? 0) ? a : b);

        setChordResult({ chord: winner, confidence: winner === "N.C." ? 0 : result.confidence });
      }

      chordRafRef.current = requestAnimationFrame(loop);
    }

    chordRafRef.current = requestAnimationFrame(loop);
  }, []);

  // ── Switch tab ─────────────────────────────────────────────────────────────
  const switchMode = useCallback((m: Mode) => {
    setMode(m);
    chordHistoryRef.current = [];
  }, []);

  // ── Start ──────────────────────────────────────────────────────────────────
  const start = useCallback(async () => {
    setError(null);

    let stream: MediaStream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
    } catch (err: unknown) {
      setError(
        err instanceof Error && err.name === "NotAllowedError"
          ? "Microphone access denied — allow mic access in your browser settings."
          : "Could not access microphone."
      );
      return;
    }
    streamRef.current = stream;

    const ctx = new AudioContext();
    audioCtxRef.current = ctx;
    const source = ctx.createMediaStreamSource(stream);

    // Note analyser — small FFT, no smoothing (pitchy wants raw frames)
    const noteAnalyser = ctx.createAnalyser();
    noteAnalyser.fftSize = 2048;
    noteAnalyser.smoothingTimeConstant = 0;
    source.connect(noteAnalyser);
    analyserRef.current = noteAnalyser;
    await startPitchLoop(noteAnalyser);

    // Chord analyser — large FFT, heavy smoothing for ~1 s time-average
    const chordAnalyser = ctx.createAnalyser();
    chordAnalyser.fftSize = 8192;
    chordAnalyser.smoothingTimeConstant = 0.85;
    source.connect(chordAnalyser);
    chordAnalyserRef.current = chordAnalyser;
    startChordLoop(chordAnalyser);

    setRunning(true);
  }, [startPitchLoop, startChordLoop]);

  // ── Stop ───────────────────────────────────────────────────────────────────
  const stop = useCallback(() => {
    if (rafRef.current !== null)      { cancelAnimationFrame(rafRef.current); rafRef.current = null; }
    if (chordRafRef.current !== null) { cancelAnimationFrame(chordRafRef.current); chordRafRef.current = null; }
    analyserRef.current      = null;
    chordAnalyserRef.current = null;
    audioCtxRef.current?.close(); audioCtxRef.current = null;
    streamRef.current?.getTracks().forEach((t) => t.stop()); streamRef.current = null;
    chordHistoryRef.current = [];
    setRunning(false);
    setNoteResult({ note: "--", midi: 0, confidence: 0 });
    setChordResult({ chord: "N.C.", confidence: 0 });
  }, []);

  useEffect(() => () => { stop(); }, [stop]);

  // ── Render ─────────────────────────────────────────────────────────────────
  const isNote      = mode === "note";
  const activeMidi  = isNote && noteResult.note !== "--" ? noteResult.midi : null;
  const displayNote  = noteResult.note === "--"
    ? "--"
    : showOctave
      ? noteResult.note
      : noteResult.note.replace(/\d+$/, "");
  const displayChord = chordResult.chord;
  const isSilent     = isNote ? noteResult.note === "--" : displayChord === "N.C.";
  const parsedChord  = !isNote ? parseChord(displayChord) : null;

  return (
    <div className="min-h-screen bg-[#0f0f13] text-[#e8e8f0] flex flex-col">
      {/* Header */}
      <header className="border-b border-[#1e1e2a] px-6 py-4 flex items-center gap-4">
        <Link
          href="/analyze"
          className="flex items-center gap-2 text-[#9999b0] hover:text-[#e8e8f0] transition-colors text-sm"
        >
          <ArrowLeft size={16} />
          Back
        </Link>
        <h1 className="text-lg font-semibold tracking-tight">Live Detector</h1>
        {running && (
          <span className="ml-auto flex items-center gap-1.5 text-xs text-emerald-400">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            Live
          </span>
        )}
      </header>

      {/* Body */}
      <main className={clsx(
        "flex-1 flex flex-col items-center px-4 py-10 gap-6 mx-auto w-full",
        isNote ? "max-w-lg" : "max-w-2xl"
      )}>

        {/* Tab bar */}
        <div className="flex w-full rounded-xl overflow-hidden border border-[#2e2e3e] bg-[#16161d]">
          <button
            onClick={() => switchMode("note")}
            className={clsx(
              "flex-1 flex items-center justify-center gap-2 py-3 text-sm font-medium transition-colors",
              isNote ? "bg-indigo-600 text-white" : "text-[#9999b0] hover:text-[#e8e8f0]"
            )}
          >
            <Music size={16} />
            Note
          </button>
          <button
            onClick={() => switchMode("chord")}
            className={clsx(
              "flex-1 flex items-center justify-center gap-2 py-3 text-sm font-medium transition-colors",
              !isNote ? "bg-indigo-600 text-white" : "text-[#9999b0] hover:text-[#e8e8f0]"
            )}
          >
            <Music2 size={16} />
            Chord
          </button>
        </div>

        {/* Hint */}
        <p className="text-xs text-[#9999b0] text-center -mt-2">
          {isNote
            ? "Play one note at a time — works best on clean single-string input."
            : "Strum a chord — works best on full strums with clear harmonics."}
        </p>

        {/* ── HUD ── */}
        {isNote ? (
          /* Note HUD — unchanged */
          <div className="w-full flex flex-col items-center gap-6 rounded-2xl border border-[#2e2e3e] bg-[#16161d] p-8">
            <div
              className={clsx(
                "font-bold tracking-tight transition-all duration-200 select-none",
                isSilent ? "text-6xl text-[#4a4a60]" : "text-7xl text-white"
              )}
              style={{ fontFamily: "var(--font-mono)" }}
              aria-live="polite" aria-atomic="true"
            >
              {displayNote}
            </div>

            <div className="flex items-center gap-1 rounded-lg border border-[#2e2e3e] bg-[#0f0f13] p-1 text-xs">
              <button
                onClick={() => !showOctave && toggleOctave()}
                className={clsx("px-3 py-1 rounded-md font-medium transition-colors",
                  showOctave ? "bg-indigo-600 text-white" : "text-[#9999b0] hover:text-[#e8e8f0]")}
              >Note + Octave</button>
              <button
                onClick={() => showOctave && toggleOctave()}
                className={clsx("px-3 py-1 rounded-md font-medium transition-colors",
                  !showOctave ? "bg-indigo-600 text-white" : "text-[#9999b0] hover:text-[#e8e8f0]")}
              >Note only</button>
            </div>

            <div className="w-full max-w-xs">
              <ConfidenceBar value={noteResult.confidence} />
            </div>

            {!running && (
              <p className="text-sm text-[#9999b0]">
                Press <span className="text-white font-medium">Start</span> and play something.
              </p>
            )}
          </div>
        ) : (
          /* Chord HUD — rich two-column layout */
          <div className="w-full rounded-2xl border border-[#2e2e3e] bg-[#16161d] overflow-hidden">
            <div className="flex flex-col sm:flex-row">

              {/* Left: big chord display */}
              <div className="flex-1 flex flex-col items-center justify-center gap-4 p-8 border-b sm:border-b-0 sm:border-r border-[#2e2e3e]">
                {isSilent ? (
                  <div className="text-6xl font-bold text-[#4a4a60] select-none" style={{ fontFamily: "var(--font-mono)" }}
                    aria-live="polite" aria-atomic="true">
                    N.C.
                  </div>
                ) : parsedChord ? (
                  <>
                    {/* Root + suffix */}
                    <div className="flex items-start gap-1 leading-none select-none" aria-live="polite" aria-atomic="true">
                      <span className="text-8xl font-black text-white" style={{ fontFamily: "var(--font-mono)" }}>
                        {parsedChord.root}
                      </span>
                      {parsedChord.suffix && (
                        <span className="text-3xl font-bold text-indigo-300 mt-3" style={{ fontFamily: "var(--font-mono)" }}>
                          {parsedChord.suffix}
                        </span>
                      )}
                    </div>

                    {/* Type badge */}
                    <div className={clsx("text-xs font-bold uppercase tracking-widest", parsedChord.color)}>
                      {parsedChord.name}
                    </div>
                  </>
                ) : (
                  <div className="text-7xl font-black text-white select-none" style={{ fontFamily: "var(--font-mono)" }}
                    aria-live="polite" aria-atomic="true">
                    {displayChord}
                  </div>
                )}

                <div className="w-full max-w-[200px]">
                  <ConfidenceBar value={chordResult.confidence} />
                </div>

                {!running && (
                  <p className="text-sm text-[#9999b0] text-center">
                    Press <span className="text-white font-medium">Start</span> and strum a chord.
                  </p>
                )}
              </div>

              {/* Right: chord info */}
              <div className="w-full sm:w-56 flex flex-col gap-5 p-6 justify-center">
                {parsedChord && !isSilent ? (
                  <>
                    {/* Character */}
                    <div className="flex flex-col gap-1">
                      <p className="text-[10px] text-[#4a4a60] uppercase tracking-wider font-medium">Character</p>
                      <p className={clsx("text-sm font-medium leading-snug", parsedChord.color)}>
                        {parsedChord.character}
                      </p>
                    </div>

                    {/* Chord tones */}
                    <div className="flex flex-col gap-2">
                      <p className="text-[10px] text-[#4a4a60] uppercase tracking-wider font-medium">Notes</p>
                      <div className="flex flex-wrap gap-1.5">
                        {parsedChord.tones.map((t, i) => (
                          <span
                            key={i}
                            style={{ fontFamily: "var(--font-mono)" }}
                            className={clsx(
                              "px-2.5 py-1 rounded-lg text-xs font-semibold border",
                              i === 0
                                ? "bg-indigo-500/20 border-indigo-500/40 text-indigo-200"
                                : "bg-[#1e1e2a] border-[#2e2e3e] text-[#9999b0]"
                            )}
                          >
                            {t}
                          </span>
                        ))}
                      </div>
                    </div>

                    {/* Interval labels */}
                    <div className="flex flex-col gap-2">
                      <p className="text-[10px] text-[#4a4a60] uppercase tracking-wider font-medium">Intervals</p>
                      <div className="flex flex-wrap gap-1">
                        {(_CHORD_INTERVALS[parsedChord.suffix] ?? []).map((iv, i) => {
                          const labels: Record<number, string> = {
                            0: "Root", 2: "2nd", 3: "b3rd", 4: "3rd",
                            5: "4th", 6: "b5", 7: "5th", 8: "#5", 10: "b7", 11: "7th",
                          };
                          return (
                            <span key={i} className="text-[10px] px-1.5 py-0.5 rounded bg-[#1e1e2a] text-[#5a5a70]">
                              {labels[iv] ?? iv}
                            </span>
                          );
                        })}
                      </div>
                    </div>
                  </>
                ) : (
                  <p className="text-sm text-[#4a4a60] text-center">
                    {running ? "Listening…" : "Start to detect chords"}
                  </p>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Fretboard toggle — Note tab only */}
        {isNote && (
          <div className="w-full">
            <button
              onClick={toggleFretboard}
              aria-expanded={showFretboard}
              className="flex items-center gap-2 text-xs text-[#9999b0] hover:text-[#e8e8f0] transition-colors mb-3"
            >
              <Guitar size={14} />
              {showFretboard ? "Hide fretboard" : "Show fretboard"}
            </button>

            {showFretboard && (
              <NoteFretboard primaryMidi={activeMidi} />
            )}
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="w-full rounded-xl border border-red-800 bg-red-950/40 px-4 py-3 text-sm text-red-300">
            {error}
          </div>
        )}

        {/* Controls */}
        {!running ? (
          <button
            onClick={start}
            className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-medium transition-colors"
          >
            <Mic size={18} />
            Start
          </button>
        ) : (
          <button
            onClick={stop}
            className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-[#2e2e3e] hover:bg-[#3a3a4e] text-[#e8e8f0] font-medium transition-colors"
          >
            <MicOff size={18} />
            Stop
          </button>
        )}

        <p className="text-xs text-[#5a5a70] text-center">
          Best in Chrome or Firefox — Safari may have microphone quirks.
        </p>

        <TheoryCorner />
      </main>
    </div>
  );
}
