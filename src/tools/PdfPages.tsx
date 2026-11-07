"use client";
/** Organize, Sign and PDF to JPG: page previews and rendering with pdf.js (self-hosted); saving with pdf-lib. */
import { ArrowLeft, ArrowRight, RotateCcw, RotateCw, Trash2, Undo2 } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Dropzone } from "@/components/tool/Dropzone";
import { FileChip } from "@/components/tool/FileChip";
import { ResultActions, useHandoff } from "@/components/tool/ToolChrome";
import { Field, ToolWorkspace, inputClass, useToolRun } from "@/components/tool/ToolWorkspace";
import { formatBytes } from "@/lib/utils";
import { parsePageRanges, rangesToPages, stem } from "@/lib/engines/pages";
import { canvasToBlob, openPdf, renderPage, type PdfDoc } from "@/lib/pdf/pdfjs";
import { pdfWorker } from "@/workers/clients";
import type { FormField } from "@/workers/pdf-ops";
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

/** A PDF opened with pdf.js, plus its file. Errors (encrypted, corrupt) surface as a message. */
function usePdfDoc() {
  const [file, setFile] = useState<File | null>(null);
  const [doc, setDoc] = useState<PdfDoc | null>(null);
  const [err, setErr] = useState<string | null>(null);
  useHandoff((items) => {
    const pdf = items.find((i) => i.type === "application/pdf" && i.blob);
    if (pdf) setFile(new File([pdf.blob!], pdf.name, { type: pdf.type }));
  });
  useEffect(() => {
    let cancelled = false;
    setDoc(null);
    setErr(null);
    if (!file) return;
    file
      .arrayBuffer()
      .then((b) => openPdf(b))
      .then((d) => !cancelled && setDoc(d))
      .catch((e: Error) => !cancelled && setErr(e.message));
    return () => {
      cancelled = true;
    };
  }, [file]);
  return { file, setFile, doc, err };
}

function PdfInput({ file, onFile, onClear }: { file: File | null; onFile: (f: File) => void; onClear: () => void }) {
  return file ? (
    <FileChip files={[file]} noun="PDF" onChange={onClear} />
  ) : (
    <Dropzone
      accept={PDF_ACCEPT}
      typeLabel="a PDF"
      maxFileMb={200}
      onFiles={([f]) => onFile(f)}
      hint="PDF up to 200 MB"
    />
  );
}

// ───────────────────────── Organize ─────────────────────────
type Card = { index: number; rotate: number; url?: string };

export function OrganizePdf({ slug, next }: ToolProps) {
  const { file, setFile, doc, err } = usePdfDoc();
  const [cards, setCards] = useState<Card[]>([]);
  const [history, setHistory] = useState<Card[][]>([]);
  const job = useToolRun<{ blob: Blob; pages: number }>();

  useEffect(() => {
    if (!doc) return setCards([]);
    let cancelled = false;
    const urls: string[] = [];
    setCards(Array.from({ length: doc.numPages }, (_, i) => ({ index: i, rotate: 0 })));
    setHistory([]);
    (async () => {
      for (let i = 1; i <= doc.numPages && !cancelled; i++) {
        const page = await doc.getPage(i);
        const c = await renderPage(doc, i, 150 / page.getViewport({ scale: 1 }).width);
        const url = URL.createObjectURL(await canvasToBlob(c, "image/jpeg", 0.7));
        urls.push(url);
        if (!cancelled) setCards((cs) => cs.map((x) => (x.index === i - 1 ? { ...x, url } : x)));
      }
    })();
    return () => {
      cancelled = true;
      urls.forEach(URL.revokeObjectURL);
    };
  }, [doc]);

  const edit = (f: (c: Card[]) => Card[]) => {
    setHistory((h) => [...h.slice(-30), cards]);
    setCards(f(cards));
    job.reset();
  };
  const start = async () => {
    const bytes = await file!.arrayBuffer();
    job.run(() =>
      pdfWorker.call(
        "organize",
        { bytes, pages: cards.map(({ index, rotate }) => ({ index, rotate })) },
        { transfer: [bytes] },
      ),
    );
  };
  const changed = doc && (cards.length !== doc.numPages || cards.some((c, i) => c.index !== i || c.rotate % 360));
  const btn = "grid size-11 sm:size-9 place-items-center rounded-full text-ink2 hover:bg-soft disabled:opacity-30";

  return (
    <ToolWorkspace
      status={err ? "error" : job.status}
      progress={job.progress}
      error={err ? { cause: err } : job.error}
      onRetry={() => (setFile(null), job.reset())}
      input={
        <div className="space-y-3">
          <PdfInput
            file={file}
            onFile={(f) => (setFile(f), job.reset())}
            onClear={() => (setFile(null), job.reset())}
          />
          {cards.length > 0 && (
            <>
              <div className="flex items-center justify-between text-sm text-ink2">
                <span>
                  {cards.length} of {doc!.numPages} pages
                </span>
                <button
                  type="button"
                  disabled={!history.length}
                  onClick={() => (setCards(history[history.length - 1]), setHistory((h) => h.slice(0, -1)))}
                  className="inline-flex h-10 items-center gap-1.5 rounded-full border border-line px-3 disabled:opacity-40"
                >
                  <Undo2 className="size-4" aria-hidden /> Undo
                </button>
              </div>
              <ol data-testid="page-grid" className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-5">
                {cards.map((c, i) => (
                  <li key={`${c.index}-${i}`} className="rounded-2xl border border-line bg-solid p-2">
                    <div className="grid aspect-[3/4] place-items-center overflow-hidden rounded-xl bg-soft">
                      {c.url ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={c.url}
                          alt={`Page ${c.index + 1}`}
                          className="max-h-full max-w-full shadow-sm transition-transform"
                          style={{ transform: `rotate(${c.rotate}deg)` }}
                        />
                      ) : (
                        <span className="text-xs text-ink2">Page {c.index + 1}</span>
                      )}
                    </div>
                    <p className="mt-1 text-center text-xs text-ink2">
                      {i + 1}
                      {c.index !== i && <span> (was {c.index + 1})</span>}
                    </p>
                    <div className="mt-1 flex justify-center">
                      <button
                        type="button"
                        className={btn}
                        aria-label={`Move page ${i + 1} left`}
                        disabled={i === 0}
                        onClick={() =>
                          edit((cs) => {
                            const x = [...cs];
                            [x[i - 1], x[i]] = [x[i], x[i - 1]];
                            return x;
                          })
                        }
                      >
                        <ArrowLeft className="size-4" aria-hidden />
                      </button>
                      <button
                        type="button"
                        className={btn}
                        aria-label={`Rotate page ${i + 1} left`}
                        onClick={() => edit((cs) => cs.map((x, j) => (j === i ? { ...x, rotate: x.rotate - 90 } : x)))}
                      >
                        <RotateCcw className="size-4" aria-hidden />
                      </button>
                      <button
                        type="button"
                        className={btn}
                        aria-label={`Rotate page ${i + 1} right`}
                        onClick={() => edit((cs) => cs.map((x, j) => (j === i ? { ...x, rotate: x.rotate + 90 } : x)))}
                      >
                        <RotateCw className="size-4" aria-hidden />
                      </button>
                      <button
                        type="button"
                        className={btn}
                        aria-label={`Delete page ${i + 1}`}
                        disabled={cards.length === 1}
                        onClick={() => edit((cs) => cs.filter((_, j) => j !== i))}
                      >
                        <Trash2 className="size-4" aria-hidden />
                      </button>
                      <button
                        type="button"
                        className={btn}
                        aria-label={`Move page ${i + 1} right`}
                        disabled={i === cards.length - 1}
                        onClick={() =>
                          edit((cs) => {
                            const x = [...cs];
                            [x[i + 1], x[i]] = [x[i], x[i + 1]];
                            return x;
                          })
                        }
                      >
                        <ArrowRight className="size-4" aria-hidden />
                      </button>
                    </div>
                  </li>
                ))}
              </ol>
            </>
          )}
        </div>
      }
      action={{ label: "Save PDF", onClick: start, disabled: !changed }}
      result={
        job.status === "done" &&
        job.result && (
          <Done text={`${job.result.pages} pages · ${formatBytes(job.result.blob.size)}`}>
            <ResultActions
              items={[{ name: `${stem(file!.name)}-organized.pdf`, type: "application/pdf", blob: job.result.blob }]}
              next={next}
              from={slug}
            />
          </Done>
        )
      }
    />
  );
}

// ───────────────────────── Sign ─────────────────────────
/** Crops a canvas to its non-transparent pixels and returns PNG bytes, or null if it's empty. */
async function trimToPng(c: HTMLCanvasElement): Promise<ArrayBuffer | null> {
  const ctx = c.getContext("2d")!;
  const { data, width, height } = ctx.getImageData(0, 0, c.width, c.height);
  let [x0, y0, x1, y1] = [width, height, -1, -1];
  for (let y = 0; y < height; y++)
    for (let x = 0; x < width; x++)
      if (data[(y * width + x) * 4 + 3] > 8) {
        if (x < x0) x0 = x;
        if (y < y0) y0 = y;
        if (x > x1) x1 = x;
        if (y > y1) y1 = y;
      }
  if (x1 < 0) return null;
  const pad = 4;
  const out = document.createElement("canvas");
  out.width = x1 - x0 + 1 + pad * 2;
  out.height = y1 - y0 + 1 + pad * 2;
  out.getContext("2d")!.drawImage(c, x0 - pad, y0 - pad, out.width, out.height, 0, 0, out.width, out.height);
  return (await canvasToBlob(out, "image/png")).arrayBuffer();
}

export function SignPdf({ slug, next }: ToolProps) {
  const { file, setFile, doc, err } = usePdfDoc();
  const [mode, setMode] = useState<"draw" | "type">("draw");
  const [typed, setTyped] = useState("");
  const [page, setPage] = useState(1);
  const [pos, setPos] = useState({ x: 0.55, y: 0.8 });
  const [width, setWidth] = useState(0.3);
  const [preview, setPreview] = useState<string | null>(null);
  const [drawn, setDrawn] = useState(false);
  const [addDate, setAddDate] = useState(false);
  const pad = useRef<HTMLCanvasElement>(null);
  const job = useToolRun<{ blob: Blob }>();
  const [fields, setFields] = useState<FormField[]>([]);
  const [values, setValues] = useState<Record<string, string | boolean>>({});
  const [flatten, setFlatten] = useState(false);

  // Fillable form fields (AcroForm), read by pdf-lib in the worker.
  useEffect(() => {
    setFields([]);
    setValues({});
    if (!doc || !file) return;
    let cancelled = false;
    file
      .arrayBuffer()
      .then((bytes) => pdfWorker.call("fields", { bytes }))
      .then((f) => !cancelled && setFields(f))
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [doc, file]);

  useEffect(() => {
    if (!doc) return;
    let url = "";
    let cancelled = false;
    const p = Math.min(Math.max(1, page), doc.numPages);
    (async () => {
      const pg = await doc.getPage(p);
      const c = await renderPage(doc, p, 520 / pg.getViewport({ scale: 1 }).width);
      url = URL.createObjectURL(await canvasToBlob(c, "image/jpeg", 0.8));
      if (!cancelled) setPreview(url);
    })();
    return () => {
      cancelled = true;
      if (url) URL.revokeObjectURL(url);
    };
  }, [doc, page]);

  // Typed signature: draw it on the pad canvas so both modes produce the same PNG.
  useEffect(() => {
    if (mode !== "type" || !pad.current) return;
    const c = pad.current;
    const ctx = c.getContext("2d")!;
    ctx.clearRect(0, 0, c.width, c.height);
    ctx.fillStyle = "#1a237e";
    ctx.font = "italic 64px Georgia, 'Times New Roman', serif";
    ctx.textBaseline = "middle";
    ctx.fillText(typed, 16, c.height / 2, c.width - 32);
  }, [typed, mode]);

  const drawing = useRef(false);
  const pt = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    return [
      ((e.clientX - r.left) / r.width) * e.currentTarget.width,
      ((e.clientY - r.top) / r.height) * e.currentTarget.height,
    ];
  };

  const hasSig = mode === "draw" ? drawn : typed.trim().length > 0;
  const filled = Object.keys(values).length > 0;
  const start = async () => {
    const png = hasSig ? await trimToPng(pad.current!) : null;
    const bytes = await file!.arrayBuffer();
    const date = addDate
      ? new Date().toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })
      : undefined;
    job.run(() =>
      pdfWorker.call(
        "sign",
        { bytes, png: png ?? undefined, fields: values, flatten, page, x: pos.x, y: pos.y, w: width, date },
        { transfer: png ? [bytes, png] : [bytes] },
      ),
    );
  };
  const setValue = (name: string, v: string | boolean) => (setValues((x) => ({ ...x, [name]: v })), job.reset());

  return (
    <ToolWorkspace
      status={err ? "error" : job.status}
      progress={job.progress}
      error={err ? { cause: err } : job.error}
      onRetry={() => (setFile(null), job.reset())}
      input={
        <div className="space-y-4">
          <PdfInput
            file={file}
            onFile={(f) => (setFile(f), setPage(1), job.reset())}
            onClear={() => (setFile(null), job.reset())}
          />
          {doc && (
            <div className="grid gap-4 lg:grid-cols-2">
              <div className="space-y-2">
                <div className="flex gap-2" role="tablist" aria-label="Signature">
                  {(["draw", "type"] as const).map((m) => (
                    <button
                      key={m}
                      type="button"
                      role="tab"
                      aria-selected={mode === m}
                      onClick={() => setMode(m)}
                      className={`h-10 rounded-full px-4 text-sm font-medium ${mode === m ? "bg-ink text-bg" : "border border-line text-ink"}`}
                    >
                      {m === "draw" ? "Draw" : "Type"}
                    </button>
                  ))}
                  <button
                    type="button"
                    onClick={() => {
                      pad.current!.getContext("2d")!.clearRect(0, 0, 600, 200);
                      setDrawn(false);
                      setTyped("");
                    }}
                    className="ml-auto h-10 rounded-full border border-line px-4 text-sm"
                  >
                    Clear
                  </button>
                </div>
                {mode === "type" && (
                  <input
                    value={typed}
                    onChange={(e) => setTyped(e.target.value)}
                    placeholder="Your name"
                    aria-label="Type your name"
                    className={`${inputClass} w-full`}
                  />
                )}
                <canvas
                  ref={pad}
                  width={600}
                  height={200}
                  data-testid="signature-pad"
                  aria-label="Signature pad: draw with your mouse, finger or pen"
                  className="w-full touch-none rounded-2xl border border-dashed border-line2 bg-solid"
                  onPointerDown={(e) => {
                    if (mode !== "draw") return;
                    drawing.current = true;
                    e.currentTarget.setPointerCapture(e.pointerId);
                    const ctx = e.currentTarget.getContext("2d")!;
                    const [x, y] = pt(e);
                    ctx.beginPath();
                    ctx.moveTo(x, y);
                  }}
                  onPointerMove={(e) => {
                    if (!drawing.current) return;
                    const ctx = e.currentTarget.getContext("2d")!;
                    const [x, y] = pt(e);
                    ctx.lineWidth = 3.2;
                    ctx.lineCap = ctx.lineJoin = "round";
                    ctx.strokeStyle = "#1a237e";
                    ctx.lineTo(x, y);
                    ctx.stroke();
                    setDrawn(true);
                  }}
                  onPointerUp={() => (drawing.current = false)}
                />
                <div className="flex flex-wrap gap-3">
                  <Field label="Page">
                    <input
                      type="number"
                      min={1}
                      max={doc.numPages}
                      value={page}
                      onChange={(e) => setPage(Math.min(doc.numPages, Math.max(1, +e.target.value || 1)))}
                      className={`${inputClass} w-24`}
                    />
                  </Field>
                  <Field label="Size">
                    <input
                      type="range"
                      min={0.1}
                      max={0.6}
                      step={0.02}
                      value={width}
                      onChange={(e) => setWidth(+e.target.value)}
                      className="kk-range w-40"
                      aria-label="Signature size"
                    />
                  </Field>
                  <label className="flex h-11 items-end gap-2 pb-2 text-sm text-ink">
                    <input
                      type="checkbox"
                      checked={addDate}
                      onChange={(e) => setAddDate(e.target.checked)}
                      className="size-4"
                    />{" "}
                    Add today&apos;s date
                  </label>
                </div>
                <p className="text-xs text-ink2">
                  Click the page preview to place the signature. It stays on your device.
                </p>
              </div>
              <div
                data-testid="sign-preview"
                className="relative cursor-crosshair overflow-hidden rounded-2xl border border-line bg-soft"
                onClick={(e) => {
                  const r = e.currentTarget.getBoundingClientRect();
                  setPos({
                    x: Math.min(1 - width, Math.max(0, (e.clientX - r.left) / r.width - width / 2)),
                    y: Math.max(0, (e.clientY - r.top) / r.height - 0.03),
                  });
                  job.reset();
                }}
              >
                {preview && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={preview} alt={`Page ${page} of ${doc.numPages}`} className="block w-full" />
                )}
                <div
                  aria-hidden
                  className="pointer-events-none absolute rounded border-2 border-dashed border-[var(--accent)] bg-[var(--accentSoft)]"
                  style={{
                    left: `${pos.x * 100}%`,
                    top: `${pos.y * 100}%`,
                    width: `${width * 100}%`,
                    aspectRatio: "3 / 1",
                  }}
                />
              </div>
            </div>
          )}
          {fields.length > 0 && (
            <fieldset data-testid="form-fields" className="rounded-[20px] border border-line p-4">
              <legend className="px-2 text-sm font-medium text-ink">Form fields ({fields.length})</legend>
              <div className="grid gap-3 sm:grid-cols-2">
                {fields.map((f) =>
                  f.type === "checkbox" ? (
                    <label key={f.name} className="flex h-11 items-center gap-2 text-sm text-ink">
                      <input
                        type="checkbox"
                        className="size-4"
                        checked={Boolean(values[f.name] ?? f.value)}
                        onChange={(e) => setValue(f.name, e.target.checked)}
                      />
                      {f.name}
                    </label>
                  ) : f.type === "dropdown" || f.type === "radio" ? (
                    <Field key={f.name} label={f.name}>
                      <select
                        value={String(values[f.name] ?? f.value)}
                        onChange={(e) => setValue(f.name, e.target.value)}
                        className={inputClass}
                      >
                        <option value="">—</option>
                        {f.options!.map((o) => (
                          <option key={o} value={o}>
                            {o}
                          </option>
                        ))}
                      </select>
                    </Field>
                  ) : (
                    <Field key={f.name} label={f.name}>
                      <input
                        value={String(values[f.name] ?? f.value)}
                        onChange={(e) => setValue(f.name, e.target.value)}
                        className={`${inputClass} w-full`}
                      />
                    </Field>
                  ),
                )}
              </div>
              <label className="mt-3 flex h-11 items-center gap-2 text-sm text-ink">
                <input
                  type="checkbox"
                  className="size-4"
                  checked={flatten}
                  onChange={(e) => (setFlatten(e.target.checked), job.reset())}
                />{" "}
                Lock the answers (flatten, so they can&apos;t be edited)
              </label>
            </fieldset>
          )}
        </div>
      }
      action={{
        label: hasSig || !filled ? "Sign PDF" : "Save filled PDF",
        onClick: start,
        disabled: !doc || (!hasSig && !filled),
      }}
      result={
        job.status === "done" &&
        job.result && (
          <Done
            text={
              hasSig
                ? `Signed on page ${page}${filled ? ` · ${Object.keys(values).length} fields filled` : ""}`
                : `${Object.keys(values).length} fields filled`
            }
          >
            <ResultActions
              items={[{ name: `${stem(file!.name)}-signed.pdf`, type: "application/pdf", blob: job.result.blob }]}
              next={next}
              from={slug}
            />
          </Done>
        )
      }
    />
  );
}

// ───────────────────────── PDF to JPG ─────────────────────────
export function PdfToJpg({ slug, next }: ToolProps) {
  const { file, setFile, doc, err } = usePdfDoc();
  const [format, setFormat] = useState<"image/jpeg" | "image/png">("image/jpeg");
  const [dpi, setDpi] = useState(150);
  const [pages, setPages] = useState("all");
  const job = useToolRun<{ name: string; blob: Blob; w: number; h: number }[]>();
  const ext = format === "image/png" ? "png" : "jpg";

  const start = () =>
    job.run(async (onProgress) => {
      const list = rangesToPages(parsePageRanges(pages, doc!.numPages));
      const out = [];
      for (const [k, p] of list.entries()) {
        onProgress({ ratio: k / list.length, label: `Page ${p} (${k + 1} of ${list.length})` });
        const c = await renderPage(doc!, p, dpi / 72);
        out.push({
          name: `${stem(file!.name)}-page-${p}.${ext}`,
          blob: await canvasToBlob(c, format, 0.9),
          w: c.width,
          h: c.height,
        });
        await new Promise((r) => setTimeout(r)); // keep the page responsive between pages
      }
      return out;
    });

  return (
    <ToolWorkspace
      status={err ? "error" : job.status}
      progress={job.progress}
      error={err ? { cause: err } : job.error}
      onRetry={() => (setFile(null), job.reset())}
      input={
        <PdfInput file={file} onFile={(f) => (setFile(f), job.reset())} onClear={() => (setFile(null), job.reset())} />
      }
      settings={
        <>
          <Field label="Format">
            <select
              value={format}
              onChange={(e) => (setFormat(e.target.value as typeof format), job.reset())}
              className={inputClass}
            >
              <option value="image/jpeg">JPG</option>
              <option value="image/png">PNG</option>
            </select>
          </Field>
          <Field label="Quality">
            <select value={dpi} onChange={(e) => (setDpi(+e.target.value), job.reset())} className={inputClass}>
              <option value={72}>Screen (72 dpi)</option>
              <option value={150}>Standard (150 dpi)</option>
              <option value={300}>Print (300 dpi)</option>
            </select>
          </Field>
          <Field label="Pages">
            <input
              value={pages}
              onChange={(e) => (setPages(e.target.value), job.reset())}
              placeholder="all, 1-3, 5"
              className={`${inputClass} w-32`}
            />
          </Field>
          {doc && <p className="basis-full text-xs text-ink2">{doc.numPages} pages in this PDF</p>}
        </>
      }
      action={{ label: `Convert to ${ext.toUpperCase()}`, onClick: start, disabled: !doc }}
      result={
        job.status === "done" &&
        job.result && (
          <Done
            text={`${job.result.length} image${job.result.length === 1 ? "" : "s"} · ${job.result[0].w}×${job.result[0].h} · ${formatBytes(job.result.reduce((s, r) => s + r.blob.size, 0))}`}
          >
            <ResultActions
              items={job.result.map((r) => ({ name: r.name, type: format, blob: r.blob }))}
              zipName={`${stem(file!.name)}-images.zip`}
              next={next}
              from={slug}
            />
          </Done>
        )
      }
    />
  );
}
