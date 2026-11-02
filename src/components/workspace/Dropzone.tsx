"use client";
import { AlertTriangle, Upload } from "lucide-react";
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
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const take = (list: FileList | File[] | null) => {
    if (!list) return;
    const files = Array.from(list);
    const tooBig = maxFileMb ? files.filter((f) => f.size > maxFileMb * 1024 * 1024) : [];
    const ok = files.filter((f) => !tooBig.includes(f));
    if (tooBig.length) {
      // Always tell the user; previously this was silent unless the tool passed onReject.
      const msg = `${tooBig[0].name} is larger than the ${maxFileMb} MB limit${tooBig.length > 1 ? ` (${tooBig.length} files skipped)` : ""}.`;
      setError(msg);
      onReject?.(msg);
    } else setError(null);
    if (ok.length) onFiles(multiple ? ok : ok.slice(0, 1));
    // Reset so choosing the same file again still fires "change".
    if (inputRef.current) inputRef.current.value = "";
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
      data-testid="dropzone"
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
        <button type="button" onClick={() => inputRef.current?.click()} className="inline-flex min-h-11 items-center font-medium underline-offset-4 hover:underline sm:min-h-0">
          Choose {multiple ? "files" : "a file"}
        </button>
        <span className="text-fg-muted"> or drop {multiple ? "them" : "it"} here · paste with Ctrl+V</span>
      </div>
      {hint && <p className="text-xs text-fg-muted">{hint}</p>}
      {error && (
        <p role="alert" className="flex items-center gap-2 text-sm text-red-700 dark:text-red-400">
          <AlertTriangle className="size-4" aria-hidden />
          {error}
        </p>
      )}
      {onSample && (
        <button type="button" onClick={onSample} className="inline-flex min-h-11 items-center text-xs text-fg-muted underline underline-offset-4 sm:min-h-0">
          Try a sample
        </button>
      )}
      <input data-testid="file-input" aria-label={multiple ? "Choose files" : "Choose a file"} ref={inputRef} type="file" accept={accept} multiple={multiple} className="sr-only" onChange={(e) => take(e.target.files)} />
    </div>
  );
}
