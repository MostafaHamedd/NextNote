"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { Mic, Square, Play, Trash2, Send } from "lucide-react";
import clsx from "clsx";

interface AudioRecorderProps {
  onAudioReady: (blob: Blob, label: string) => void;
  isAnalyzing: boolean;
}

export default function AudioRecorder({ onAudioReady, isAnalyzing }: AudioRecorderProps) {
  const [state, setState] = useState<"idle" | "recording" | "recorded">("idle");
  const [seconds, setSeconds] = useState(0);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [levels, setLevels] = useState<number[]>(Array(20).fill(3));

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const analyzerRef = useRef<AnalyserNode | null>(null);
  const animFrameRef = useRef<number | null>(null);
  const blobRef = useRef<Blob | null>(null);

  const updateLevels = useCallback(() => {
    if (!analyzerRef.current) return;
    const dataArray = new Uint8Array(analyzerRef.current.frequencyBinCount);
    analyzerRef.current.getByteFrequencyData(dataArray);

    const barCount = 20;
    const step = Math.floor(dataArray.length / barCount);
    const newLevels = Array.from({ length: barCount }, (_, i) => {
      const slice = dataArray.slice(i * step, (i + 1) * step);
      const avg = slice.reduce((a, b) => a + b, 0) / slice.length;
      return Math.max(3, Math.round((avg / 255) * 60));
    });

    setLevels(newLevels);
    animFrameRef.current = requestAnimationFrame(updateLevels);
  }, []);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const audioCtx = new AudioContext();
      const source = audioCtx.createMediaStreamSource(stream);
      const analyzer = audioCtx.createAnalyser();
      analyzer.fftSize = 256;
      source.connect(analyzer);
      analyzerRef.current = analyzer;

      const recorder = new MediaRecorder(stream);
      mediaRecorderRef.current = recorder;
      chunksRef.current = [];

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      recorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: "audio/webm" });
        blobRef.current = blob;
        const url = URL.createObjectURL(blob);
        setAudioUrl(url);
        setState("recorded");
        stream.getTracks().forEach((t) => t.stop());
        if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
        setLevels(Array(20).fill(3));
      };

      recorder.start();
      setState("recording");
      setSeconds(0);
      timerRef.current = setInterval(() => setSeconds((s) => s + 1), 1000);
      animFrameRef.current = requestAnimationFrame(updateLevels);
    } catch {
      alert("Microphone access denied. Please allow microphone access in your browser.");
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current?.state === "recording") {
      mediaRecorderRef.current.stop();
    }
    if (timerRef.current) clearInterval(timerRef.current);
  };

  const reset = () => {
    if (audioUrl) URL.revokeObjectURL(audioUrl);
    setAudioUrl(null);
    blobRef.current = null;
    setState("idle");
    setSeconds(0);
    setLevels(Array(20).fill(3));
  };

  const submit = () => {
    if (blobRef.current) onAudioReady(blobRef.current, `Recording ${formatTime(seconds)}`);
  };

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, []);

  const formatTime = (s: number) =>
    `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;

  return (
    <div className="flex flex-col items-center gap-6">
      {/* Visualizer */}
      <div className="relative flex items-center justify-center w-full h-20 gap-[3px]">
        {levels.map((h, i) => (
          <div
            key={i}
            className={clsx(
              "w-[5px] rounded-full transition-all duration-75",
              state === "recording"
                ? "bg-gradient-to-t from-brand-500 to-accent-purple"
                : "bg-surface-3"
            )}
            style={{ height: `${h}px` }}
          />
        ))}
        {state === "idle" && (
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-sm text-gray-600 font-medium">Press record to start</span>
          </div>
        )}
      </div>

      {/* Timer */}
      <div
        className={clsx(
          "font-mono text-3xl font-bold tracking-widest transition-colors",
          state === "recording" ? "text-red-400" : "text-gray-600"
        )}
      >
        {formatTime(seconds)}
        {state === "recording" && (
          <span className="inline-block w-2 h-2 rounded-full bg-red-500 ml-3 mb-1 animate-pulse" />
        )}
      </div>

      {/* Audio preview */}
      {audioUrl && (
        <audio controls src={audioUrl} className="w-full rounded-lg opacity-80 h-10" />
      )}

      {/* Controls */}
      <div className="flex items-center gap-3">
        {state === "idle" && (
          <button
            onClick={startRecording}
            className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-brand-600 to-accent-purple rounded-full font-semibold text-white hover:opacity-90 transition-all hover:scale-105 shadow-lg shadow-brand-900/40"
          >
            <Mic size={18} />
            Start Recording
          </button>
        )}

        {state === "recording" && (
          <button
            onClick={stopRecording}
            className="flex items-center gap-2 px-6 py-3 bg-red-600 hover:bg-red-500 rounded-full font-semibold text-white transition-all hover:scale-105 shadow-lg"
          >
            <Square size={18} />
            Stop
          </button>
        )}

        {state === "recorded" && (
          <>
            <button
              onClick={reset}
              className="flex items-center gap-2 px-4 py-3 bg-surface-3 hover:bg-surface-border rounded-full font-medium text-gray-400 hover:text-white transition-all"
            >
              <Trash2 size={16} />
              Redo
            </button>
            <button
              onClick={submit}
              disabled={isAnalyzing}
              className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-brand-600 to-accent-purple rounded-full font-semibold text-white hover:opacity-90 transition-all hover:scale-105 disabled:opacity-50 disabled:scale-100 shadow-lg shadow-brand-900/40"
            >
              <Send size={16} />
              {isAnalyzing ? "Analyzing..." : "Analyze"}
            </button>
          </>
        )}
      </div>
    </div>
  );
}
