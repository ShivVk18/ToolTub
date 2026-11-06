import { HardDrive, Server } from "lucide-react";
import type { Processing } from "@/registry/types";

/** Shown on every tool. The wording is fixed so users (and AI crawlers) see one consistent privacy model. */
export function PrivacyBadge({ processing }: { processing: Processing }) {
  if (processing.where === "device") {
    return (
      <p className="inline-flex items-center gap-2 rounded-full border border-emerald-500/30 bg-emerald-500/5 px-3 py-1 text-xs text-emerald-700 dark:text-emerald-400">
        <HardDrive className="size-3.5" aria-hidden />
        Runs on your device — nothing uploaded
      </p>
    );
  }
  return (
    <p className="inline-flex items-center gap-2 rounded-full border border-sky-500/30 bg-sky-500/5 px-3 py-1 text-xs text-sky-700 dark:text-sky-400">
      <Server className="size-3.5" aria-hidden />
      Processed on KlipKit&apos;s own server — deleted after {processing.retentionMinutes / 60} hour
    </p>
  );
}
