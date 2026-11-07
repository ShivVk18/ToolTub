"use client";
/**
 * Passport Photo Maker (background removal with the self-hosted ISNet model + our own head placement) and
 * Image to Text (Tesseract OCR, self-hosted English model). Both run on the device; nothing is uploaded.
 */
import { useEffect, useRef, useState } from "react";
import { Dropzone } from "@/components/tool/Dropzone";
import { FileChip } from "@/components/tool/FileChip";
import { ResultActions, useHandoff } from "@/components/tool/ToolChrome";
import { Field, ToolWorkspace, inputClass, useToolRun } from "@/components/tool/ToolWorkspace";
import { formatBytes } from "@/lib/utils";
import { stem } from "@/lib/engines/pages";
import { PASSPORT_SPECS, findHead, mmToPx, placeHead, type HeadBox } from "@/lib/engines/imaging";
import { IMAGE_ACCEPT, IMAGE_LABEL, loadBitmap, makeCanvas, toBlob } from "@/lib/canvas";
import { openPdf, renderPage } from "@/lib/pdf/pdfjs";
import { bgWorker } from "@/workers/clients";
import type { ToolProps } from "./types";

function Done({ text, children }: { text: string; children?: React.ReactNode }) {
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

// ───────────────────────── Passport photo ─────────────────────────
type Cutout = { bmp: ImageBitmap; head: HeadBox };

export function PassportPhotoMaker({ slug, next }: ToolProps) {
  const [file, setFile] = useState<File | null>(null);
  const [spec, setSpec] = useState(PASSPORT_SPECS[0].id);
  const [zoom, setZoom] = useState(1);
  const [shift, setShift] = useState(0);
  const [cut, setCut] = useState<Cutout | null>(null);
  const preview = useRef<HTMLDivElement>(null);
  const cutJob = useToolRun<Cutout>();
  const job = useToolRun<{ photo: Blob; sheet: Blob; w: number; h: number }>();
  useHandoff((items) => items[0]?.blob && setFile(new File([items[0].blob], items[0].name, { type: items[0].type })));
  const s = PASSPORT_SPECS.find((x) => x.id === spec)!;
  const W = mmToPx(s.mm[0]);
  const H = mmToPx(s.mm[1]);

  const cutout = (f: File) =>
    cutJob.run(
      async (onProgress) => {
        onProgress({ label: "Removing the background on your device…" });
        const r = await bgWorker.call("remove", { blob: f }, { onProgress });
        const bmp = await createImageBitmap(r.blob);
        const sc = Math.min(1, 400 / Math.max(bmp.width, bmp.height));
        const { c, ctx } = makeCanvas(bmp.width * sc, bmp.height * sc);
        ctx.drawImage(bmp, 0, 0, c.width, c.height);
        const small = findHead(ctx.getImageData(0, 0, c.width, c.height).data, c.width, c.height);
        if (!small) throw new Error("No person found in this photo. Use a photo of your face and shoulders.");
        const head = { top: small.top / sc, chin: small.chin / sc, cx: small.cx / sc };
        setCut({ bmp, head });
        return { bmp, head };
      },
      (e) => ({
        cause: e.message,
        fix: "The first run downloads the background model once (about 44 MB); after that it works offline.",
      }),
    );

  const draw = (c: Cutout, w: number, h: number) => {
    const { c: canvas, ctx } = makeCanvas(w, h);
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, w, h);
    const r = placeHead(c.head, c.bmp.width, c.bmp.height, w, h, (s.head[0] + s.head[1]) / 2, zoom, shift);
    ctx.drawImage(c.bmp, r.x, r.y, r.w, r.h);
    return canvas;
  };

  useEffect(() => {
    if (!cut || !preview.current) return;
    const c = draw(cut, W, H);
    c.className = "block h-64 w-auto rounded-md border border-line";
    c.setAttribute("role", "img");
    c.setAttribute("aria-label", "Passport photo preview");
    preview.current.replaceChildren(c);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cut, spec, zoom, shift]);

  const start = () =>
    job.run(async () => {
      const photo = draw(cut!, W, H);
      // 6×4 in print sheet at 300 dpi with as many copies as fit, 2 mm apart, thin cut lines.
      const SW = 1800,
        SH = 1200,
        gap = mmToPx(2);
      const cols = Math.floor((SW - gap) / (W + gap));
      const rows = Math.floor((SH - gap) / (H + gap));
      const { c: sheet, ctx } = makeCanvas(SW, SH);
      ctx.fillStyle = "#fff";
      ctx.fillRect(0, 0, SW, SH);
      ctx.strokeStyle = "#cccccc";
      for (let r = 0; r < rows; r++)
        for (let k = 0; k < cols; k++) {
          const x = gap + k * (W + gap);
          const y = gap + r * (H + gap);
          ctx.drawImage(photo, x, y);
          ctx.strokeRect(x - 0.5, y - 0.5, W + 1, H + 1);
        }
      return {
        photo: await toBlob(photo, "image/jpeg", 0.95),
        sheet: await toBlob(sheet, "image/jpeg", 0.95),
        w: W,
        h: H,
      };
    });

  return (
    <ToolWorkspace
      status={cutJob.status === "error" ? "error" : cutJob.status === "working" ? "working" : job.status}
      progress={cutJob.status === "working" ? cutJob.progress : job.progress}
      error={cutJob.error ?? job.error}
      onRetry={() => (setFile(null), setCut(null), cutJob.reset(), job.reset())}
      input={
        <div className="space-y-3">
          {file ? (
            <FileChip
              files={[file]}
              noun="photo"
              onChange={() => (setFile(null), setCut(null), cutJob.reset(), job.reset())}
            />
          ) : (
            <Dropzone
              accept={IMAGE_ACCEPT}
              typeLabel={IMAGE_LABEL}
              maxFileMb={30}
              onFiles={([f]) => (setFile(f), cutout(f))}
              hint="A photo of your face and shoulders, looking at the camera"
            />
          )}
          {cut && <div ref={preview} data-testid="passport-preview" className="mx-auto w-fit" />}
        </div>
      }
      settings={
        <>
          <Field label="Document">
            <select value={spec} onChange={(e) => (setSpec(e.target.value), job.reset())} className={inputClass}>
              {PASSPORT_SPECS.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.label}
                </option>
              ))}
            </select>
          </Field>
          {cut && (
            <>
              <Field label="Head size">
                <input
                  type="range"
                  min={0.8}
                  max={1.2}
                  step={0.02}
                  value={zoom}
                  onChange={(e) => (setZoom(+e.target.value), job.reset())}
                  className="kk-range w-36"
                />
              </Field>
              <Field label="Move up / down">
                <input
                  type="range"
                  min={-0.1}
                  max={0.1}
                  step={0.01}
                  value={shift}
                  onChange={(e) => (setShift(+e.target.value), job.reset())}
                  className="kk-range w-36"
                />
              </Field>
            </>
          )}
          <p className="basis-full text-xs text-ink2">
            {W}×{H} px at 300 dpi · white background · head {Math.round(s.head[0] * 100)}–{Math.round(s.head[1] * 100)}%
            of the height. Check your country&apos;s rules before printing.
          </p>
        </>
      }
      action={{ label: "Make passport photo", onClick: start, disabled: !cut }}
      result={
        job.status === "done" &&
        job.result && (
          <Done text={`${job.result.w}×${job.result.h} photo + 6×4 in print sheet`}>
            <ResultActions
              items={[
                { name: `${stem(file!.name)}-passport-${spec}.jpg`, type: "image/jpeg", blob: job.result.photo },
                {
                  name: `${stem(file!.name)}-passport-${spec}-6x4-sheet.jpg`,
                  type: "image/jpeg",
                  blob: job.result.sheet,
                },
              ]}
              separate
              next={next}
              from={slug}
            />
          </Done>
        )
      }
    />
  );
}

// ───────────────────────── Image to Text (OCR) ─────────────────────────
type TessWorker = {
  recognize: (img: HTMLCanvasElement | Blob) => Promise<{ data: { text: string; confidence: number } }>;
  terminate: () => Promise<void>;
};
let tess: Promise<TessWorker> | null = null;
const BASE = "/vendor/tesseract/";
function ocrWorker(onProgress: (p: { ratio?: number; label?: string }) => void) {
  return (tess ??= (async () => {
    const url = BASE + "tesseract.esm.min.js";
    const T = (await import(/* webpackIgnore: true */ /* turbopackIgnore: true */ url)).default;
    return T.createWorker("eng", 1, {
      workerPath: BASE + "worker.min.js",
      corePath: BASE + "core",
      langPath: BASE + "lang",
      gzip: true,
      workerBlobURL: false,
      logger: (m: { status: string; progress: number }) =>
        onProgress({
          ratio: m.progress,
          label: m.status === "recognizing text" ? "Reading text…" : "Loading the text reader (first time only)…",
        }),
    });
  })().catch((e) => {
    tess = null;
    throw e;
  }));
}

export function ImageToText({ slug, next }: ToolProps) {
  const [file, setFile] = useState<File | null>(null);
  const [join, setJoin] = useState(false);
  const job = useToolRun<{ text: string; confidence: number; pages: number }>();
  useHandoff((items) => {
    const f = items.find((i) => (i.type.startsWith("image/") || i.type === "application/pdf") && i.blob);
    if (f) setFile(new File([f.blob!], f.name, { type: f.type }));
  });
  const start = () =>
    job.run(
      async (onProgress) => {
        const w = await ocrWorker(onProgress);
        const inputs: (HTMLCanvasElement | Blob)[] = [];
        if (file!.type === "application/pdf" || /\.pdf$/i.test(file!.name)) {
          const doc = await openPdf(await file!.arrayBuffer());
          if (doc.numPages > 30)
            throw new Error(`This PDF has ${doc.numPages} pages; OCR works on up to 30 at a time. Split it first.`);
          for (let p = 1; p <= doc.numPages; p++) inputs.push(await renderPage(doc, p, 2.5)); // ≈180 dpi
        } else {
          await loadBitmap(file!); // readable image?
          inputs.push(file!);
        }
        const texts: string[] = [];
        let conf = 0;
        for (const [i, img] of inputs.entries()) {
          onProgress({
            ratio: i / inputs.length,
            label: inputs.length > 1 ? `Reading page ${i + 1} of ${inputs.length}…` : "Reading text…",
          });
          const r = await w.recognize(img);
          texts.push(r.data.text.trim());
          conf += r.data.confidence;
        }
        let text = texts
          .join("\n\n")
          .replace(/[ \t]+\n/g, "\n")
          .trim();
        if (join) text = text.replace(/([^\n])\n(?!\n)/g, "$1 ").replace(/-\s(?=[a-z])/g, "");
        if (!text) throw new Error("No text found. Try a sharper photo with the text the right way up.");
        return { text, confidence: conf / inputs.length, pages: inputs.length };
      },
      (e) => ({
        cause: e.message,
        fix: /No text/.test(e.message) ? undefined : "English text works best; other languages aren't bundled yet.",
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
          <FileChip
            files={[file]}
            noun={file.type === "application/pdf" ? "PDF" : "image"}
            onChange={() => (setFile(null), job.reset())}
          />
        ) : (
          <Dropzone
            accept={`${IMAGE_ACCEPT},application/pdf,.pdf`}
            typeLabel="an image or a scanned PDF"
            maxFileMb={50}
            onFiles={([f]) => (setFile(f), job.reset())}
            hint="Photo, screenshot or scanned PDF (up to 30 pages) · English"
          />
        )
      }
      settings={
        <label className="flex h-11 items-center gap-2 text-sm text-ink">
          <input
            type="checkbox"
            className="size-4"
            checked={join}
            onChange={(e) => (setJoin(e.target.checked), job.reset())}
          />{" "}
          Join lines into paragraphs
        </label>
      }
      action={{ label: "Get text", onClick: start, disabled: !file }}
      result={
        job.status === "done" &&
        job.result && (
          <div className="space-y-3">
            <textarea
              data-testid="ocr-text"
              readOnly
              value={job.result.text}
              aria-label="Recognised text"
              className="h-64 w-full rounded-2xl border border-line bg-solid p-4 font-mono text-sm text-ink"
            />
            <Done
              text={`${job.result.text.split(/\s+/).length} words · ${Math.round(job.result.confidence)}% confidence${job.result.pages > 1 ? ` · ${job.result.pages} pages` : ""} · ${formatBytes(new Blob([job.result.text]).size)}`}
            >
              <ResultActions
                items={[
                  {
                    name: `${stem(file!.name)}.txt`,
                    type: "text/plain",
                    text: job.result.text,
                    blob: new Blob([job.result.text], { type: "text/plain" }),
                  },
                ]}
                next={next}
                from={slug}
              />
            </Done>
          </div>
        )
      }
    />
  );
}
