"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { SheetNote } from "@/lib/sheetStore";
import { pitchToMidi, midiToSoundfontUrl, playSample } from "@/lib/pianoUtils";

export interface SamplerHandle {
  audioCtxRef:  React.MutableRefObject<AudioContext | null>;
  compRef:      React.MutableRefObject<DynamicsCompressorNode | null>;
  buffersRef:   React.MutableRefObject<Map<number, AudioBuffer>>;
  sourcesRef:   React.MutableRefObject<AudioScheduledSourceNode[]>;
  samplerReady: boolean;
  stopAudio:    () => void;
  scheduleNote: (
    midi: number,
    startTime: number,
    durSec: number,
    velocity: number,
  ) => void;
}

export function usePianoSampler(notes: SheetNote[]): SamplerHandle {
  const audioCtxRef = useRef<AudioContext | null>(null);
  const compRef     = useRef<DynamicsCompressorNode | null>(null);
  const buffersRef  = useRef<Map<number, AudioBuffer>>(new Map());
  const sourcesRef  = useRef<AudioScheduledSourceNode[]>([]);
  const [samplerReady, setSamplerReady] = useState(false);

  // Load samples once on mount — notes don't change after mount
  useEffect(() => {
    let cancelled = false;
    setSamplerReady(false);
    buffersRef.current = new Map();

    const ctx  = new AudioContext();
    const comp = ctx.createDynamicsCompressor();
    comp.threshold.setValueAtTime(-22, ctx.currentTime);
    comp.ratio.setValueAtTime(6, ctx.currentTime);
    const master = ctx.createGain();
    master.gain.value = 4.48; // 4× prior master (1.12); sheet piano bus
    comp.connect(master);
    master.connect(ctx.destination);
    audioCtxRef.current = ctx;
    compRef.current     = comp;

    // Collect unique MIDI numbers used by this piece
    const midiSet: Record<number, true> = {};
    notes.forEach(n => {
      const m = pitchToMidi(n.pitch);
      if (m >= 0) midiSet[m] = true;
    });
    const neededMidis = Object.keys(midiSet).map(Number);

    Promise.all(
      neededMidis.map(async (midi) => {
        try {
          const res = await fetch(midiToSoundfontUrl(midi));
          if (!res.ok) return;
          const ab  = await res.arrayBuffer();
          const buf = await ctx.decodeAudioData(ab);
          if (!cancelled) buffersRef.current.set(midi, buf);
        } catch { /* skip missing samples */ }
      })
    ).then(() => {
      if (!cancelled) setSamplerReady(true);
    });

    return () => {
      cancelled = true;
      ctx.close();
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
  // Intentionally run once — notes are stable after the page mounts

  const stopAudio = useCallback(() => {
    sourcesRef.current.forEach(s => { try { s.stop(); } catch {} });
    sourcesRef.current = [];
  }, []);

  const scheduleNote = useCallback((
    midi: number,
    startTime: number,
    durSec: number,
    velocity: number,
  ) => {
    const ctx    = audioCtxRef.current;
    const comp   = compRef.current;
    const buffer = buffersRef.current.get(midi);
    if (ctx && comp && buffer) {
      playSample(ctx, comp, buffer, startTime, durSec, velocity, sourcesRef.current);
    }
  }, []);

  return {
    audioCtxRef, compRef, buffersRef, sourcesRef,
    samplerReady, stopAudio, scheduleNote,
  };
}
