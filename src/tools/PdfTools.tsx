"use client";
/** Merge, Split, JPG to PDF, Watermark and Protect: pdf-lib (and qpdf for Protect) in the PDF worker. Nothing is uploaded. */
import { useState } from "react";
import { Dropzone } from "@/components/tool/Dropzone";
import { FileChip } from "@/components/tool/FileChip";
import { FileList } from "@/components/tool/FileList";
import { ResultActions, useHandoff } from "@/components/tool/ToolChrome";
import { Field, ToolWorkspace, inputClass, useToolRun } from "@/components/tool/ToolWorkspace";
import { formatBytes } from "@/lib/utils";
import { stem } from "@/lib/engines/pages";
import { pdfWorker } from "@/workers/clients";
import type { ToolProps } from "./types";

const PDF_ACCEPT = "application/pdf,.pdf";

function Done({ text, children }: { text: string; children: React.ReactNode }) {
  return (
    <div
      data-testid="result-row"
      className="flex flex-wrap items-center justify-between gap-4 rounded-[20px] border border-line bg-soft p-4"
    >
      <p className="text-lg font-semibold text-ink">{text}</p>
      {children}
    </div>
  );
}

/** One PDF in, kept in state, with handoff from other tools. */
function useOnePdf() {
  const [file, setFile] = useState<File | null>(null);
  useHandoff((items) => {
    const pdf = items.find((i) => i.type === "application/pdf" && i.blob);
    if (pdf) setFile(new File([pdf.blob!], pdf.name, { type: pdf.type }));
  });
  return [file, setFile] as const;
}

// ───────────────────────── Merge ─────────────────────────
export function MergePdf({ slug, next }: ToolProps) {
  const [files, setFiles] = useState<File[]>([]);
  const job = useToolRun<{ blob: Blob; pages: number }>();
  useHandoff((items) =>
    setFiles((f) => [
      ...f,
      ...items
        .filter((i) => i.type === "application/pdf" && i.blob)
        .map((i) => new File([i.blob!], i.name, { type: i.type })),
    ]),
  );
  const start = async () => {
    const list = await Promise.all(files.map(async (f) => ({ name: f.name, bytes: await f.arrayBuffer() })));
    job.run((onProgress) =>
      pdfWorker.call("merge", { files: list }, { transfer: list.map((l) => l.bytes), onProgress }),
    );
  };
  return (
    <ToolWorkspace
      status={job.status}
      progress={job.progress}
      error={job.error}
      onRetry={() => job.reset()}
      input={
        <div className="space-y-3">
          {files.length > 0 && <FileList files={files} noun="PDF" onChange={(f) => (setFiles(f), job.reset())} />}
          <Dropzone
            accept={PDF_ACCEPT}
            typeLabel="a PDF"
            multiple
            maxFileMb={200}
            onFiles={(f) => (setFiles((x) => [...x, ...f]), job.reset())}
            hint={files.length ? "Add more PDFs" : "Two or more PDFs, up to 200 MB each"}
          />
        </div>
      }
      action={{ label: "Merge PDFs", onClick: start, disabled: files.length < 2 }}
      result={
        job.status === "done" &&
        job.result && (
          <Done
            text={`${files.length} PDFs → 1 PDF · ${job.result.pages} pages · ${formatBytes(job.result.blob.size)}`}
          >
            <ResultActions
              items={[{ name: "merged.pdf", type: "application/pdf", blob: job.result.blob }]}
              next={next}
              from={slug}
            />
          </Done>
        )
      }
    />
  );
}

// ───────────────────────── Split ─────────────────────────
export function SplitPdf({ slug, next }: ToolProps) {
  const [file, setFile] = useOnePdf();
  const [mode, setMode] = useState<"extract" | "ranges" | "every">("extract");
  const [ranges, setRanges] = useState("1-3");
  const job = useToolRun<{ files: { blob: Blob; label: string; pages: number }[]; total: number }>();
  const start = async () => {
    const bytes = await file!.arrayBuffer();
    job.run((onProgress) => pdfWorker.call("splitRanges", { bytes, mode, ranges }, { transfer: [bytes], onProgress }));
  };
  const name = file ? stem(file.name) : "file";
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
            accept={PDF_ACCEPT}
            typeLabel="a PDF"
            maxFileMb={200}
            onFiles={([f]) => (setFile(f), job.reset())}
            hint="PDF up to 200 MB"
          />
        )
      }
      settings={
        <>
          <Field label="Split">
            <select
              value={mode}
              onChange={(e) => (setMode(e.target.value as typeof mode), job.reset())}
              className={inputClass}
            >
              <option value="extract">Extract pages into one PDF</option>
              <option value="ranges">One PDF per range</option>
              <option value="every">Every page as its own PDF</option>
            </select>
          </Field>
          {mode !== "every" && (
            <Field label="Pages">
              <input
                value={ranges}
                onChange={(e) => (setRanges(e.target.value), job.reset())}
                placeholder="1-3, 5, 8-"
                aria-describedby="ranges-help"
                className={`${inputClass} w-48`}
              />
            </Field>
          )}
          {mode !== "every" && (
            <p id="ranges-help" className="basis-full text-xs text-ink2">
              e.g. <code>1-3, 5, 8-</code> (8 to the end), <code>odd</code>, <code>even</code>, <code>last</code>
            </p>
          )}
        </>
      }
      action={{ label: "Split PDF", onClick: start, disabled: !file || (mode !== "every" && !ranges.trim()) }}
      result={
        job.status === "done" &&
        job.result && (
          <Done
            text={
              job.result.files.length === 1
                ? `${job.result.files[0].pages} of ${job.result.total} pages · ${formatBytes(job.result.files[0].blob.size)}`
                : `${job.result.files.length} PDFs from ${job.result.total} pages`
            }
          >
            <ResultActions
              items={job.result.files.map((f) => ({
                name: `${name}-${f.label}.pdf`,
                type: "application/pdf",
                blob: f.blob,
              }))}
              zipName={`${name}-split.zip`}
              next={next}
              from={slug}
            />
          </Done>
        )
      }
    />
  );
}

// ───────────────────────── JPG to PDF ─────────────────────────
export function JpgToPdf({ slug, next }: ToolProps) {
  const [files, setFiles] = useState<File[]>([]);
  const [size, setSize] = useState<"fit" | "a4" | "letter">("a4");
  const [margin, setMargin] = useState(24);
  const job = useToolRun<{ blob: Blob; pages: number }>();
  useHandoff((items) =>
    setFiles((f) => [
      ...f,
      ...items
        .filter((i) => i.type.startsWith("image/") && i.blob)
        .map((i) => new File([i.blob!], i.name, { type: i.type })),
    ]),
  );
  const start = async () => {
    const images = await Promise.all(
      files.map(async (f) => ({ name: f.name, type: f.type, bytes: await f.arrayBuffer() })),
    );
    job.run((onProgress) =>
      pdfWorker.call("imagesToPdf", { images, size, margin }, { transfer: images.map((i) => i.bytes), onProgress }),
    );
  };
  return (
    <ToolWorkspace
      status={job.status}
      progress={job.progress}
      error={job.error}
      onRetry={() => job.reset()}
      input={
        <div className="space-y-3">
          {files.length > 0 && <FileList files={files} noun="image" onChange={(f) => (setFiles(f), job.reset())} />}
          <Dropzone
            accept="image/jpeg,image/png,image/webp,image/avif,image/gif,.jpg,.jpeg,.png,.webp,.avif,.gif"
            typeLabel="an image (JPG, PNG, WebP, AVIF or GIF)"
            multiple
            maxFileMb={50}
            onFiles={(f) => (setFiles((x) => [...x, ...f]), job.reset())}
            hint={files.length ? "Add more images" : "JPG, PNG, WebP, AVIF or GIF · one page per image"}
          />
        </div>
      }
      settings={
        <>
          <Field label="Page size">
            <select
              value={size}
              onChange={(e) => (setSize(e.target.value as typeof size), job.reset())}
              className={inputClass}
            >
              <option value="a4">A4</option>
              <option value="letter">US Letter</option>
              <option value="fit">Same as the image</option>
            </select>
          </Field>
          <Field label="Margin">
            <select value={margin} onChange={(e) => (setMargin(+e.target.value), job.reset())} className={inputClass}>
              <option value={0}>None</option>
              <option value={24}>Small</option>
              <option value={56}>Large</option>
            </select>
          </Field>
        </>
      }
      action={{ label: "Make PDF", onClick: start, disabled: !files.length }}
      result={
        job.status === "done" &&
        job.result && (
          <Done
            text={`${job.result.pages} page${job.result.pages === 1 ? "" : "s"} · ${formatBytes(job.result.blob.size)}`}
          >
            <ResultActions
              items={[
                {
                  name: files.length === 1 ? `${stem(files[0].name)}.pdf` : "images.pdf",
                  type: "application/pdf",
                  blob: job.result.blob,
                },
              ]}
              next={next}
              from={slug}
            />
          </Done>
        )
      }
    />
  );
}

// ───────────────────────── Watermark ─────────────────────────
export function PdfWatermark({ slug, next }: ToolProps) {
  const [file, setFile] = useOnePdf();
  const [kind, setKind] = useState<"text" | "image" | "numbers">("text");
  const [text, setText] = useState("CONFIDENTIAL");
  const [logo, setLogo] = useState<File | null>(null);
  const [logoSize, setLogoSize] = useState(40);
  const [numberFormat, setNumberFormat] = useState<"n" | "n/N" | "page n of N">("n/N");
  const [position, setPosition] = useState<"diagonal" | "center" | "bottom">("diagonal");
  const [opacity, setOpacity] = useState(0.25);
  const [color, setColor] = useState("#e5484d");
  const [pages, setPages] = useState("all");
  const job = useToolRun<{ blob: Blob; pages: number }>();
  const start = async () => {
    const bytes = await file!.arrayBuffer();
    const image = kind === "image" && logo ? await logo.arrayBuffer() : undefined;
    job.run(() =>
      pdfWorker.call(
        "watermark",
        {
          bytes,
          kind,
          text,
          image,
          numberFormat,
          size: kind === "image" ? logoSize : position === "bottom" ? 18 : 64,
          opacity,
          color,
          position: kind === "image" && position === "diagonal" ? "center" : position,
          pages,
        },
        { transfer: image ? [bytes, image] : [bytes] },
      ),
    );
  };
  const ready = !!file && (kind === "text" ? !!text.trim() : kind === "image" ? !!logo : true);
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
            accept={PDF_ACCEPT}
            typeLabel="a PDF"
            maxFileMb={200}
            onFiles={([f]) => (setFile(f), job.reset())}
            hint="PDF up to 200 MB"
          />
        )
      }
      settings={
        <>
          <Field label="Add">
            <select
              value={kind}
              onChange={(e) => (setKind(e.target.value as typeof kind), job.reset())}
              className={inputClass}
            >
              <option value="text">Text watermark</option>
              <option value="image">Logo (PNG or JPG)</option>
              <option value="numbers">Page numbers</option>
            </select>
          </Field>
          {kind === "text" && (
            <Field label="Text">
              <input
                value={text}
                maxLength={80}
                onChange={(e) => (setText(e.target.value), job.reset())}
                className={`${inputClass} w-56`}
              />
            </Field>
          )}
          {kind === "image" && (
            <>
              <Field label="Logo">
                <input
                  type="file"
                  accept="image/png,image/jpeg,.png,.jpg,.jpeg"
                  onChange={(e) => (setLogo(e.target.files?.[0] ?? null), job.reset())}
                  className="h-11 text-sm file:mr-3 file:h-10 file:rounded-full file:border file:border-line file:bg-solid file:px-4"
                />
              </Field>
              <Field label="Logo width">
                <select
                  value={logoSize}
                  onChange={(e) => (setLogoSize(+e.target.value), job.reset())}
                  className={inputClass}
                >
                  <option value={20}>Small (20%)</option>
                  <option value={40}>Medium (40%)</option>
                  <option value={70}>Large (70%)</option>
                </select>
              </Field>
            </>
          )}
          {kind === "numbers" ? (
            <Field label="Format">
              <select
                value={numberFormat}
                onChange={(e) => (setNumberFormat(e.target.value as typeof numberFormat), job.reset())}
                className={inputClass}
              >
                <option value="n/N">1 / 12</option>
                <option value="page n of N">Page 1 of 12</option>
                <option value="n">1</option>
              </select>
            </Field>
          ) : (
            <>
              <Field label="Position">
                <select
                  value={position}
                  onChange={(e) => (setPosition(e.target.value as typeof position), job.reset())}
                  className={inputClass}
                >
                  {kind === "text" && <option value="diagonal">Diagonal, across the page</option>}
                  <option value="center">Centre</option>
                  <option value="bottom">Bottom (footer)</option>
                </select>
              </Field>
              <Field label="Opacity">
                <select
                  value={opacity}
                  onChange={(e) => (setOpacity(+e.target.value), job.reset())}
                  className={inputClass}
                >
                  <option value={0.12}>Light</option>
                  <option value={0.25}>Medium</option>
                  <option value={0.5}>Strong</option>
                  <option value={1}>Solid</option>
                </select>
              </Field>
            </>
          )}
          {kind === "text" && (
            <Field label="Colour">
              <input
                type="color"
                value={color}
                onChange={(e) => (setColor(e.target.value), job.reset())}
                className="h-11 w-14 rounded-xl border border-line bg-solid"
                aria-label="Watermark colour"
              />
            </Field>
          )}
          <Field label="Pages">
            <input
              value={pages}
              onChange={(e) => (setPages(e.target.value), job.reset())}
              placeholder="all, 1-3, odd"
              className={`${inputClass} w-32`}
            />
          </Field>
        </>
      }
      action={{ label: kind === "numbers" ? "Add page numbers" : "Add watermark", onClick: start, disabled: !ready }}
      result={
        job.status === "done" &&
        job.result && (
          <Done
            text={`${kind === "numbers" ? "Numbered" : "Watermarked"} ${job.result.pages} page${job.result.pages === 1 ? "" : "s"}`}
          >
            <ResultActions
              items={[
                {
                  name: `${stem(file!.name)}-${kind === "numbers" ? "numbered" : "watermarked"}.pdf`,
                  type: "application/pdf",
                  blob: job.result.blob,
                },
              ]}
              next={next}
              from={slug}
            />
          </Done>
        )
      }
    />
  );
}

// ───────────────────────── Protect / Unlock ─────────────────────────
export function ProtectPdf({ slug, next }: ToolProps) {
  const [file, setFile] = useOnePdf();
  const [mode, setMode] = useState<"protect" | "unlock">("protect");
  const [pw, setPw] = useState("");
  const [pw2, setPw2] = useState("");
  const [allowPrint, setAllowPrint] = useState(true);
  const [allowCopy, setAllowCopy] = useState(false);
  const job = useToolRun<{ blob: Blob }>();
  const mismatch = mode === "protect" && pw2.length > 0 && pw !== pw2;
  const start = async () => {
    const bytes = await file!.arrayBuffer();
    job.run((onProgress) =>
      mode === "unlock"
        ? pdfWorker.call("unlock", { bytes, password: pw }, { transfer: [bytes], onProgress })
        : pdfWorker.call("protect", { bytes, password: pw, allowPrint, allowCopy }, { transfer: [bytes], onProgress }),
    );
  };
  const switchTo = (m: typeof mode) => (setMode(m), setPw(""), setPw2(""), job.reset());
  return (
    <ToolWorkspace
      status={job.status}
      progress={job.progress}
      error={job.error}
      onRetry={() => (setFile(null), job.reset())}
      input={
        <div className="space-y-3">
          <div className="flex gap-2" role="tablist" aria-label="Protect or unlock">
            {(["protect", "unlock"] as const).map((m) => (
              <button
                key={m}
                type="button"
                role="tab"
                aria-selected={mode === m}
                onClick={() => switchTo(m)}
                className={`h-11 rounded-full px-5 text-sm font-medium ${mode === m ? "bg-ink text-bg" : "border border-line text-ink"}`}
              >
                {m === "protect" ? "Add a password" : "Remove a password"}
              </button>
            ))}
          </div>
          {file ? (
            <FileChip files={[file]} noun="PDF" onChange={() => (setFile(null), job.reset())} />
          ) : (
            <Dropzone
              accept={PDF_ACCEPT}
              typeLabel="a PDF"
              maxFileMb={200}
              onFiles={([f]) => (setFile(f), job.reset())}
              hint="PDF up to 200 MB"
            />
          )}
        </div>
      }
      settings={
        mode === "unlock" ? (
          <>
            <Field label="Current password">
              <input
                type="password"
                autoComplete="current-password"
                value={pw}
                onChange={(e) => (setPw(e.target.value), job.reset())}
                className={`${inputClass} w-52`}
              />
            </Field>
            <p className="basis-full text-xs text-ink2">
              You need the password to remove it. The unlocked copy opens without one.
            </p>
          </>
        ) : (
          <>
            <Field label="Password">
              <input
                type="password"
                autoComplete="new-password"
                value={pw}
                onChange={(e) => (setPw(e.target.value), job.reset())}
                className={`${inputClass} w-52`}
              />
            </Field>
            <Field label="Repeat password">
              <input
                type="password"
                autoComplete="new-password"
                value={pw2}
                aria-invalid={mismatch}
                onChange={(e) => (setPw2(e.target.value), job.reset())}
                className={`${inputClass} w-52`}
              />
            </Field>
            <label className="flex h-11 items-center gap-2 text-sm text-ink">
              <input
                type="checkbox"
                checked={allowPrint}
                onChange={(e) => setAllowPrint(e.target.checked)}
                className="size-4"
              />{" "}
              Allow printing
            </label>
            <label className="flex h-11 items-center gap-2 text-sm text-ink">
              <input
                type="checkbox"
                checked={allowCopy}
                onChange={(e) => setAllowCopy(e.target.checked)}
                className="size-4"
              />{" "}
              Allow copying text
            </label>
            <p className="basis-full text-xs text-ink2" role={mismatch ? "alert" : undefined}>
              {mismatch
                ? "The passwords don't match."
                : pw && pw.length < 6
                  ? "Short passwords are easy to guess; 8+ characters is safer."
                  : "AES-256 encryption. KlipKit never sees the password, so it can't be recovered if you forget it."}
            </p>
          </>
        )
      }
      action={{
        label: mode === "unlock" ? "Unlock PDF" : "Protect PDF",
        onClick: start,
        disabled: !file || !pw || (mode === "protect" && pw !== pw2),
      }}
      result={
        job.status === "done" &&
        job.result && (
          <Done
            text={
              mode === "unlock"
                ? `Unlocked · ${formatBytes(job.result.blob.size)}`
                : `Protected with AES-256 · ${formatBytes(job.result.blob.size)}`
            }
          >
            <ResultActions
              items={[
                {
                  name: `${stem(file!.name)}-${mode === "unlock" ? "unlocked" : "protected"}.pdf`,
                  type: "application/pdf",
                  blob: job.result.blob,
                },
              ]}
              next={next}
              from={slug}
            />
          </Done>
        )
      }
    />
  );
}
