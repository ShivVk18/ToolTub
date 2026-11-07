"use client";
import { useState } from "react";
import { Dropzone } from "@/components/tool/Dropzone";
import { ResultActions, useHandoff } from "@/components/tool/ToolChrome";
import { Field, ToolWorkspace, inputClass, useToolRun } from "@/components/tool/ToolWorkspace";
import { FileChip } from "@/components/tool/FileChip";
import { ResultRow } from "@/components/tool/ResultRow";
import { pdfWorker } from "@/workers/clients";
import type { ToolProps } from "./types";

export function CompressPdf({ slug, preset, next }: ToolProps) {
  const [file, setFile] = useState<File | null>(null);
  const [level, setLevel] = useState<"recommended" | "strong">("recommended");
  const [targetKB, setTargetKB] = useState<number | "">(preset?.targetKB ? Number(preset.targetKB) : "");
  const job = useToolRun<{ blob: Blob; originalSize: number; keptOriginal: boolean; note?: string }>();

  useHandoff((items) => {
    const pdf = items.find((i) => i.type === "application/pdf" && i.blob);
    if (pdf) setFile(new File([pdf.blob!], pdf.name, { type: pdf.type }));
  });

  const start = async () => {
    if (!file) return;
    const bytes = await file.arrayBuffer();
    job.run((onProgress) =>
      pdfWorker.call("compress", { bytes, level, targetKB: targetKB || undefined }, { transfer: [bytes], onProgress }),
    );
  };

  return (
    <ToolWorkspace
      status={job.status}
      progress={job.progress}
      error={job.error}
      onRetry={() => (setFile(null), job.reset())}
      input={
        file ? (
          <FileChip files={[file]} noun="PDF" onChange={() => (setFile(null), job.reset())} />
        ) : (
          <Dropzone
            accept="application/pdf,.pdf"
            typeLabel="a PDF"
            maxFileMb={200}
            onFiles={([f]) => (setFile(f), job.reset())}
            hint="PDF up to 200 MB"
          />
        )
      }
      settings={
        <>
          <Field label="Level">
            <select
              value={level}
              onChange={(e) => setLevel(e.target.value as typeof level)}
              className={inputClass}
              disabled={!!targetKB}
            >
              <option value="recommended">Recommended (150 dpi)</option>
              <option value="strong">Strong (96 dpi)</option>
            </select>
          </Field>
          <Field label="Or target size (KB)">
            <input
              type="number"
              min={20}
              placeholder="e.g. 100"
              value={targetKB}
              onChange={(e) => setTargetKB(e.target.value ? Number(e.target.value) : "")}
              className={`${inputClass} w-36`}
            />
          </Field>
        </>
      }
      action={{ label: "Compress PDF", onClick: start, disabled: !file }}
      result={
        job.status === "done" &&
        job.result && (
          <div className="space-y-3">
            <ResultRow before={job.result.originalSize} after={job.result.blob.size}>
              <ResultActions
                items={[
                  {
                    name: file!.name.replace(/\.pdf$/i, "") + "-compressed.pdf",
                    type: "application/pdf",
                    blob: job.result.blob,
                  },
                ]}
                next={next}
                from={slug}
              />
            </ResultRow>
            {(job.result.note || job.result.keptOriginal) && (
              <p className="text-sm text-fg-muted">
                {job.result.note ?? "This PDF is already as small as we can make it without losing quality."}
              </p>
            )}
          </div>
        )
      }
    />
  );
}
