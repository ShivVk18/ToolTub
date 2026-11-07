"use client";
import { ArrowDown, ArrowUp, X } from "lucide-react";
import { formatBytes } from "@/lib/utils";

/** Several picked files in order, with move up/down and remove (Merge PDF, JPG to PDF). Keyboard-accessible buttons. */
export function FileList({
  files,
  onChange,
  noun,
}: {
  files: File[];
  onChange: (files: File[]) => void;
  noun: string;
}) {
  const move = (i: number, d: -1 | 1) => {
    const f = [...files];
    [f[i], f[i + d]] = [f[i + d], f[i]];
    onChange(f);
  };
  const total = files.reduce((s, f) => s + f.size, 0);
  return (
    <div data-testid="file-list" className="rounded-[20px] border border-line bg-soft p-2">
      <ol className="space-y-1">
        {files.map((f, i) => (
          <li
            key={`${f.name}-${f.size}-${f.lastModified}-${i}`}
            className="flex items-center gap-2 rounded-2xl bg-solid px-3 py-2 text-sm"
          >
            <span className="w-6 shrink-0 text-center font-mono text-xs text-ink2">{i + 1}</span>
            <span className="min-w-0 flex-1 truncate font-medium text-ink">{f.name}</span>
            <span className="shrink-0 text-xs text-ink2">{formatBytes(f.size)}</span>
            <button
              type="button"
              aria-label={`Move ${f.name} up`}
              disabled={i === 0}
              onClick={() => move(i, -1)}
              className="grid size-11 sm:size-9 place-items-center rounded-full text-ink2 hover:bg-soft disabled:opacity-30"
            >
              <ArrowUp className="size-4" aria-hidden />
            </button>
            <button
              type="button"
              aria-label={`Move ${f.name} down`}
              disabled={i === files.length - 1}
              onClick={() => move(i, 1)}
              className="grid size-11 sm:size-9 place-items-center rounded-full text-ink2 hover:bg-soft disabled:opacity-30"
            >
              <ArrowDown className="size-4" aria-hidden />
            </button>
            <button
              type="button"
              aria-label={`Remove ${f.name}`}
              onClick={() => onChange(files.filter((_, j) => j !== i))}
              className="grid size-11 sm:size-9 place-items-center rounded-full text-ink2 hover:bg-soft"
            >
              <X className="size-4" aria-hidden />
            </button>
          </li>
        ))}
      </ol>
      <p className="px-3 pt-2 text-xs text-ink2">
        {files.length} {noun}
        {files.length === 1 ? "" : "s"} · {formatBytes(total)} · in this order
      </p>
    </div>
  );
}
