"use client";

import { useCallback, useRef, useState } from "react";
import { Upload, Music2 } from "lucide-react";
import clsx from "clsx";

const ACCEPTED = [".mid", ".midi"];

interface Props {
  onFileReady: (file: File | null) => void;
}

export default function MidiUploadTab({ onFileReady }: Props) {
  const inputRef                = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const [file, setFile]         = useState<File | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);

  const handleFile = useCallback(
    (f: File) => {
      const ext = "." + f.name.split(".").pop()!.toLowerCase();
      if (!ACCEPTED.includes(ext)) {
        setFileError("Only .mid and .midi files are supported.");
        return;
      }
      setFile(f);
      setFileError(null);
      onFileReady(f);
    },
    [onFileReady],
  );

  const onDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragging(false);
      const f = e.dataTransfer.files[0];
      if (f) handleFile(f);
    },
    [handleFile],
  );

  return (
    <>
      <div
        onDragOver={e => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
        onClick={() => !file && inputRef.current?.click()}
        className={clsx(
          "relative rounded-3xl border-2 border-dashed transition-all p-10 text-center",
          file
            ? "border-brand-500/60 bg-brand-500/5 cursor-default"
            : dragging
            ? "border-brand-400 bg-brand-500/10 scale-[1.01] cursor-copy"
            : "border-surface-border bg-surface-1 hover:border-brand-500/40 hover:bg-brand-500/5 cursor-pointer",
        )}
      >
        <input
          ref={inputRef}
          type="file"
          accept={ACCEPTED.join(",")}
          className="hidden"
          onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f); }}
        />

        {file ? (
          <div className="flex flex-col items-center gap-3">
            <div className="p-4 bg-brand-600/20 rounded-2xl">
              <Music2 size={32} className="text-brand-400" />
            </div>
            <div>
              <p className="font-semibold text-white">{file.name}</p>
              <p className="text-sm text-gray-500 mt-0.5">
                {(file.size / 1024).toFixed(1)} KB · MIDI file
              </p>
            </div>
            <button
              onClick={e => { e.stopPropagation(); setFile(null); onFileReady(null); }}
              className="text-xs text-gray-500 hover:text-gray-300 underline mt-1"
            >
              Change file
            </button>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-3">
            <div className="p-4 bg-surface-3 rounded-2xl">
              <Upload size={28} className="text-gray-400" />
            </div>
            <div>
              <p className="font-semibold text-gray-300">Drop a MIDI file here</p>
              <p className="text-sm text-gray-500 mt-1">.mid · .midi</p>
            </div>
          </div>
        )}
      </div>

      {fileError && (
        <p className="mt-2 text-sm text-red-400">{fileError}</p>
      )}

      <div className="mt-4 bg-surface-1 rounded-2xl border border-surface-border p-4">
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-widest mb-2">How it works</p>
        <ul className="space-y-1 text-xs text-gray-500">
          <li className="flex items-start gap-2"><span className="text-brand-400 mt-0.5">•</span>Upload any standard MIDI file (.mid)</li>
          <li className="flex items-start gap-2"><span className="text-brand-400 mt-0.5">•</span>Both hands are detected from tracks or channels</li>
          <li className="flex items-start gap-2"><span className="text-brand-400 mt-0.5">•</span>Tempo changes and sustain pedal are fully supported</li>
        </ul>
      </div>
    </>
  );
}
