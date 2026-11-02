"use client";
import { Upload } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

interface DropzoneProps {
  accept: string; // e.g. "image/*" or ".heic,.heif"
  multiple?: boolean;
  maxFileMb?: number;
  onFiles: (files: File[]) => void;
  onReject?: (message: string) => void;
  hint?: string;
  /** Loads a sample file so people can try the tool instantly. */
  onSample?: () => void;
}

/** Drag-and-drop, paste (Ctrl/Cmd+V anywhere on the page) and the native file picker (mobile camera roll). */
export function Dropzone({ accept, multiple, maxFileMb, onFiles, onReject, hint, onSample }: DropzoneProps) {
  const [over, setOver] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const take = (list: FileList | File[] | null) => {
    if (!list) return;
    const files = Array.from(list);
    const tooBig = maxFileMb ? files.filter((f) => f.size > maxFileMb * 1024 * 1024) : [];
    if (tooBig.length) onReject?.(`${tooBig[0].name} is larger than ${maxFileMb} MB.`);
    const ok = files.filter((f) => !tooBig.includes(f));
    if (ok.length) onFiles(multiple ? ok : ok.slice(0, 1));
  };

  useEffect(() => {
    const onPaste = (e: ClipboardEvent) => {
      const files = Array.from(e.clipboardData?.files ?? []);
      if (files.length) take(files);
    };
    window.addEventListener("paste", onPaste);
    return () => window.removeEventListener("paste", onPaste);
  });

  return (
    <div
      onDragOver={(e) => {
        e.preventDefault();
        setOver(true);
      }}
      onDragLeave={() => setOver(false)}
      onDrop={(e) => {
        e.preventDefault();
        setOver(false);
        take(e.dataTransfer.files);
      }}
      className={cn(
        "flex flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed border-border px-6 py-10 text-center transition-colors",
        over && "border-fg bg-muted",
      )}
    >
      <Upload className="size-6 text-fg-muted" aria-hidden />
      <div>
        <button type="button" onClick={() => inputRef.current?.click()} className="font-medium underline-offset-4 hover:underline">
          Choose {multiple ? "files" : "a file"}
        </button>
        <span className="text-fg-muted"> or drop {multiple ? "them" : "it"} here · paste with Ctrl+V</span>
      </div>
      {hint && <p className="text-xs text-fg-muted">{hint}</p>}
      {onSample && (
        <button type="button" onClick={onSample} className="text-xs text-fg-muted underline underline-offset-4">
          Try a sample
        </button>
      )}
      <input ref={inputRef} type="file" accept={accept} multiple={multiple} className="sr-only" onChange={(e) => take(e.target.files)} />
    </div>
  );
}
