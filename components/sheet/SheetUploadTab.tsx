"use client";

import { useCallback, useRef, useState } from "react";
import { Upload, FileText, Music } from "lucide-react";
import clsx from "clsx";

const ACCEPTED = [".pdf", ".png", ".jpg", ".jpeg", ".webp"];

interface Props {
  onFileReady: (file: File) => void;
}

export default function SheetUploadTab({ onFileReady }: Props) {
  const inputRef              = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const [file, setFile]         = useState<File | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);

  const handleFile = useCallback(
    (f: File) => {
      const ext = "." + f.name.split(".").pop()!.toLowerCase();
      if (!ACCEPTED.includes(ext)) {
        setFileError(`Unsupported type. Accepted: ${ACCEPTED.join(", ")}`);
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

  const isPDF = file?.name.toLowerCase().endsWith(".pdf");

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
              {isPDF
                ? <FileText size={32} className="text-brand-400" />
                : <Music    size={32} className="text-brand-400" />}
            </div>
            <div>
              <p className="font-semibold text-white">{file.name}</p>
              <p className="text-sm text-gray-500 mt-0.5">
                {(file.size / 1024).toFixed(0)} KB
                {isPDF && " · PDF (multi-page supported)"}
              </p>
            </div>
            <button
              onClick={e => { e.stopPropagation(); setFile(null); onFileReady(null as any); }}
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
              <p className="font-semibold text-gray-300">Drop sheet music here</p>
              <p className="text-sm text-gray-500 mt-1">PDF, PNG, JPG, WEBP</p>
            </div>
          </div>
        )}
      </div>

      {fileError && (
        <p className="mt-2 text-sm text-red-400">{fileError}</p>
      )}
    </>
  );
}
