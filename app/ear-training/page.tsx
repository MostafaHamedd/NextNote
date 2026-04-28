"use client";

import { useState, useRef, useEffect, useCallback, useMemo } from "react";
import Link from "next/link";
import { ArrowLeft, Play, Pause, Volume2, RotateCcw } from "lucide-react";
import clsx from "clsx";

// ── Note data ─────────────────────────────────────────────────────────────────
const NOTES = [
  { name: "C",  semitone: 0,  natural: true  },
  { name: "C#", semitone: 1,  natural: false },
  { name: "D",  semitone: 2,  natural: true  },
  { name: "D#", semitone: 3,  natural: false },
  { name: "E",  semitone: 4,  natural: true  },
  { name: "F",  semitone: 5,  natural: true  },
  { name: "F#", semitone: 6,  natural: false },
  { name: "G",  semitone: 7,  natural: true  },
  { name: "G#", semitone: 8,  natural: false },
  { name: "A",  semitone: 9,  natural: true  },
  { name: "A#", semitone: 10, natural: false },
  { name: "B",  semitone: 11, natural: true  },
];

// Pedagogical introduction order — most harmonically distinct first so the
// user can actually tell them apart when the pool is small.
// C  G  E  D  A  F  B  C# F# G# D# A#
const UNLOCK_ORDER = [0, 7, 4, 2, 9, 5, 11, 1, 6, 8, 3, 10];

const MIDI_C4 = 60;
const CORRECT_TO_UNLOCK = 5; // correct answers before the next note is introduced

// ── Piano synthesis ───────────────────────────────────────────────────────────
function synth(semitone: number, ctx: AudioContext, dur = 1.8) {
  const freq = 440 * 2 ** ((MIDI_C4 + semitone - 69) / 12);
  const now  = ctx.currentTime;

  const out = ctx.createGain();
  out.gain.setValueAtTime(0.5, now);
  out.gain.exponentialRampToValueAtTime(0.001, now + dur);
  out.connect(ctx.destination);

  // Fundamental + 4 harmonics give a piano-like timbre
  ([ [1, 0.5], [2, 0.2], [3, 0.1], [4, 0.05], [5, 0.02] ] as [number, number][])
    .forEach(([h, g]) => {
      const o  = ctx.createOscillator();
      const gn = ctx.createGain();
      o.frequency.value = freq * h;
      gn.gain.value = g;
      o.connect(gn);
      gn.connect(out);
      o.start(now);
      o.stop(now + dur);
    });
}

// ── Piano keyboard SVG ────────────────────────────────────────────────────────
const WW = 38;   // white key width
const WH = 92;   // white key height
const BW = 23;   // black key width
const BH = 56;   // black key height

const WHITE_SEMITONES = [0, 2, 4, 5, 7, 9, 11]; // C D E F G A B

// Black key center-x as a fraction of WW, then subtract BW/2 for rect x
const BLACK_DEFS = [
  { s: 1,  cx: WW * 0.68 },   // C#
  { s: 3,  cx: WW * 1.68 },   // D#
  { s: 6,  cx: WW * 3.68 },   // F#
  { s: 8,  cx: WW * 4.68 },   // G#
  { s: 10, cx: WW * 5.68 },   // A#
];

function Piano({
  active,
  highlighted = [],
  readonly = false,
  onKey,
  full = false,
}: {
  active: number | null;
  highlighted?: number[];
  readonly?: boolean;
  onKey: (s: number) => void;
  full?: boolean;
}) {
  const svgW = WW * 7;
  return (
    <svg
      viewBox={`0 0 ${svgW} ${WH}`}
      {...(full
        ? { style: { width: "100%", height: "auto", display: "block" } }
        : { width: svgW, height: WH })}
      aria-label="Piano keyboard"
    >
      {/* White keys */}
      {WHITE_SEMITONES.map((s, i) => {
        const isActive   = s === active;
        const isHigh     = highlighted.includes(s);
        return (
          <g key={s} style={{ cursor: readonly ? "default" : "pointer" }} onClick={() => !readonly && onKey(s)}>
            <rect
              x={i * WW + 0.5} y={0.5}
              width={WW - 1} height={WH - 1}
              rx={3}
              fill={isActive ? "#6366f1" : isHigh ? "#312e81" : "#e8e8f0"}
              stroke="#374151" strokeWidth={1}
            />
            <text
              x={i * WW + WW / 2} y={WH - 9}
              textAnchor="middle" fontSize={9}
              fill={isActive ? "white" : isHigh ? "#a5b4fc" : "#6b7280"}
              fontFamily="monospace"
              style={{ pointerEvents: "none", userSelect: "none" }}
            >
              {NOTES[s].name}
            </text>
          </g>
        );
      })}

      {/* Black keys — rendered last so they sit on top */}
      {BLACK_DEFS.map(({ s, cx }) => {
        const isActive = s === active;
        const isHigh   = highlighted.includes(s);
        return (
          <g key={s} style={{ cursor: readonly ? "default" : "pointer" }} onClick={() => !readonly && onKey(s)}>
            <rect
              x={cx - BW / 2} y={0}
              width={BW} height={BH}
              rx={2}
              fill={isActive ? "#818cf8" : isHigh ? "#4338ca" : "#111827"}
              stroke="#000" strokeWidth={1}
            />
            <text
              x={cx} y={BH - 9}
              textAnchor="middle" fontSize={7}
              fill={isActive ? "#312e81" : isHigh ? "#c7d2fe" : "#6b7280"}
              fontFamily="monospace"
              style={{ pointerEvents: "none", userSelect: "none" }}
            >
              {NOTES[s].name}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

// ── Question factory ───────────────────────────────────────────────────────────
function makeQuestion(pool: number[]) {
  const semitone = pool[Math.floor(Math.random() * pool.length)];
  const choices  = [...pool].sort(() => Math.random() - 0.5);
  return { semitone, choices };
}

function progressivePool(count: number) {
  return UNLOCK_ORDER.slice(0, count).map((i) => NOTES[i].semitone);
}

// ── Page ──────────────────────────────────────────────────────────────────────
type Phase    = "learn" | "practice" | "perfect";
type Feedback = "correct" | "wrong" | null;

export default function EarTrainingPage() {
  const ctxRef = useRef<AudioContext | null>(null);
  const getCtx = useCallback(() => {
    if (!ctxRef.current || ctxRef.current.state === "closed")
      ctxRef.current = new AudioContext();
    return ctxRef.current;
  }, []);

  // ── Learn phase ────────────────────────────────────────────────────────────
  const [phase,    setPhase]    = useState<Phase>("learn");
  const [learnIdx, setLearnIdx] = useState(0);
  const [autoPlay, setAutoPlay] = useState(false);
  const autoTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Play current note & schedule next when auto-playing
  useEffect(() => {
    if (!autoPlay) return;
    synth(NOTES[learnIdx].semitone, getCtx());
    autoTimerRef.current = setTimeout(() => {
      const next = learnIdx + 1;
      if (next >= 12) setAutoPlay(false);
      else            setLearnIdx(next);
    }, 2100);
    return () => { if (autoTimerRef.current) clearTimeout(autoTimerRef.current); };
  }, [autoPlay, learnIdx, getCtx]);

  const goLearn = useCallback((idx: number) => {
    setAutoPlay(false);
    setLearnIdx(idx);
    synth(NOTES[idx].semitone, getCtx());
  }, [getCtx]);

  // ── Practice phase ─────────────────────────────────────────────────────────
  const [unlockedCount, setUnlockedCount] = useState(2);
  const [correctCount,  setCorrectCount]  = useState(0);
  const [customPool,    setCustomPool]    = useState<number[] | null>(null);
  const [question,  setQuestion]  = useState(() => makeQuestion(progressivePool(2)));
  const [feedback,  setFeedback]  = useState<Feedback>(null);
  const [wrongGuess, setWrongGuess] = useState<number | null>(null);
  const [introNote, setIntroNote] = useState<{ semitone: number; name: string; nextCount: number } | null>(null);
  const fbTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const ask = useCallback((count: number, pool?: number[]) => {
    const p = pool ?? customPool ?? progressivePool(count);
    if (p.length === 0) return;
    const q = makeQuestion(p);
    setQuestion(q);
    synth(q.semitone, getCtx());
  }, [getCtx, customPool]);

  const startPractice = useCallback(() => {
    setPhase("practice");
    setTimeout(() => ask(unlockedCount), 300);
  }, [unlockedCount, ask]);

  const replay = useCallback(() => synth(question.semitone, getCtx()), [question, getCtx]);

  const confirmIntro = useCallback(() => {
    if (!introNote) return;
    setUnlockedCount(introNote.nextCount);
    setIntroNote(null);
    if (introNote.nextCount === 12) {
      setPhase("perfect");
      return;
    }
    ask(introNote.nextCount);
  }, [introNote, ask]);

  const guess = useCallback((semitone: number) => {
    if (feedback) return;

    if (semitone === question.semitone) {
      setFeedback("correct");
      const next = correctCount + 1;

      if (!customPool && next >= CORRECT_TO_UNLOCK && unlockedCount < 12) {
        // Progressive mode: threshold hit — introduce the new note before adding it
        const nextUnlocked = unlockedCount + 1;
        const newNote = NOTES[UNLOCK_ORDER[nextUnlocked - 1]];
        setCorrectCount(0);
        fbTimerRef.current = setTimeout(() => {
          setFeedback(null);
          setIntroNote({ semitone: newNote.semitone, name: newNote.name, nextCount: nextUnlocked });
        }, 600);
      } else {
        setCorrectCount(next);
        fbTimerRef.current = setTimeout(() => {
          setFeedback(null);
          ask(unlockedCount);
        }, 700);
      }
    } else {
      setFeedback("wrong");
      setWrongGuess(semitone);
      fbTimerRef.current = setTimeout(() => {
        setFeedback(null);
        setWrongGuess(null);
      }, 1100);
    }
  }, [feedback, question, correctCount, unlockedCount, customPool, ask]);

  const reset = useCallback(() => {
    if (autoTimerRef.current) clearTimeout(autoTimerRef.current);
    if (fbTimerRef.current)   clearTimeout(fbTimerRef.current);
    setPhase("learn");
    setLearnIdx(0);
    setAutoPlay(false);
    setUnlockedCount(2);
    setCorrectCount(0);
    setFeedback(null);
    setWrongGuess(null);
    setIntroNote(null);
    setCustomPool(null);
    setQuestion(makeQuestion(progressivePool(2)));
  }, []);

  useEffect(() => () => {
    if (autoTimerRef.current) clearTimeout(autoTimerRef.current);
    if (fbTimerRef.current)   clearTimeout(fbTimerRef.current);
    ctxRef.current?.close();
  }, []);

  // ── Derived ────────────────────────────────────────────────────────────────
  const learnHz      = (440 * 2 ** ((MIDI_C4 + NOTES[learnIdx].semitone - 69) / 12)).toFixed(0);
  const progressPct  = (correctCount / CORRECT_TO_UNLOCK) * 100;
  const nextToUnlock = unlockedCount < 12 ? NOTES[UNLOCK_ORDER[unlockedCount]].name : null;

  // Live pool — recalculated whenever selection changes
  const activePool = useMemo(
    () => customPool ?? progressivePool(unlockedCount),
    [customPool, unlockedCount]
  );

  // Choices always reflect the current pool; answer is injected if it was removed
  const displayChoices = useMemo(() => {
    const pool = activePool.includes(question.semitone)
      ? activePool
      : [...activePool, question.semitone];
    return [...pool].sort(() => Math.random() - 0.5);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activePool, question.semitone]);

  // ── Render ─────────────────────────────────────────────────────────────────
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
        <h1 className="text-lg font-semibold tracking-tight">Note Ear Training</h1>
        {phase !== "learn" && (
          <button
            onClick={reset}
            className="ml-auto flex items-center gap-1.5 text-xs text-[#5a5a70] hover:text-[#9999b0] transition-colors"
          >
            <RotateCcw size={12} />
            Start over
          </button>
        )}
      </header>

      <main className="flex-1 flex flex-col items-center px-4 py-10 gap-6 w-full">

        {/* ── Learn Phase ───────────────────────────────────────────────────── */}
        {phase === "learn" && (
          <div className="flex flex-col gap-6 w-full max-w-lg mx-auto">
            <p className="text-sm text-[#9999b0] text-center leading-relaxed">
              Listen to all 12 notes of the chromatic scale.<br />
              Click any key to hear it — then start the practice.
            </p>

            {/* Note card */}
            <div className="w-full rounded-2xl border border-[#2e2e3e] bg-[#16161d] p-8 flex flex-col items-center gap-5">
              <div
                className="text-8xl font-black tracking-tight text-white leading-none"
                style={{ fontFamily: "var(--font-mono)" }}
              >
                {NOTES[learnIdx].name}
              </div>
              <div className="text-xs text-[#5a5a70]">
                {learnHz} Hz &nbsp;·&nbsp; octave 4
              </div>

              {/* Keyboard */}
              <div className="mt-2 overflow-x-auto flex justify-center w-full">
                <Piano
                  active={NOTES[learnIdx].semitone}
                  onKey={(s) => goLearn(NOTES.findIndex(n => n.semitone === s))}
                />
              </div>

              {/* Dot scrubber */}
              <div className="flex gap-2 flex-wrap justify-center">
                {NOTES.map((n, i) => (
                  <button
                    key={i}
                    onClick={() => goLearn(i)}
                    title={n.name}
                    className={clsx(
                      "w-2.5 h-2.5 rounded-full transition-colors",
                      i === learnIdx ? "bg-indigo-500" : "bg-[#2e2e3e] hover:bg-[#4a4a60]"
                    )}
                  />
                ))}
              </div>
            </div>

            {/* Controls */}
            <div className="flex gap-3 w-full">
              <button
                onClick={() => goLearn((learnIdx - 1 + 12) % 12)}
                className="flex-1 py-2.5 rounded-xl border border-[#2e2e3e] text-sm text-[#9999b0] hover:text-[#e8e8f0] transition-colors"
              >
                ← Prev
              </button>

              <button
                onClick={() => {
                  if (autoPlay) { setAutoPlay(false); }
                  else          { setAutoPlay(true); }
                }}
                className={clsx(
                  "flex-1 py-2.5 rounded-xl text-sm font-medium transition-colors flex items-center justify-center gap-2",
                  autoPlay
                    ? "bg-[#2e2e3e] text-[#e8e8f0]"
                    : "bg-indigo-600 hover:bg-indigo-500 text-white"
                )}
              >
                {autoPlay ? <><Pause size={14} /> Stop</> : <><Play size={14} /> Play all</>}
              </button>

              <button
                onClick={() => goLearn((learnIdx + 1) % 12)}
                className="flex-1 py-2.5 rounded-xl border border-[#2e2e3e] text-sm text-[#9999b0] hover:text-[#e8e8f0] transition-colors"
              >
                Next →
              </button>
            </div>

            {/* Note picker */}
            <div className="w-full rounded-2xl border border-[#2e2e3e] bg-[#16161d] p-4 flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <p className="text-xs text-[#9999b0] font-medium">
                  {customPool === null
                    ? "Practice mode: progressive unlock"
                    : customPool.length === 0
                    ? "Select at least one note"
                    : `Custom: ${customPool.length} note${customPool.length > 1 ? "s" : ""} selected`}
                </p>
                <div className="flex gap-2">
                  <button
                    onClick={() => setCustomPool(null)}
                    className={clsx(
                      "text-[10px] px-2 py-1 rounded transition-colors",
                      customPool === null
                        ? "bg-indigo-600 text-white"
                        : "text-[#5a5a70] hover:text-[#9999b0]"
                    )}
                  >
                    Progressive
                  </button>
                  <button
                    onClick={() => setCustomPool(NOTES.map(n => n.semitone))}
                    className="text-[10px] px-2 py-1 rounded text-[#5a5a70] hover:text-[#9999b0] transition-colors"
                  >
                    All
                  </button>
                  <button
                    onClick={() => setCustomPool([])}
                    className="text-[10px] px-2 py-1 rounded text-[#5a5a70] hover:text-[#9999b0] transition-colors"
                  >
                    None
                  </button>
                </div>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {NOTES.map((n) => {
                  const selected = customPool !== null && customPool.includes(n.semitone);
                  return (
                    <button
                      key={n.semitone}
                      onClick={() => {
                        if (customPool === null) {
                          setCustomPool([n.semitone]);
                        } else if (selected) {
                          setCustomPool(customPool.filter(s => s !== n.semitone));
                        } else {
                          setCustomPool([...customPool, n.semitone]);
                        }
                      }}
                      style={{ fontFamily: "var(--font-mono)" }}
                      className={clsx(
                        "px-3 py-1.5 rounded-lg text-sm font-semibold transition-all border",
                        customPool === null
                          ? "bg-[#1e1e2a] border-[#2e2e3e] text-[#5a5a70]"
                          : selected
                          ? "bg-indigo-500/20 border-indigo-500/50 text-indigo-300"
                          : "bg-[#1e1e2a] border-[#2e2e3e] text-[#3a3a50] hover:text-[#9999b0] hover:border-[#3a3a50]"
                      )}
                    >
                      {n.name}
                    </button>
                  );
                })}
              </div>
            </div>

            <button
              onClick={startPractice}
              disabled={customPool !== null && customPool.length < 2}
              className="w-full py-3.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 disabled:cursor-not-allowed text-white font-semibold transition-colors"
            >
              {customPool !== null && customPool.length < 2
                ? "Select at least 2 notes"
                : "I'm ready — Start Practicing →"}
            </button>
          </div>
        )}

        {/* ── Practice Phase ────────────────────────────────────────────────── */}
        {phase === "practice" && (
          <div className="flex flex-col gap-6 w-full">

            {/* Top section: quiz + note pool side-by-side on desktop */}
            <div className="flex flex-col lg:flex-row gap-6 w-full max-w-5xl mx-auto">

            {/* ── Left: quiz column ── */}
            <div className="flex-1 flex flex-col gap-6 min-w-0">

              {/* Status row */}
              <div className="flex items-center justify-between text-sm">
                <span className="text-[#9999b0]">
                  {customPool !== null ? (
                    <>
                      <span className="text-indigo-400 font-semibold">Custom</span>
                      <span className="text-[#5a5a70]"> · {customPool.length} notes</span>
                    </>
                  ) : (
                    <>
                      <span className="text-white font-semibold">{unlockedCount}</span>
                      <span className="text-[#5a5a70]">/12</span> notes unlocked
                    </>
                  )}
                </span>
                <button
                  onClick={() => setPhase("learn")}
                  className="text-xs text-[#5a5a70] hover:text-[#9999b0] transition-colors"
                >
                  ← Change notes
                </button>
              </div>

              {/* Progress toward next unlock — hidden in custom mode */}
              {!customPool && nextToUnlock && (
                <div className="space-y-1.5">
                  <div className="flex justify-between text-xs text-[#5a5a70]">
                    <span>
                      Unlock{" "}
                      <span className="text-[#9999b0]" style={{ fontFamily: "var(--font-mono)" }}>
                        {nextToUnlock}
                      </span>
                    </span>
                    <span>{correctCount} / {CORRECT_TO_UNLOCK}</span>
                  </div>
                  <div className="h-1.5 w-full rounded-full bg-[#1e1e2a]">
                    <div
                      className="h-1.5 rounded-full bg-indigo-500 transition-all duration-300"
                      style={{ width: `${progressPct}%` }}
                    />
                  </div>
                </div>
              )}

              {/* Quiz card */}
              <div className={clsx(
                "rounded-2xl border p-8 flex flex-col items-center gap-6 transition-colors duration-200",
                feedback === "correct" ? "border-emerald-500/40 bg-emerald-500/5"
                : feedback === "wrong" ? "border-red-500/40 bg-red-500/5"
                : "border-[#2e2e3e] bg-[#16161d]"
              )}>

                {/* Play button */}
                <div className="flex items-end gap-4">
                  {/* Quiz note */}
                  <div className="flex flex-col items-center gap-2">
                    <button
                      onClick={replay}
                      className="w-20 h-20 rounded-full bg-indigo-600 hover:bg-indigo-500 flex items-center justify-center transition-all shadow-lg shadow-indigo-900/40 hover:scale-105 active:scale-95"
                    >
                      <Volume2 size={28} />
                    </button>
                    <span className="text-xs text-[#5a5a70]">Tap to replay</span>
                  </div>

                  {/* Reference note */}
                  <div className="flex flex-col items-center gap-2">
                    <button
                      onClick={() => synth(0, getCtx())}
                      className="w-11 h-11 rounded-full bg-[#1e1e2a] hover:bg-[#2e2e3e] border border-[#3a3a50] flex items-center justify-center transition-all hover:scale-105 active:scale-95"
                      title="Play reference note C4"
                    >
                      <Volume2 size={15} className="text-[#9999b0]" />
                    </button>
                    <span className="text-[10px] text-[#4a4a60]">Ref: C</span>
                  </div>
                </div>

                <p className="text-sm text-[#9999b0]">Which note did you hear?</p>

                {/* Choice buttons */}
                <div className="flex flex-wrap gap-2.5 justify-center">
                  {displayChoices.map((s) => {
                    const note     = NOTES.find(n => n.semitone === s)!;
                    const isAnswer = s === question.semitone;
                    const isWrong  = s === wrongGuess;
                    return (
                      <button
                        key={s}
                        onClick={() => guess(s)}
                        disabled={!!feedback}
                        style={{ fontFamily: "var(--font-mono)" }}
                        className={clsx(
                          "w-16 h-16 rounded-xl text-lg font-bold transition-all duration-150",
                          feedback && isAnswer
                            ? "bg-emerald-500 text-white scale-105"
                            : feedback && isWrong
                            ? "bg-red-500/80 text-white"
                            : feedback
                            ? "opacity-30 bg-[#1e1e2a] text-[#5a5a70]"
                            : "bg-[#1e1e2a] hover:bg-[#2e2e3e] text-[#e8e8f0] hover:scale-105 active:scale-95"
                        )}
                      >
                        {note.name}
                      </button>
                    );
                  })}
                </div>

                {/* Feedback text */}
                {feedback && (
                  <p className={clsx(
                    "text-sm font-medium",
                    feedback === "correct" ? "text-emerald-400" : "text-red-400"
                  )}>
                    {feedback === "correct"
                      ? "✓ Correct!"
                      : `✗  That was ${NOTES.find(n => n.semitone === question.semitone)!.name}`}
                  </p>
                )}
              </div>
            </div>

            {/* ── Right: note pool picker ── */}
            <div className="shrink-0 flex flex-col gap-3 lg:w-[290px] w-full">
              <div className={clsx(
                "rounded-2xl border p-4 flex flex-col gap-4 transition-colors duration-300",
                introNote ? "border-indigo-500/40 bg-indigo-500/5" : "border-[#2e2e3e] bg-[#16161d]"
              )}>

                {/* Header */}
                <div className="flex items-center justify-between gap-2">
                  <p className="text-xs font-medium text-[#9999b0]">
                    {introNote
                      ? <span className="text-indigo-400">New note ready — tap to add</span>
                      : customPool !== null
                      ? `Custom · ${customPool.length} note${customPool.length !== 1 ? "s" : ""}`
                      : "Progressive · tap to customise"}
                  </p>
                  {customPool !== null && (
                    <button
                      onClick={() => { setCustomPool(null); setIntroNote(null); }}
                      className="text-[10px] text-[#5a5a70] hover:text-[#9999b0] transition-colors shrink-0"
                    >
                      Reset
                    </button>
                  )}
                </div>

                {/* Hear intro note button */}
                {introNote && (
                  <button
                    onClick={() => synth(introNote.semitone, getCtx())}
                    className="flex items-center justify-center gap-2 px-3 py-2 rounded-xl bg-[#1e1e2a] hover:bg-[#2e2e3e] text-[#9999b0] hover:text-white text-xs transition-colors"
                  >
                    <Volume2 size={13} /> Hear {introNote.name}
                  </button>
                )}

                {/* Note chips */}
                <div className="flex flex-wrap gap-1.5">
                  {NOTES.map((n) => {
                    const isIntro  = introNote?.semitone === n.semitone;
                    const inPool   = customPool !== null
                      ? customPool.includes(n.semitone)
                      : progressivePool(unlockedCount).includes(n.semitone);

                    return (
                      <button
                        key={n.semitone}
                        style={{ fontFamily: "var(--font-mono)" }}
                        onClick={() => {
                          if (isIntro) {
                            // Add the pending note
                            if (customPool !== null) {
                              const next = [...customPool, n.semitone];
                              setCustomPool(next);
                              setIntroNote(null);
                            } else {
                              confirmIntro();
                            }
                          } else if (customPool !== null) {
                            const next = inPool
                              ? customPool.filter(s => s !== n.semitone)
                              : [...customPool, n.semitone];
                            setCustomPool(next);
                          } else {
                            // Switch progressive → custom, toggle this note
                            const base = progressivePool(unlockedCount);
                            const next = base.includes(n.semitone)
                              ? base.filter(s => s !== n.semitone)
                              : [...base, n.semitone];
                            setCustomPool(next);
                          }
                        }}
                        className={clsx(
                          "px-2.5 py-1.5 rounded-lg text-sm font-semibold transition-all border",
                          isIntro
                            ? "bg-indigo-500 border-indigo-400 text-white scale-105 shadow-lg shadow-indigo-900/40"
                            : inPool
                            ? "bg-indigo-500/20 border-indigo-500/50 text-indigo-300 hover:bg-indigo-500/30"
                            : "bg-[#1e1e2a] border-[#2e2e3e] text-[#3a3a50] hover:text-[#9999b0] hover:border-[#3a3a50]"
                        )}
                      >
                        {n.name}
                      </button>
                    );
                  })}
                </div>

                {/* Reference piano */}
                <div className="overflow-x-auto">
                  <Piano
                    active={introNote?.semitone ?? null}
                    highlighted={customPool ?? progressivePool(unlockedCount)}
                    readonly
                    onKey={() => {}}
                  />
                </div>
              </div>
            </div>

            </div>{/* end top section */}

            {/* Full-width reference piano */}
            <div className="flex flex-col gap-2 w-full">
              <p className="text-xs text-[#4a4a60] px-1">Play any note</p>
              <Piano
                full
                active={null}
                onKey={(s) => synth(s, getCtx())}
              />
            </div>

          </div>
        )}

        {/* ── Note Perfection ───────────────────────────────────────────────── */}
        {phase === "perfect" && (
          <div className="flex-1 flex flex-col items-center justify-center gap-8 text-center py-16">
            <div className="text-7xl select-none">🎓</div>

            <div className="space-y-3">
              <h2 className="text-3xl font-bold text-white">Note Perfection</h2>
              <p className="text-[#9999b0] text-sm leading-relaxed max-w-xs mx-auto">
                You can identify all 12 notes of the chromatic scale by ear.<br />
                That's a skill most musicians never fully develop.
              </p>
            </div>

            {/* All 12 chips lit up */}
            <div className="flex flex-wrap justify-center gap-1.5">
              {NOTES.map(n => (
                <span
                  key={n.semitone}
                  style={{ fontFamily: "var(--font-mono)" }}
                  className="px-2.5 py-1 rounded-lg bg-indigo-500/20 border border-indigo-500/30 text-xs text-indigo-300"
                >
                  {n.name}
                </span>
              ))}
            </div>

            <button
              onClick={reset}
              className="px-6 py-3 rounded-xl bg-[#2e2e3e] hover:bg-[#3a3a4e] text-[#e8e8f0] font-medium transition-colors flex items-center gap-2"
            >
              <RotateCcw size={16} />
              Start over
            </button>
          </div>
        )}

      </main>
    </div>
  );
}
