"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { SheetNote } from "@/lib/sheetStore";
import { pitchToMidi } from "@/lib/pianoUtils";
import { SamplerHandle } from "./usePianoSampler";

export const SPEEDS         = [0.25, 0.5, 0.75, 1, 1.25, 1.5, 1.75, 2, 2.5, 3] as const;
export type  Speed          = typeof SPEEDS[number];
const        LOOKAHEAD_SEC  = 0.4;
const        SCHED_INTERVAL = 40;

export interface PlaybackHandle {
  playing:         boolean;
  progress:        number;
  scoreTimeSec:    number;
  speed:           Speed;
  sustainOn:       boolean;
  activeNotes:     Map<string, "left" | "right">;
  handlePlay:      () => void;
  handleReset:     () => void;
  handleSeek:      (e: React.MouseEvent<HTMLDivElement>) => void;
  handleSeekTo:    (frac: number) => void;
  setSpeed:        (s: Speed) => void;
  setSustainOn:    (v: boolean | ((prev: boolean) => boolean)) => void;
}

export function usePianoPlayback(
  sortedNotes: SheetNote[],
  totalSec: number,
  hasSustain: boolean,
  sampler: SamplerHandle,
): PlaybackHandle {
  const [playing, setPlaying]       = useState(false);
  const [progress, setProgress]     = useState(0);
  const [scoreTimeSec, setScoreTimeSec] = useState(0);
  const [speed, setSpeed]           = useState<Speed>(1);
  const [sustainOn, setSustainOn]   = useState(hasSustain);
  const [activeNotes, setActiveNotes] = useState<Map<string, "left" | "right">>(new Map());

  // Use a ref for sampler so callbacks always get the latest without re-creating
  const samplerRef      = useRef(sampler);
  samplerRef.current    = sampler;

  const playStartRef    = useRef(0);
  const secOffsetRef    = useRef(0);
  const speedRef        = useRef<Speed>(1);
  const sustainRef      = useRef(sustainOn);
  const totalSecRef     = useRef(totalSec);
  const sortedNotesRef  = useRef(sortedNotes);
  const rafRef          = useRef<number | null>(null);
  const schedIntRef     = useRef<ReturnType<typeof setInterval> | null>(null);
  const nextSchedIdxRef = useRef(0);

  // Keep refs in sync with latest values — zero re-render cost
  speedRef.current      = speed;
  sustainRef.current    = sustainOn;
  totalSecRef.current   = totalSec;
  sortedNotesRef.current = sortedNotes;

  // ── Reset scheduler index when notes array identity changes (e.g. hand filter) ─
  useEffect(() => {
    // Recalculate correct start index for current playback position
    const notes = sortedNotes;
    const currentSec = secOffsetRef.current;
    let idx = 0;
    while (idx < notes.length && notes[idx].startSec < currentSec - 0.01) idx++;
    nextSchedIdxRef.current = idx;

    if (!playing) {
      setActiveNotes(activeNotesAtSec(currentSec));
      return;
    }
    // If playing, restart from current position with new note set
    const elapsed = (performance.now() - playStartRef.current) / 1000;
    const sec = secOffsetRef.current + elapsed * speedRef.current;
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    startFrom(sec);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sortedNotes]);

  // ── Active notes at a given position ────────────────────────────────────────
  const activeNotesAtSec = useCallback((currentSec: number) => {
    const notes  = sortedNotesRef.current;
    const active = new Map<string, "left" | "right">();
    for (const note of notes) {
      if (note.startSec > currentSec + 0.05) break;
      const dur = sustainRef.current ? note.durationSec : note.durationSecRaw;
      if (currentSec < note.startSec + dur) {
        active.set(note.pitch, note.hand as "left" | "right");
      }
    }
    return active;
  }, []); // stable — reads from refs

  // ── Lookahead scheduler ──────────────────────────────────────────────────────
  const runScheduler = useCallback(() => {
    const s   = samplerRef.current;
    const ctx = s.audioCtxRef.current;
    if (!ctx || !s.buffersRef.current.size) return;

    const spd        = speedRef.current;
    const elapsed    = (performance.now() - playStartRef.current) / 1000;
    const currentSec = secOffsetRef.current + elapsed * spd;
    const schedUntil = currentSec + LOOKAHEAD_SEC * spd;
    const audioNow   = ctx.currentTime + 0.02;
    const notes      = sortedNotesRef.current;

    let idx = nextSchedIdxRef.current;
    while (idx < notes.length) {
      const note = notes[idx];
      if (note.startSec > schedUntil) break;
      const midi = pitchToMidi(note.pitch);
      if (midi >= 0) {
        const secFromNow = (note.startSec - currentSec) / spd;
        const tAudio     = audioNow + Math.max(0, secFromNow);
        const noteDur    = sustainRef.current ? note.durationSec : note.durationSecRaw;
        const durSec     = Math.max(0.05, noteDur / spd);
        const vel        = Math.min(1, (note.velocity ?? 80) / 127);
        s.scheduleNote(midi, tAudio, durSec, vel);
      }
      idx++;
    }
    nextSchedIdxRef.current = idx;
  }, []); // stable — reads from refs

  // ── rAF tick ─────────────────────────────────────────────────────────────────
  const tick = useCallback(() => {
    const elapsed    = (performance.now() - playStartRef.current) / 1000;
    const currentSec = secOffsetRef.current + elapsed * speedRef.current;
    const total      = totalSecRef.current;

    setProgress(Math.min(1, currentSec / total));
    setScoreTimeSec(currentSec);
    setActiveNotes(activeNotesAtSec(currentSec));

    if (currentSec < total) {
      rafRef.current = requestAnimationFrame(tick);
    } else {
      setPlaying(false);
      setProgress(1);
      setActiveNotes(new Map());
    }
  }, [activeNotesAtSec]); // stable

  // ── Start from position ───────────────────────────────────────────────────────
  const startFrom = useCallback((fromSec: number) => {
    // Always stop existing audio + clear interval before starting fresh
    if (schedIntRef.current) { clearInterval(schedIntRef.current); schedIntRef.current = null; }
    samplerRef.current.stopAudio();

    let idx = 0;
    const notes = sortedNotesRef.current;
    while (idx < notes.length && notes[idx].startSec < fromSec - 0.01) idx++;
    nextSchedIdxRef.current = idx;
    playStartRef.current    = performance.now();
    secOffsetRef.current    = fromSec;
    setScoreTimeSec(fromSec);

    const ctx = samplerRef.current.audioCtxRef.current;
    if (ctx?.state === "suspended") ctx.resume();

    runScheduler();
    schedIntRef.current = setInterval(runScheduler, SCHED_INTERVAL);
    rafRef.current = requestAnimationFrame(tick);
  }, [runScheduler, tick]); // stable refs — no sampler/sortedNotes dep needed

  // ── Play / Pause ──────────────────────────────────────────────────────────────
  const handlePlay = useCallback(() => {
    if (playing) {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      if (schedIntRef.current) { clearInterval(schedIntRef.current); schedIntRef.current = null; }
      samplerRef.current.stopAudio();
      const elapsed = (performance.now() - playStartRef.current) / 1000;
      secOffsetRef.current += elapsed * speedRef.current;
      setPlaying(false);
      setProgress(Math.min(1, secOffsetRef.current / totalSecRef.current));
      setScoreTimeSec(secOffsetRef.current);
      setActiveNotes(activeNotesAtSec(secOffsetRef.current));
    } else {
      startFrom(secOffsetRef.current);
      setPlaying(true);
    }
  }, [playing, startFrom, activeNotesAtSec]);

  // ── Reset ─────────────────────────────────────────────────────────────────────
  const handleReset = useCallback(() => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    if (schedIntRef.current) { clearInterval(schedIntRef.current); schedIntRef.current = null; }
    samplerRef.current.stopAudio();
    secOffsetRef.current = 0;
    setPlaying(false);
    setProgress(0);
    setScoreTimeSec(0);
    setActiveNotes(new Map());
  }, []);

  // ── Seek ──────────────────────────────────────────────────────────────────────
  const handleSeekTo = useCallback((frac: number) => {
    const sec = Math.max(0, Math.min(1, frac)) * totalSecRef.current;
    setProgress(Math.max(0, Math.min(1, frac)));
    if (playing) {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      startFrom(sec);
    } else {
      secOffsetRef.current = sec;
      setScoreTimeSec(sec);
      setActiveNotes(activeNotesAtSec(sec));
    }
  }, [playing, startFrom, activeNotesAtSec]);

  const handleSeek = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    handleSeekTo((e.clientX - rect.left) / rect.width);
  }, [handleSeekTo]);

  // ── Restart when speed or sustain changes mid-play ───────────────────────────
  useEffect(() => {
    if (!playing) return;
    const elapsed = (performance.now() - playStartRef.current) / 1000;
    const sec = secOffsetRef.current + elapsed * speedRef.current;
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    startFrom(sec);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [speed, sustainOn]);

  // ── Cleanup ───────────────────────────────────────────────────────────────────
  useEffect(() => () => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    if (schedIntRef.current) clearInterval(schedIntRef.current);
    samplerRef.current.stopAudio();
  }, []);

  return {
    playing, progress, scoreTimeSec, speed, sustainOn, activeNotes,
    handlePlay, handleReset, handleSeek, handleSeekTo, setSpeed, setSustainOn,
  };
}
