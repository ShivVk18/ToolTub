"use client";
import { useState } from "react";
import { Dropzone } from "@/components/workspace/Dropzone";
import { ResultActions } from "@/components/workspace/ToolChrome";
import { ToolWorkspace, useToolRun } from "@/components/workspace/ToolWorkspace";
import type { Artifact } from "@/lib/store";
import { formatBytes, renameExt } from "@/lib/utils";
import type { ChainStep } from "@/registry/types";
import type { ImageJob } from "@/workers/image-ops";
import { imageWorker } from "@/workers/clients";

/**
 * Runs a chain on the device: step N's output Blob is step N+1's input, held in memory.
 * Each step maps to a headless op in a worker, the same engine the individual tools use.
 */
async function runStep(step: ChainStep, input: Blob): Promise<Blob> {
  const o = step.options ?? {};
  if (step.tool === "heic-to-jpg")
    return (
      await imageWorker.call("heic", { blob: input, mime: (o.mime as "image/jpeg") ?? "image/jpeg", quality: 0.9 })
    ).blob;
  if (["image-resizer", "image-compressor", "image-converter"].includes(step.tool)) {
    return (await imageWorker.call("process", { blob: input, ...(o as Partial<ImageJob>) })).blob;
  }
  throw new Error(`Step ${step.tool} can't run in a chain yet.`);
}

export function ChainRunner({ steps, accept }: { steps: (ChainStep & { name: string })[]; accept: string }) {
  const [files, setFiles] = useState<File[]>([]);
  const job = useToolRun<{ before: number; items: Artifact[] }>();

  const start = () =>
    job.run(async (onProgress) => {
      const items: Artifact[] = [];
      for (const [fi, f] of files.entries()) {
        let blob: Blob = f;
        for (const [si, s] of steps.entries()) {
          onProgress({
            ratio: (fi * steps.length + si) / (files.length * steps.length),
            label: `File ${fi + 1}/${files.length} · step ${si + 1}/${steps.length}: ${s.tool.replace(/-/g, " ")}`,
          });
          try {
            blob = await runStep(s, blob);
          } catch (e) {
            // Say exactly which step failed (and on which file) instead of a bare decoder message.
            throw new Error(
              `Step ${si + 1} (${s.name}) failed${files.length > 1 ? ` on ${f.name}` : ""}: ${(e as Error).message}`,
            );
          }
        }
        items.push({ name: renameExt(f.name, blob.type), type: blob.type, blob });
      }
      return { before: files.reduce((s, f) => s + f.size, 0), items };
    });

  const after = job.result?.items.reduce((s, i) => s + (i.blob?.size ?? 0), 0) ?? 0;
  return (
    <ToolWorkspace
      status={job.status}
      progress={job.progress}
      error={job.error}
      input={
        <Dropzone
          accept={accept}
          multiple
          maxFileMb={50}
          onFiles={(f) => (setFiles(f), job.reset())}
          hint={files.length ? `${files.length} file(s) ready` : "Up to 50 images · nothing is uploaded"}
        />
      }
      action={{ label: "Run chain", onClick: start, disabled: !files.length }}
      result={
        job.status === "done" &&
        job.result && (
          <div className="space-y-3">
            <p className="text-lg font-semibold">
              {formatBytes(job.result.before)} → {formatBytes(after)}
            </p>
            <ResultActions items={job.result.items} from="chain" zipName="klipkit-chain.zip" />
          </div>
        )
      }
    />
  );
}
