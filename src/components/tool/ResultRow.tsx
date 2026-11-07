import type { ReactNode } from "react";
import { formatBytes } from "@/lib/utils";

/** Success row for file tools: before → after with the saving, and the actions beside it (Hallmark F7). */
export function ResultRow({ before, after, children }: { before: number; after: number; children: ReactNode }) {
  const saved = after < before ? Math.round((1 - after / before) * 100) : 0;
  return (
    <div
      data-testid="result-row"
      className="flex flex-wrap items-center justify-between gap-4 rounded-[20px] border border-line bg-soft p-4"
    >
      <p className="flex items-center gap-2 text-lg font-semibold text-ink">
        {formatBytes(before)} → {formatBytes(after)}
        {saved > 0 && (
          <span
            className="rounded-full px-2.5 py-0.5 text-sm font-semibold"
            style={{ color: "var(--g-c)", background: "var(--okSoft)" }}
          >
            −{saved}%
          </span>
        )}
      </p>
      {children}
    </div>
  );
}
