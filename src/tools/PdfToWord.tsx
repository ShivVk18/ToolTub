"use client";
import { useState } from "react";
import { Dropzone } from "@/components/tool/Dropzone";
import { ResultActions, useHandoff } from "@/components/tool/ToolChrome";
import { FileChip } from "@/components/tool/FileChip";
import { ToolWorkspace, useToolRun } from "@/components/tool/ToolWorkspace";
import { formatBytes } from "@/lib/utils";
import type { ToolProps } from "./types";

type JobState = { state: "waiting" | "active" | "completed" | "failed" | "unknown"; position?: number; error?: string };

const DOCX = "application/vnd.openxmlformats-officedocument.wordprocessingml.document";

/** What differs between the server tools: the API tool id, input type and labels. */
interface ServerSpec {
  tool: "pdf-to-word" | "word-to-pdf";
  accept: string;
  inType: (t: string, name: string) => boolean;
  typeLabel: string;
  noun: string;
  hint: string;
  action: string;
  outExt: string;
  outType: string;
  failFix: string;
}

const SPECS: Record<ServerSpec["tool"], ServerSpec> = {
  "pdf-to-word": {
    tool: "pdf-to-word",
    accept: "application/pdf,.pdf",
    inType: (t) => t === "application/pdf",
    typeLabel: "a PDF",
    noun: "PDF",
    hint: "Text-based PDF up to 50 MB · deleted from our server after 1 hour",
    action: "Convert to Word",
    outExt: "docx",
    outType: DOCX,
    failFix: "Scanned PDFs have no text to convert: run Image to Text (OCR) first.",
  },
  "word-to-pdf": {
    tool: "word-to-pdf",
    accept: `${DOCX},application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.openxmlformats-officedocument.presentationml.presentation,application/vnd.oasis.opendocument.text,application/vnd.oasis.opendocument.spreadsheet,application/vnd.oasis.opendocument.presentation,.docx,.xlsx,.pptx,.odt,.ods,.odp`,
    inType: (t, n) => /\.(docx|xlsx|pptx|odt|ods|odp)$/i.test(n) || t === DOCX,
    typeLabel: "a Word, Excel or PowerPoint file",
    noun: "document",
    hint: ".docx, .xlsx, .pptx (or OpenDocument) up to 50 MB · deleted from our server after 1 hour",
    action: "Convert to PDF",
    outExt: "pdf",
    outType: "application/pdf",
    failFix: "Old .doc, .xls and .ppt files aren't supported: save as .docx, .xlsx or .pptx, then try again.",
  },
};

/**
 * [Srv] PDF to Word and Word to PDF. The file goes to KlipKit's own server only (LibreOffice in a sandboxed,
 * network-less container), is converted via the BullMQ queue, and is deleted after 1 hour.
 */
export function PdfToWord(props: ToolProps) {
  return <ServerConvert {...props} spec={SPECS["pdf-to-word"]} />;
}
export function WordToPdf(props: ToolProps) {
  return <ServerConvert {...props} spec={SPECS["word-to-pdf"]} />;
}

function ServerConvert({ slug, next, spec }: ToolProps & { spec: ServerSpec }) {
  const [file, setFile] = useState<File | null>(null);
  const job = useToolRun<Blob>();

  // Arrive with a file from the home plan or another tool ("Continue in …").
  useHandoff((items) => {
    const f = items.find((i) => spec.inType(i.type, i.name) && i.blob);
    if (f) setFile(new File([f.blob!], f.name, { type: f.type }));
  });

  const start = () =>
    job.run(
      async (onProgress) => {
        onProgress({ label: "Uploading to KlipKit's server…" });
        const form = new FormData();
        form.append("file", file!);
        const send = () => fetch(`/api/jobs?tool=${spec.tool}`, { method: "POST", body: form });
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
            : spec.failFix,
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
          <FileChip files={[file]} noun={spec.noun} onChange={() => (setFile(null), job.reset())} />
        ) : (
          <Dropzone
            accept={spec.accept}
            typeLabel={spec.typeLabel}
            maxFileMb={50}
            onFiles={([f]) => (setFile(f), job.reset())}
            hint={spec.hint}
          />
        )
      }
      action={{ label: spec.action, onClick: start, disabled: !file }}
      result={
        job.status === "done" &&
        job.result && (
          <div className="space-y-3">
            <p className="text-sm">
              Done · {formatBytes(job.result.size)} · both files are deleted from our server within 1 hour.
            </p>
            <ResultActions
              items={[
                {
                  name: file!.name.replace(/\.[^.]+$/, "") + "." + spec.outExt,
                  type: spec.outType,
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
