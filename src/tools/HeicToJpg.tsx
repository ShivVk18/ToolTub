"use client";
import { useState } from "react";
import { Dropzone } from "@/components/tool/Dropzone";
import { ResultActions } from "@/components/tool/ToolChrome";
import { Field, ToolWorkspace, inputClass, useToolRun } from "@/components/tool/ToolWorkspace";
import type { Artifact } from "@/lib/store/klip";
import { formatBytes, renameExt } from "@/lib/utils";
import { imageWorker } from "@/workers/clients";
import type { ToolProps } from "./types";

/** [Lib] HEIC to JPG: libheif (LGPL-3.0, separate file) decodes; the [Own] canvas encoder writes JPG/PNG. */
export function HeicToJpg({ slug, preset, next }: ToolProps) {
  const [files, setFiles] = useState<File[]>([]);
  const [mime, setMime] = useState<"image/jpeg" | "image/png">(preset?.format === "png" ? "image/png" : "image/jpeg");
  const job = useToolRun<Artifact[]>();

  const start = () =>
    job.run(
      async (onProgress) => {
        const out: Artifact[] = [];
        for (const [i, f] of files.entries()) {
          onProgress({ ratio: i / files.length, label: `Converting ${i + 1} of ${files.length} on your device…` });
          const r = await imageWorker.call("heic", { blob: f, mime, quality: 0.9 });
          out.push({ name: renameExt(f.name, mime), type: mime, blob: r.blob });
        }
        return out;
      },
      () => ({
        cause: "That file couldn't be read as a HEIC photo.",
        fix: "Check it's an original .heic/.heif from an iPhone or iPad, not a renamed file.",
      }),
    );

  return (
    <ToolWorkspace
      status={job.status}
      progress={job.progress}
      error={job.error}
      input={
        <Dropzone
          accept=".heic,.heif,image/heic,image/heif"
          multiple
          maxFileMb={50}
          onFiles={(f) => (setFiles(f.slice(0, 100)), job.reset())}
          hint={files.length ? `${files.length} photo(s) selected` : "HEIC or HEIF · up to 100 photos"}
        />
      }
      settings={
        <Field label="Convert to">
          <select value={mime} onChange={(e) => setMime(e.target.value as typeof mime)} className={inputClass}>
            <option value="image/jpeg">JPG (smaller, shares anywhere)</option>
            <option value="image/png">PNG (lossless)</option>
          </select>
        </Field>
      }
      action={{ label: `Convert to ${mime === "image/png" ? "PNG" : "JPG"}`, onClick: start, disabled: !files.length }}
      result={
        job.status === "done" &&
        job.result && (
          <div className="space-y-3">
            <p className="text-sm">
              Converted {job.result.length} photo{job.result.length > 1 && "s"} ·{" "}
              {formatBytes(job.result.reduce((s, a) => s + (a.blob?.size ?? 0), 0))}
            </p>
            <ResultActions items={job.result} next={next} from={slug} />
          </div>
        )
      }
    />
  );
}
