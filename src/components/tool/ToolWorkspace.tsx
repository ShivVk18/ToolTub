"use client";
import { AlertTriangle, Loader2 } from "lucide-react";
import { useCallback, useState, useSyncExternalStore, type ReactNode } from "react";
import { Button } from "@/components/ui/button";

export type RunStatus = "idle" | "working" | "done" | "error";
export interface RunError {
  cause: string;
  fix?: string;
}

/** State machine shared by every tool: idle → working (progress) → done | error. */
export function useToolRun<T>() {
  const [status, setStatus] = useState<RunStatus>("idle");
  const [progress, setProgress] = useState<{ ratio?: number; label?: string } | null>(null);
  const [error, setError] = useState<RunError | null>(null);
  const [result, setResult] = useState<T | null>(null);

  const run = useCallback(
    async (fn: (onProgress: typeof setProgress) => Promise<T>, toError?: (e: Error) => RunError) => {
      setStatus("working");
      setError(null);
      setProgress(null);
      try {
        const r = await fn(setProgress);
        setResult(r);
        setStatus("done");
        return r;
      } catch (e) {
        const err = e instanceof Error ? e : new Error(String(e));
        setError(toError?.(err) ?? { cause: err.message });
        setStatus("error");
      }
    },
    [],
  );

  const reset = useCallback(() => {
    setStatus("idle");
    setResult(null);
    setError(null);
  }, []);

  return { status, progress, error, result, run, reset, setResult };
}

export interface ToolWorkspaceProps {
  /** 3. Input zone: <Dropzone>, a text area, or a form. */
  input: ReactNode;
  /** 4. Simple settings with sensible defaults. */
  settings?: ReactNode;
  /** 4b. Advanced options, collapsed by default. */
  advanced?: ReactNode;
  /** 5. The one primary action. Omit for live tools (JSON formatter, QR) that update as you type. */
  action?: { label: string; onClick: () => void; disabled?: boolean };
  status: RunStatus;
  progress?: { ratio?: number; label?: string } | null;
  error?: RunError | null;
  /** File tools: clears the file so the error offers "Choose another file" (Hallmark F7). */
  onRetry?: () => void;
  /** 6–7. Success state: preview, before/after, Download / Copy / Send to next tool. */
  result?: ReactNode;
}

/**
 * The single workspace template every tool uses (brief §4.2, items 3–7).
 * Items 1–2 (H1, privacy badge) and 8–9 (related tools, SEO block) are rendered by the server page,
 * so they are in the HTML even before JavaScript runs.
 */
const noop = () => () => {};
/** false during server render and hydration, true once React is interactive. */
const useInteractive = () =>
  useSyncExternalStore(
    noop,
    () => true,
    () => false,
  );

export function ToolWorkspace({
  input,
  settings,
  advanced,
  action,
  status,
  progress,
  error,
  onRetry,
  result,
}: ToolWorkspaceProps) {
  // The tool is server-rendered, so on a slow connection it is visible before JavaScript runs. A file
  // picked, text typed or option changed in that window was silently lost (React reset it on hydration).
  // A disabled <fieldset> blocks every control until the page is interactive, with no layout shift.
  const interactive = useInteractive();
  return (
    <section
      aria-label="Tool"
      data-ready={interactive ? "" : undefined}
      aria-busy={!interactive}
      className="rounded-2xl border border-border bg-card p-4 shadow-sm sm:p-6"
    >
      <fieldset disabled={!interactive} className="min-w-0 space-y-5">
        {input}
        {settings && <div className="flex flex-wrap items-end gap-4">{settings}</div>}
        {advanced && (
          <details className="group rounded-lg border border-border px-4 py-2 text-sm">
            <summary className="cursor-pointer select-none text-fg-muted py-2 min-h-[44px] flex items-center">
              Advanced options
            </summary>
            <div className="flex flex-wrap items-end gap-4 py-3">{advanced}</div>
          </details>
        )}
        {action && (
          <Button
            data-testid="primary-action"
            variant="primary"
            size="lg"
            className="w-full sm:w-auto"
            onClick={action.onClick}
            disabled={action.disabled || status === "working"}
          >
            {status === "working" && <Loader2 className="size-4 animate-spin" aria-hidden />}
            {action.label}
          </Button>
        )}
        <div aria-live="polite" data-testid="tool-output" className="space-y-4">
          {status === "working" && (
            <div className="space-y-2">
              <p className="text-sm text-fg-muted">{progress?.label ?? "Working on your device…"}</p>
              <div className="h-1.5 overflow-hidden rounded-full bg-soft">
                <div
                  className={
                    progress?.ratio === undefined
                      ? "h-full w-1/3 animate-pulse rounded-full bg-accent"
                      : "h-full rounded-full bg-accent transition-[width]"
                  }
                  style={progress?.ratio !== undefined ? { width: `${Math.round(progress.ratio * 100)}%` } : undefined}
                />
              </div>
            </div>
          )}
          {status === "error" && error && (
            <div role="alert" className="flex gap-3 rounded-lg border border-red-500/30 bg-red-500/5 p-4 text-sm">
              <AlertTriangle className="mt-0.5 size-4 shrink-0 text-red-500" aria-hidden />
              <div>
                <p className="font-medium">{error.cause}</p>
                {error.fix && <p className="mt-1 text-fg-muted">{error.fix}</p>}
                {onRetry && (
                  <Button size="sm" className="mt-3" onClick={onRetry}>
                    Choose another file
                  </Button>
                )}
              </div>
            </div>
          )}
          {result}
        </div>
      </fieldset>
    </section>
  );
}

export function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="flex flex-col gap-1.5 text-sm">
      <span className="text-fg-muted">{label}</span>
      {children}
    </label>
  );
}

export const inputClass =
  "kk-field h-11 sm:h-10 rounded-full border border-line2 bg-solid px-4 text-sm text-ink outline-none transition-colors hover:border-ink2/40 focus-visible:ring-2 focus-visible:ring-accent";
