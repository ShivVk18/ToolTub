"use client";
import { AlertTriangle, ArrowUp } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import { acceptsFile } from "@/lib/engines/format";

interface DropzoneProps {
  accept: string; // e.g. "image/*" or ".heic,.heif"
  multiple?: boolean;
  maxFileMb?: number;
  onFiles: (files: File[]) => void;
  onReject?: (message: string) => void;
  hint?: string;
  /** What the tool takes, for the wrong-type message: "x.txt isn't a PDF." Defaults to "a supported file". */
  typeLabel?: string;
  /** Loads a sample file so people can try the tool instantly. */
  onSample?: () => void;
}

/** Drag-and-drop, paste (Ctrl/Cmd+V anywhere on the page) and the native file picker (mobile camera roll). */
export function Dropzone({
  accept,
  multiple,
  maxFileMb,
  onFiles,
  onReject,
  hint,
  typeLabel = "a supported file",
  onSample,
}: DropzoneProps) {
  const [over, setOver] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const take = (list: FileList | File[] | null) => {
    if (!list) return;
    const files = Array.from(list);
    // Check the type on selection: drag-and-drop and paste skip the input's accept filter, and a wrong
    // file used to fail only after the user pressed the primary action (Hallmark F7).
    const wrongType = files.filter((f) => !acceptsFile(accept, f));
    const tooBig = maxFileMb ? files.filter((f) => !wrongType.includes(f) && f.size > maxFileMb * 1024 * 1024) : [];
    const ok = files.filter((f) => !tooBig.includes(f) && !wrongType.includes(f));
    const skipped = wrongType.length + tooBig.length;
    const more = skipped > 1 ? ` (${skipped} files skipped)` : "";
    const msg = wrongType.length
      ? `${wrongType[0].name} isn't ${typeLabel}.${more}`
      : tooBig.length
        ? `${tooBig[0].name} is larger than the ${maxFileMb} MB limit${more}.`
        : null;
    // Always tell the user; previously this was silent unless the tool passed onReject.
    setError(msg);
    if (msg) onReject?.(msg);
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
        // Orb-tinted drop target in the home's language (Hallmark A6).
        "kk-drop flex flex-col items-center justify-center gap-3 rounded-[24px] border-2 border-dashed border-line2 px-6 py-10 text-center transition-colors",
        over && "border-accent bg-accent-soft",
      )}
    >
      <span className="kk-orb-mini" aria-hidden>
        <ArrowUp className="size-5" strokeWidth={2.5} />
      </span>
      <div>
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          className="inline-flex min-h-11 items-center font-medium underline-offset-4 hover:underline sm:min-h-0"
        >
          Choose {multiple ? "files" : "a file"}
        </button>
        <span className="text-fg-muted"> or drop {multiple ? "them" : "it"} here · paste with Ctrl+V</span>
      </div>
      {hint && <p className="text-xs text-fg-muted">{hint}</p>}
      {error && (
        <div role="alert" className="flex flex-col items-center gap-2">
          <p className="flex items-center gap-2 text-sm text-red-700 dark:text-red-400">
            <AlertTriangle className="size-4" aria-hidden />
            {error}
          </p>
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            className="inline-flex h-9 items-center rounded-full border border-line bg-solid px-4 text-xs font-medium text-ink hover:border-line2 hover:bg-soft"
          >
            Choose another file
          </button>
        </div>
      )}
      {onSample && (
        <button
          type="button"
          onClick={onSample}
          className="inline-flex min-h-11 items-center text-xs text-fg-muted underline underline-offset-4 sm:min-h-0"
        >
          Try a sample
        </button>
      )}
      <input
        data-testid="file-input"
        aria-label={multiple ? "Choose files" : "Choose a file"}
        ref={inputRef}
        type="file"
        accept={accept}
        multiple={multiple}
        className="sr-only"
        onChange={(e) => take(e.target.files)}
      />
    </div>
  );
}
