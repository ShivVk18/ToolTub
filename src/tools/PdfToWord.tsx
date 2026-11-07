"use client";
import { useState } from "react";
import { Dropzone } from "@/components/tool/Dropzone";
import { ResultActions, useHandoff } from "@/components/tool/ToolChrome";
import { FileChip } from "@/components/tool/FileChip";
import { ToolWorkspace, useToolRun } from "@/components/tool/ToolWorkspace";
import { formatBytes } from "@/lib/utils";
import type { ToolProps } from "./types";

type JobState = { state: "waiting" | "active" | "completed" | "failed" | "unknown"; position?: number; error?: string };

/**
 * [Srv] PDF to Word. The file goes to KlipKit's own server only (LibreOffice in a sandboxed,
 * network-less container), is converted via the BullMQ queue, and is deleted after 1 hour.
 */
export function PdfToWord({ slug, next }: ToolProps) {
  const [file, setFile] = useState<File | null>(null);
  const job = useToolRun<Blob>();

  // Arrive with a PDF from the home plan or another tool ("Continue in PDF to Word").
  useHandoff((items) => {
    const pdf = items.find((i) => i.type === "application/pdf" && i.blob);
    if (pdf) setFile(new File([pdf.blob!], pdf.name, { type: pdf.type }));
  });

  const start = () =>
    job.run(
      async (onProgress) => {
        onProgress({ label: "Uploading to KlipKit's server…" });
        const form = new FormData();
        form.append("file", file!);
        const send = () => fetch("/api/jobs?tool=pdf-to-word", { method: "POST", body: form });
        let res = await send();
        // One automatic retry for a brief outage (e.g. the queue restarting) before showing an error.
        if (res.status === 503) {
          onProgress({ label: "Server busy, retrying…" });
          await new Promise((r) => setTimeout(r, 2500));
          res = await send();
        }
        const body = await res.json();
        if (!res.ok) throw new Error(body.error ?? "Upload failed");
        const { id } = body as { id: string };
        for (let i = 0; i < 180; i++) {
          await new Promise((r) => setTimeout(r, 1000));
          const s: JobState = await (await fetch(`/api/jobs/${id}`)).json();
          onProgress({
            label:
              s.state === "waiting"
                ? `Waiting in the queue${s.position ? ` (position ${s.position})` : ""}…`
                : "Converting on KlipKit's server…",
          });
          if (s.state === "completed") return (await fetch(`/api/jobs/${id}/file`)).blob();
          if (s.state === "failed") throw new Error(s.error ?? "Conversion failed");
        }
        throw new Error("Conversion timed out");
      },
      (e) => ({
        cause: e.message,
        fix: e.message.includes("unavailable")
          ? "Browser-based tools still work; only server conversions are paused."
          : e.message.includes("limit")
            ? "You've hit the hourly limit for server tools. Try again in a little while."
            : "Scanned PDFs have no text to convert: run Image to Text (OCR) first.",
      }),
    );

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
            maxFileMb={50}
            onFiles={([f]) => (setFile(f), job.reset())}
            hint="Text-based PDF up to 50 MB · deleted from our server after 1 hour"
          />
        )
      }
      action={{ label: "Convert to Word", onClick: start, disabled: !file }}
      result={
        job.status === "done" &&
        job.result && (
          <div className="space-y-3">
            <p className="text-sm">
              Done · {formatBytes(job.result.size)} · your PDF and the Word file are deleted from our server within 1
              hour.
            </p>
            <ResultActions
              items={[
                {
                  name: file!.name.replace(/\.pdf$/i, "") + ".docx",
                  type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
                  blob: job.result,
                },
              ]}
              next={next}
              from={slug}
            />
          </div>
        )
      }
    />
  );
}
