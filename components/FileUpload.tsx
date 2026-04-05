"use client";

import { useState, useRef, useEffect, DragEvent, ChangeEvent } from "react";
import { Upload, FileAudio, X, Send } from "lucide-react";
import clsx from "clsx";

interface FileUploadProps {
  onFileSelected: (file: File) => void;
  isAnalyzing: boolean;
}

const ACCEPTED = ".wav,.mp3,.m4a,.ogg,.flac,.aiff,.webm";

export default function FileUpload({ onFileSelected, isAnalyzing }: FileUploadProps) {
  const [dragOver, setDragOver] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFile = (file: File) => {
    if (audioUrl) URL.revokeObjectURL(audioUrl);
    setSelectedFile(file);
    setAudioUrl(URL.createObjectURL(file));
  };

  const reset = () => {
    if (audioUrl) URL.revokeObjectURL(audioUrl);
    setAudioUrl(null);
    setSelectedFile(null);
    // reset the file input so the same file can be re-selected
    if (inputRef.current) inputRef.current.value = "";
  };

  const submit = () => {
    if (selectedFile) onFileSelected(selectedFile);
  };

  useEffect(() => {
    return () => {
      if (audioUrl) URL.revokeObjectURL(audioUrl);
    };
  }, [audioUrl]);

  const onDrop = (e: DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) handleFile(file);
  };

  const onChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
  };

  const formatSize = (bytes: number) => {
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
  };

  return (
    <div className="flex flex-col gap-4">
      {/* Drop zone — always visible so user can swap file */}
      <div
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={onDrop}
        onClick={() => !isAnalyzing && inputRef.current?.click()}
        className={clsx(
          "relative border-2 border-dashed rounded-2xl p-6 transition-all cursor-pointer group",
          dragOver
            ? "border-brand-500 bg-brand-500/8"
            : selectedFile
            ? "border-surface-border hover:border-brand-600/40 hover:bg-brand-500/5"
            : "border-surface-border hover:border-brand-600/50 hover:bg-brand-500/5"
        )}
      >
        <input
          ref={inputRef}
          type="file"
          accept={ACCEPTED}
          onChange={onChange}
          className="hidden"
        />

        {!selectedFile ? (
          <div className="flex flex-col items-center gap-3 text-center">
            <div className={clsx(
              "p-4 rounded-2xl transition-all",
              dragOver ? "bg-brand-500/20" : "bg-surface-3 group-hover:bg-brand-500/10"
            )}>
              <Upload size={26} className={clsx(
                "transition-colors",
                dragOver ? "text-brand-400" : "text-gray-500 group-hover:text-brand-400"
              )} />
            </div>
            <div>
              <p className="text-gray-300 font-medium">
                {dragOver ? "Drop it!" : "Drop your audio file here"}
              </p>
              <p className="text-gray-600 text-sm mt-1">or click to browse · WAV, MP3, M4A, FLAC, OGG</p>
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-brand-500/15 rounded-xl shrink-0">
              <FileAudio size={20} className="text-brand-400" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-gray-200 font-medium text-sm truncate">{selectedFile.name}</p>
              <p className="text-gray-500 text-xs">{formatSize(selectedFile.size)} · click to swap file</p>
            </div>
            {!isAnalyzing && (
              <button
                onClick={(e) => { e.stopPropagation(); reset(); }}
                className="p-1.5 rounded-lg hover:bg-surface-3 text-gray-500 hover:text-gray-300 transition-colors shrink-0"
              >
                <X size={15} />
              </button>
            )}
          </div>
        )}
      </div>

      {/* Audio preview player */}
      {audioUrl && (
        <audio
          controls
          src={audioUrl}
          className="w-full h-10 rounded-xl opacity-80"
        />
      )}

      {/* Analyze button — only shown when a file is ready */}
      {selectedFile && (
        <button
          onClick={submit}
          disabled={isAnalyzing}
          className="flex items-center justify-center gap-2 w-full py-3 bg-gradient-to-r from-brand-600 to-accent-purple rounded-full font-semibold text-white hover:opacity-90 transition-all hover:scale-[1.02] disabled:opacity-50 disabled:scale-100 shadow-lg shadow-brand-900/40"
        >
          <Send size={16} />
          {isAnalyzing ? "Analyzing..." : "Analyze"}
        </button>
      )}
    </div>
  );
}
