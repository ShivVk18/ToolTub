"use client";
/**
 * Image and creator tools built on the browser canvas: Crop, EXIF Remover, Bulk Rename, Social Image Resizer,
 * Thumbnail Preview, Meme Generator, Image Watermark, Colour Palette, Colour Picker and Collage Maker.
 * Nothing is uploaded; logic that doesn't need a canvas lives in lib/engines/imaging.ts (unit-tested).
 */
import { FlipHorizontal, RotateCw } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { Dropzone } from "@/components/tool/Dropzone";
import { FileChip } from "@/components/tool/FileChip";
import { FileList } from "@/components/tool/FileList";
import { ResultActions, useHandoff } from "@/components/tool/ToolChrome";
import { Field, ToolWorkspace, inputClass, useToolRun } from "@/components/tool/ToolWorkspace";
import { formatBytes } from "@/lib/utils";
import { stem } from "@/lib/engines/pages";
import { parseColor } from "@/lib/engines/color";
import {
  SOCIAL_SIZES,
  aspectCrop,
  collageCells,
  containRect,
  coverRect,
  exifSummary,
  palette,
  renameAll,
  stripMetadata,
  thumbnailChecks,
  toHex,
  wrapText,
  type ExifSummary,
  type Swatch,
} from "@/lib/engines/imaging";
import { IMAGE_ACCEPT, IMAGE_LABEL, checkSize, extFor, loadBitmap, makeCanvas, outType, toBlob } from "@/lib/canvas";
import type { Artifact } from "@/lib/store/klip";
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

/** One image file with handoff from other tools. */
function useOneImage() {
  const [file, setFile] = useState<File | null>(null);
  useHandoff((items) => {
    const im = items.find((i) => i.type.startsWith("image/") && i.blob);
    if (im) setFile(new File([im.blob!], im.name, { type: im.type }));
  });
  return [file, setFile] as const;
}
function useImages() {
  const [files, setFiles] = useState<File[]>([]);
  useHandoff((items) =>
    setFiles((f) => [
      ...f,
      ...items
        .filter((i) => i.type.startsWith("image/") && i.blob)
        .map((i) => new File([i.blob!], i.name, { type: i.type })),
    ]),
  );
  return [files, setFiles] as const;
}
/** An object URL for a blob, revoked when it changes. */
function useObjectUrl(b: Blob | null) {
  const url = useMemo(() => (b ? URL.createObjectURL(b) : null), [b]);
  useEffect(() => () => void (url && URL.revokeObjectURL(url)), [url]);
  return url;
}
function OneImageInput({
  file,
  setFile,
  onChange,
}: {
  file: File | null;
  setFile: (f: File | null) => void;
  onChange: () => void;
}) {
  return file ? (
    <FileChip files={[file]} noun="image" onChange={() => (setFile(null), onChange())} />
  ) : (
    <Dropzone
      accept={IMAGE_ACCEPT}
      typeLabel={IMAGE_LABEL}
      maxFileMb={50}
      onFiles={([f]) => (setFile(f), onChange())}
      hint="JPG, PNG, WebP, AVIF or GIF up to 50 MB"
    />
  );
}
function ManyImagesInput({
  files,
  setFiles,
  onChange,
  hint,
  accept = IMAGE_ACCEPT,
  label = IMAGE_LABEL,
  noun = "image",
}: {
  files: File[];
  setFiles: (f: File[] | ((x: File[]) => File[])) => void;
  onChange: () => void;
  hint: string;
  accept?: string;
  label?: string;
  noun?: string;
}) {
  return (
    <div className="space-y-3">
      {files.length > 0 && <FileList files={files} noun={noun} onChange={(f) => (setFiles(f), onChange())} />}
      <Dropzone
        accept={accept}
        typeLabel={label}
        multiple
        maxFileMb={50}
        onFiles={(f) => (setFiles((x) => [...x, ...f]), onChange())}
        hint={files.length ? `Add more` : hint}
      />
    </div>
  );
}

// ───────────────────────── Crop ─────────────────────────
type Rect = { x: number; y: number; w: number; h: number };
const ASPECTS: [string, number | null][] = [
  ["Free", null],
  ["1:1 square", 1],
  ["4:5 portrait", 4 / 5],
  ["16:9 wide", 16 / 9],
  ["9:16 story", 9 / 16],
  ["3:2 photo", 3 / 2],
];

export function CropImage({ slug, next }: ToolProps) {
  const [file, setFile] = useOneImage();
  const [src, setSrc] = useState<{ canvas: HTMLCanvasElement; url: string } | null>(null);
  const [rot, setRot] = useState(0);
  const [flip, setFlip] = useState(false);
  const [aspect, setAspect] = useState<number | null>(null);
  const [rect, setRect] = useState<Rect>({ x: 0, y: 0, w: 0, h: 0 });
  const [err, setErr] = useState<string | null>(null);
  const job = useToolRun<{ blob: Blob; w: number; h: number }>();
  const box = useRef<HTMLDivElement>(null);

  // Rotated/flipped source on a canvas; the crop rectangle is in its pixels.
  useEffect(() => {
    if (!file) return setSrc(null);
    let cancelled = false;
    setErr(null);
    loadBitmap(file)
      .then((bmp) => {
        const swap = rot % 180 !== 0;
        checkSize(bmp.width, bmp.height);
        const { c, ctx } = makeCanvas(swap ? bmp.height : bmp.width, swap ? bmp.width : bmp.height);
        ctx.translate(c.width / 2, c.height / 2);
        ctx.rotate((rot * Math.PI) / 180);
        if (flip) ctx.scale(-1, 1);
        ctx.drawImage(bmp, -bmp.width / 2, -bmp.height / 2);
        if (cancelled) return;
        setSrc((old) => {
          if (old) URL.revokeObjectURL(old.url);
          return { canvas: c, url: c.toDataURL("image/jpeg", 0.8) };
        });
        setRect(aspect ? aspectCrop(c.width, c.height, aspect) : { x: 0, y: 0, w: c.width, h: c.height });
      })
      .catch((e: Error) => !cancelled && setErr(e.message));
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [file, rot, flip]);

  const W = src?.canvas.width ?? 1;
  const H = src?.canvas.height ?? 1;
  const clamp = (r: Rect): Rect => {
    let w = Math.max(1, Math.min(W, Math.round(r.w)));
    let h = Math.max(1, Math.min(H, Math.round(r.h)));
    if (aspect) {
      if (w / h > aspect) w = Math.round(h * aspect);
      else h = Math.round(w / aspect);
    }
    return { x: Math.max(0, Math.min(W - w, Math.round(r.x))), y: Math.max(0, Math.min(H - h, Math.round(r.y))), w, h };
  };
  const drag = useRef<{ mode: "move" | "size"; sx: number; sy: number; r: Rect } | null>(null);
  const onPointer = (e: React.PointerEvent, mode: "move" | "size") => {
    e.stopPropagation();
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    drag.current = { mode, sx: e.clientX, sy: e.clientY, r: rect };
  };
  const onMove = (e: React.PointerEvent) => {
    const d = drag.current;
    if (!d || !box.current) return;
    const s = W / box.current.getBoundingClientRect().width;
    const dx = (e.clientX - d.sx) * s;
    const dy = (e.clientY - d.sy) * s;
    setRect(
      clamp(d.mode === "move" ? { ...d.r, x: d.r.x + dx, y: d.r.y + dy } : { ...d.r, w: d.r.w + dx, h: d.r.h + dy }),
    );
    job.reset();
  };

  const start = () =>
    job.run(async () => {
      const type = outType(file!.type);
      const { c, ctx } = makeCanvas(rect.w, rect.h);
      ctx.drawImage(src!.canvas, rect.x, rect.y, rect.w, rect.h, 0, 0, rect.w, rect.h);
      return { blob: await toBlob(c, type), w: rect.w, h: rect.h };
    });
  const num = (k: keyof Rect) => (
    <Field label={k.toUpperCase()}>
      <input
        type="number"
        min={0}
        value={rect[k]}
        onChange={(e) => (setRect(clamp({ ...rect, [k]: +e.target.value })), job.reset())}
        className={`${inputClass} w-24`}
      />
    </Field>
  );

  return (
    <ToolWorkspace
      status={err ? "error" : job.status}
      progress={job.progress}
      error={err ? { cause: err } : job.error}
      onRetry={() => (setFile(null), job.reset())}
      input={
        <div className="space-y-3">
          <OneImageInput file={file} setFile={setFile} onChange={() => (setRot(0), setFlip(false), job.reset())} />
          {src && (
            <div
              ref={box}
              data-testid="crop-stage"
              className="relative mx-auto w-fit max-w-full touch-none select-none overflow-hidden rounded-2xl bg-soft"
              onPointerMove={onMove}
              onPointerUp={() => (drag.current = null)}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={src.url} alt="Image to crop" className="block max-h-[420px] max-w-full" draggable={false} />
              <div
                data-testid="crop-box"
                className="absolute cursor-move border-2 border-white shadow-[0_0_0_9999px_rgba(0,0,0,0.45)]"
                style={{
                  left: `${(rect.x / W) * 100}%`,
                  top: `${(rect.y / H) * 100}%`,
                  width: `${(rect.w / W) * 100}%`,
                  height: `${(rect.h / H) * 100}%`,
                }}
                onPointerDown={(e) => onPointer(e, "move")}
              >
                <span
                  aria-hidden
                  className="absolute -bottom-2 -right-2 size-5 cursor-nwse-resize rounded-full border-2 border-white bg-[var(--accent)]"
                  onPointerDown={(e) => onPointer(e, "size")}
                />
              </div>
            </div>
          )}
        </div>
      }
      settings={
        src && (
          <>
            <Field label="Aspect">
              <select
                value={ASPECTS.findIndex(([, a]) => a === aspect)}
                onChange={(e) => {
                  const a = ASPECTS[+e.target.value][1];
                  setAspect(a);
                  setRect(a ? aspectCrop(W, H, a) : { x: 0, y: 0, w: W, h: H });
                  job.reset();
                }}
                className={inputClass}
              >
                {ASPECTS.map(([l], i) => (
                  <option key={l} value={i}>
                    {l}
                  </option>
                ))}
              </select>
            </Field>
            {num("x")}
            {num("y")}
            {num("w")}
            {num("h")}
            <button
              type="button"
              aria-label="Rotate 90° clockwise"
              onClick={() => (setRot((r) => (r + 90) % 360), job.reset())}
              className="grid size-11 place-items-center rounded-full border border-line"
            >
              <RotateCw className="size-4" aria-hidden />
            </button>
            <button
              type="button"
              aria-label="Flip horizontally"
              aria-pressed={flip}
              onClick={() => (setFlip((f) => !f), job.reset())}
              className="grid size-11 place-items-center rounded-full border border-line"
            >
              <FlipHorizontal className="size-4" aria-hidden />
            </button>
          </>
        )
      }
      action={{ label: "Crop image", onClick: start, disabled: !src }}
      result={
        job.status === "done" &&
        job.result && (
          <Done text={`${job.result.w}×${job.result.h} · ${formatBytes(job.result.blob.size)}`}>
            <ResultActions
              items={[
                {
                  name: `${stem(file!.name)}-cropped.${extFor(job.result.blob.type)}`,
                  type: job.result.blob.type,
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

// ───────────────────────── EXIF remover ─────────────────────────
type Cleaned = {
  name: string;
  blob: Blob;
  before: number;
  removed: string[];
  exif: ExifSummary | null;
  reencoded: boolean;
};

export function ExifRemover({ slug, next }: ToolProps) {
  const [files, setFiles] = useImages();
  const job = useToolRun<Cleaned[]>();
  const start = () =>
    job.run(async (onProgress) => {
      const out: Cleaned[] = [];
      for (const [i, f] of files.entries()) {
        onProgress({ ratio: i / files.length, label: `Cleaning ${f.name}` });
        const bytes = new Uint8Array(await f.arrayBuffer());
        const exif = exifSummary(bytes);
        try {
          const r = stripMetadata(bytes);
          out.push({
            name: f.name,
            blob: new Blob([r.bytes as BlobPart], { type: f.type }),
            before: f.size,
            removed: r.removed,
            exif,
            reencoded: false,
          });
        } catch (e) {
          if (/damaged/.test((e as Error).message)) throw new Error(`"${f.name}" is damaged.`);
          // AVIF/GIF: no lossless path, so redraw (drops all metadata; GIF animation becomes the first frame).
          const bmp = await loadBitmap(f, f.name);
          const { c, ctx } = makeCanvas(bmp.width, bmp.height);
          ctx.drawImage(bmp, 0, 0);
          const type = outType(f.type);
          out.push({
            name: `${stem(f.name)}.${extFor(type)}`,
            blob: await toBlob(c, type),
            before: f.size,
            removed: ["all (re-encoded)"],
            exif: null,
            reencoded: true,
          });
        }
      }
      return out;
    });
  const gpsCount = job.result?.filter((r) => r.exif?.gps).length ?? 0;
  return (
    <ToolWorkspace
      status={job.status}
      progress={job.progress}
      error={job.error}
      onRetry={() => job.reset()}
      input={
        <ManyImagesInput
          files={files}
          setFiles={setFiles}
          onChange={job.reset}
          hint="Photos (JPG, PNG, WebP; AVIF/GIF are re-encoded)"
        />
      }
      action={{ label: "Remove metadata", onClick: start, disabled: !files.length }}
      result={
        job.status === "done" &&
        job.result && (
          <div className="space-y-3">
            <Done text={`${job.result.length} cleaned${gpsCount ? ` · removed GPS location from ${gpsCount}` : ""}`}>
              <ResultActions
                items={job.result.map((r) => ({ name: r.name, type: r.blob.type, blob: r.blob }))}
                zipName="cleaned-photos.zip"
                next={next}
                from={slug}
              />
            </Done>
            <ul data-testid="exif-report" className="space-y-1 text-sm text-ink2">
              {job.result.map((r) => (
                <li key={r.name}>
                  <b className="text-ink">{r.name}</b>:{" "}
                  {r.removed.length ? `removed ${r.removed.join(", ")}` : "no metadata found"}
                  {r.exif?.gps &&
                    r.exif.lat !== undefined &&
                    ` (location ${r.exif.lat.toFixed(4)}, ${r.exif.lon?.toFixed(4)})`}
                  {r.exif?.make && ` · camera ${[r.exif.make, r.exif.model].filter(Boolean).join(" ")}`}
                  {!r.reencoded && " · picture unchanged"}
                </li>
              ))}
            </ul>
          </div>
        )
      }
    />
  );
}

// ───────────────────────── Bulk rename ─────────────────────────
export function BulkRename({ slug }: ToolProps) {
  const [files, setFiles] = useState<File[]>([]);
  const [pattern, setPattern] = useState("{name}");
  const [startAt, setStartAt] = useState(1);
  const [pad, setPad] = useState(2);
  const [maxW, setMaxW] = useState(0);
  const names = useMemo(
    () => renameAll(files, pattern, startAt, pad, Intl.DateTimeFormat().resolvedOptions().timeZone),
    [files, pattern, startAt, pad],
  );
  const job = useToolRun<Artifact[]>();
  // Renaming alone needs no processing; resizing photos (optional) re-encodes only the images that are larger.
  const start = () =>
    job.run(async (onProgress) => {
      const out: Artifact[] = [];
      for (const [i, f] of files.entries()) {
        onProgress({ ratio: i / files.length, label: `Preparing ${f.name}` });
        let blob: Blob = f;
        if (maxW && /^image\/(jpeg|png|webp)$/.test(f.type)) {
          const bmp = await loadBitmap(f, f.name);
          if (bmp.width > maxW) {
            const h = Math.round((bmp.height * maxW) / bmp.width);
            const { c, ctx } = makeCanvas(maxW, h);
            ctx.drawImage(bmp, 0, 0, maxW, h);
            blob = await toBlob(c, outType(f.type) === "image/webp" ? "image/webp" : f.type, 0.9);
          }
        }
        out.push({ name: names[i], type: f.type || "application/octet-stream", blob });
      }
      return out;
    });
  return (
    <ToolWorkspace
      status={job.status}
      progress={job.progress}
      error={job.error}
      onRetry={() => job.reset()}
      input={
        <ManyImagesInput
          files={files}
          setFiles={setFiles}
          onChange={job.reset}
          hint="Any files: photos, PDFs, documents"
          accept="*/*"
          label="a file"
          noun="file"
        />
      }
      settings={
        <>
          <Field label="Pattern">
            <input
              value={pattern}
              onChange={(e) => (setPattern(e.target.value), job.reset())}
              className={`${inputClass} w-64`}
            />
          </Field>
          <Field label="Start at">
            <input
              type="number"
              min={0}
              value={startAt}
              onChange={(e) => (setStartAt(Math.max(0, +e.target.value)), job.reset())}
              className={`${inputClass} w-24`}
            />
          </Field>
          <Field label="Digits">
            <select value={pad} onChange={(e) => (setPad(+e.target.value), job.reset())} className={inputClass}>
              {[1, 2, 3, 4].map((n) => (
                <option key={n} value={n}>
                  {n} ({String(startAt).padStart(n, "0")})
                </option>
              ))}
            </select>
          </Field>
          <Field label="Resize photos">
            <select value={maxW} onChange={(e) => (setMaxW(+e.target.value), job.reset())} className={inputClass}>
              <option value={0}>Keep size</option>
              <option value={2560}>Max 2560 px wide</option>
              <option value={1920}>Max 1920 px wide</option>
              <option value={1280}>Max 1280 px wide</option>
              <option value={800}>Max 800 px wide</option>
            </select>
          </Field>
          <p className="basis-full text-xs text-ink2">
            Use <code>{"{name}"}</code>, <code>{"{n}"}</code> (number), <code>{"{date}"}</code> (file date),{" "}
            <code>{"{ext}"}</code>. The extension is always kept.
          </p>
        </>
      }
      action={{
        label: `Rename ${files.length || ""} file${files.length === 1 ? "" : "s"}`.replace("  ", " "),
        onClick: start,
        disabled: !files.length,
      }}
      result={
        files.length > 0 && (
          <div className="space-y-3">
            <ol
              data-testid="rename-preview"
              className="max-h-72 space-y-1 overflow-auto rounded-2xl border border-line p-3 font-mono text-xs"
            >
              {files.map((f, i) => (
                <li key={i} className="truncate">
                  <span className="text-ink2">{f.name}</span> → <b className="text-ink">{names[i]}</b>
                </li>
              ))}
            </ol>
            {job.status === "done" && job.result && (
              <Done
                text={`${files.length} file${files.length === 1 ? "" : "s"} renamed${maxW ? `, photos up to ${maxW} px wide` : ""}`}
              >
                <ResultActions items={job.result} zipName="renamed-files.zip" from={slug} />
              </Done>
            )}
          </div>
        )
      }
    />
  );
}

// ───────────────────────── Social image resizer ─────────────────────────
export function SocialImageResizer({ slug, next }: ToolProps) {
  const [file, setFile] = useOneImage();
  const [chosen, setChosen] = useState<string[]>(["ig-square", "ig-portrait", "ig-story"]);
  const [fit, setFit] = useState<"cover" | "blur" | "color">("cover");
  const [bg, setBg] = useState("#ffffff");
  const [focus, setFocus] = useState(0.5);
  const job = useToolRun<{ name: string; blob: Blob; w: number; h: number }[]>();
  const start = () =>
    job.run(async (onProgress) => {
      const bmp = await loadBitmap(file!);
      const out = [];
      const sizes = SOCIAL_SIZES.filter((s) => chosen.includes(s.id));
      for (const [i, s] of sizes.entries()) {
        onProgress({ ratio: i / sizes.length, label: s.label });
        const { c, ctx } = makeCanvas(s.w, s.h);
        if (fit === "cover") {
          const r = coverRect(bmp.width, bmp.height, s.w, s.h, focus);
          ctx.drawImage(bmp, r.x, r.y, r.w, r.h, 0, 0, s.w, s.h);
        } else {
          if (fit === "blur") {
            const r = coverRect(bmp.width, bmp.height, s.w, s.h);
            ctx.filter = "blur(40px) brightness(0.85)";
            ctx.drawImage(bmp, r.x, r.y, r.w, r.h, -60, -60, s.w + 120, s.h + 120);
            ctx.filter = "none";
          } else {
            ctx.fillStyle = bg;
            ctx.fillRect(0, 0, s.w, s.h);
          }
          const d = containRect(bmp.width, bmp.height, s.w, s.h);
          ctx.drawImage(bmp, d.x, d.y, d.w, d.h);
        }
        out.push({
          name: `${stem(file!.name)}-${s.id}-${s.w}x${s.h}.jpg`,
          blob: await toBlob(c, "image/jpeg", 0.9),
          w: s.w,
          h: s.h,
        });
      }
      return out;
    });
  return (
    <ToolWorkspace
      status={job.status}
      progress={job.progress}
      error={job.error}
      onRetry={() => (setFile(null), job.reset())}
      input={<OneImageInput file={file} setFile={setFile} onChange={job.reset} />}
      settings={
        <>
          <fieldset className="basis-full">
            <legend className="mb-2 text-sm text-fg-muted">Sizes</legend>
            <div className="grid gap-1 sm:grid-cols-2">
              {SOCIAL_SIZES.map((s) => (
                <label key={s.id} className="flex min-h-11 items-center gap-2 text-sm text-ink">
                  <input
                    type="checkbox"
                    className="size-4"
                    checked={chosen.includes(s.id)}
                    onChange={(e) => (
                      setChosen((c) => (e.target.checked ? [...c, s.id] : c.filter((x) => x !== s.id))),
                      job.reset()
                    )}
                  />
                  {s.label}{" "}
                  <span className="text-ink2">
                    {s.w}×{s.h}
                  </span>
                </label>
              ))}
            </div>
          </fieldset>
          <Field label="Fit">
            <select
              value={fit}
              onChange={(e) => (setFit(e.target.value as typeof fit), job.reset())}
              className={inputClass}
            >
              <option value="cover">Fill the frame (crop)</option>
              <option value="blur">Whole image, blurred background</option>
              <option value="color">Whole image, colour background</option>
            </select>
          </Field>
          {fit === "cover" && (
            <Field label="Keep">
              <select value={focus} onChange={(e) => (setFocus(+e.target.value), job.reset())} className={inputClass}>
                <option value={0}>Top</option>
                <option value={0.5}>Centre</option>
                <option value={1}>Bottom</option>
              </select>
            </Field>
          )}
          {fit === "color" && (
            <Field label="Background">
              <input
                type="color"
                value={bg}
                onChange={(e) => (setBg(e.target.value), job.reset())}
                className="h-11 w-14 rounded-xl border border-line bg-solid"
              />
            </Field>
          )}
        </>
      }
      action={{
        label: `Make ${chosen.length} size${chosen.length === 1 ? "" : "s"}`,
        onClick: start,
        disabled: !file || !chosen.length,
      }}
      result={
        job.status === "done" &&
        job.result && (
          <Done
            text={`${job.result.length} image${job.result.length === 1 ? "" : "s"}: ${job.result.map((r) => `${r.w}×${r.h}`).join(", ")}`}
          >
            <ResultActions
              items={job.result.map((r) => ({ name: r.name, type: "image/jpeg", blob: r.blob }))}
              zipName={`${stem(file!.name)}-social.zip`}
              next={next}
              from={slug}
            />
          </Done>
        )
      }
    />
  );
}

// ───────────────────────── Thumbnail preview ─────────────────────────
export function ThumbnailPreview({ slug, next }: ToolProps) {
  const [file, setFile] = useOneImage();
  const [title, setTitle] = useState("I tried every free PDF tool so you don't have to");
  const [channel, setChannel] = useState("KlipKit");
  const [dark, setDark] = useState(false);
  const [dims, setDims] = useState<[number, number] | null>(null);
  const url = useObjectUrl(file);
  const job = useToolRun<{ blob: Blob }>();
  useEffect(() => {
    setDims(null);
    if (file)
      loadBitmap(file)
        .then((b) => setDims([b.width, b.height]))
        .catch(() => setDims(null));
  }, [file]);
  const checks = file && dims ? thumbnailChecks(dims[0], dims[1], file.size, file.type) : [];
  const start = () =>
    job.run(async () => {
      const bmp = await loadBitmap(file!);
      const { c, ctx } = makeCanvas(1280, 720);
      const r = coverRect(bmp.width, bmp.height, 1280, 720);
      ctx.drawImage(bmp, r.x, r.y, r.w, r.h, 0, 0, 1280, 720);
      // Lower quality until it's under YouTube's 2 MB limit.
      let q = 0.92;
      let blob = await toBlob(c, "image/jpeg", q);
      while (blob.size > 2 * 1024 * 1024 && q > 0.4) blob = await toBlob(c, "image/jpeg", (q -= 0.1));
      return { blob };
    });
  const card = (w: number, layout: "grid" | "row") => (
    <div
      className={`flex ${layout === "row" ? "flex-row gap-3" : "flex-col gap-2"}`}
      style={{ width: layout === "row" ? w * 2.2 : w }}
    >
      <div
        className="relative shrink-0 overflow-hidden rounded-xl bg-black"
        style={{ width: w, aspectRatio: "16 / 9" }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        {url && <img src={url} alt="" className="size-full object-cover" />}
        <span className="absolute bottom-1 right-1 rounded bg-black/80 px-1 text-[11px] font-medium text-white">
          12:34
        </span>
      </div>
      <div className="min-w-0">
        <p
          className={`line-clamp-2 font-semibold leading-snug ${dark ? "text-white" : "text-black"}`}
          style={{ fontSize: w < 200 ? 13 : 15 }}
        >
          {title}
        </p>
        <p className={`mt-0.5 text-xs ${dark ? "text-neutral-400" : "text-neutral-600"}`}>
          {channel} · 12K views · 2 days ago
        </p>
      </div>
    </div>
  );
  return (
    <ToolWorkspace
      status={job.status}
      progress={job.progress}
      error={job.error}
      onRetry={() => (setFile(null), job.reset())}
      input={
        <div className="space-y-4">
          <OneImageInput file={file} setFile={setFile} onChange={job.reset} />
          {file && (
            <>
              <ul data-testid="thumb-checks" className="space-y-1 text-sm">
                {checks.map((c) => (
                  <li key={c.text} className={c.ok ? "text-[var(--g-c)]" : "text-[var(--g-p)]"}>
                    {c.ok ? "✓" : "!"} {c.text}
                  </li>
                ))}
              </ul>
              <div
                data-testid="thumb-previews"
                className={`space-y-6 overflow-x-auto rounded-2xl p-5 ${dark ? "bg-[#0f0f0f]" : "bg-white"}`}
              >
                <div>
                  <p className={`mb-2 text-xs ${dark ? "text-neutral-400" : "text-neutral-600"}`}>Home feed</p>
                  {card(320, "grid")}
                </div>
                <div>
                  <p className={`mb-2 text-xs ${dark ? "text-neutral-400" : "text-neutral-600"}`}>Up next (sidebar)</p>
                  {card(168, "row")}
                </div>
                <div>
                  <p className={`mb-2 text-xs ${dark ? "text-neutral-400" : "text-neutral-600"}`}>Search results</p>
                  {card(246, "row")}
                </div>
              </div>
            </>
          )}
        </div>
      }
      settings={
        file && (
          <>
            <Field label="Title">
              <input
                value={title}
                maxLength={100}
                onChange={(e) => setTitle(e.target.value)}
                className={`${inputClass} w-80`}
              />
            </Field>
            <Field label="Channel">
              <input
                value={channel}
                maxLength={40}
                onChange={(e) => setChannel(e.target.value)}
                className={`${inputClass} w-40`}
              />
            </Field>
            <label className="flex h-11 items-center gap-2 text-sm text-ink">
              <input type="checkbox" className="size-4" checked={dark} onChange={(e) => setDark(e.target.checked)} />{" "}
              Dark mode
            </label>
          </>
        )
      }
      action={{ label: "Make 1280×720 JPG", onClick: start, disabled: !file }}
      result={
        job.status === "done" &&
        job.result && (
          <Done text={`1280×720 · ${formatBytes(job.result.blob.size)}`}>
            <ResultActions
              items={[{ name: `${stem(file!.name)}-thumbnail.jpg`, type: "image/jpeg", blob: job.result.blob }]}
              next={next}
              from={slug}
            />
          </Done>
        )
      }
    />
  );
}

// ───────────────────────── Meme generator ─────────────────────────
function drawMeme(bmp: ImageBitmap, top: string, bottom: string, caps: boolean) {
  const scale = Math.min(1, 1600 / Math.max(bmp.width, bmp.height));
  const W = Math.round(bmp.width * scale);
  const H = Math.round(bmp.height * scale);
  const { c, ctx } = makeCanvas(W, H);
  ctx.drawImage(bmp, 0, 0, W, H);
  const font = "Impact, 'Arial Black', 'Helvetica Neue', Arial, sans-serif";
  const block = (text: string, atTop: boolean) => {
    const t = caps ? text.toUpperCase() : text;
    if (!t.trim()) return;
    let size = Math.round(H / 8);
    let lines: string[] = [];
    // shrink until it fits in 3 lines and a third of the height
    for (; size > 12; size -= 2) {
      ctx.font = `900 ${size}px ${font}`;
      lines = wrapText(t, W * 0.92, (s) => ctx.measureText(s).width);
      if (lines.length <= 3 && lines.length * size * 1.1 <= H / 3) break;
    }
    ctx.textAlign = "center";
    ctx.textBaseline = atTop ? "top" : "bottom";
    ctx.lineJoin = "round";
    ctx.lineWidth = Math.max(2, size / 8);
    ctx.strokeStyle = "#000";
    ctx.fillStyle = "#fff";
    lines.forEach((l, i) => {
      const y = atTop ? H * 0.03 + i * size * 1.1 : H * 0.97 - (lines.length - 1 - i) * size * 1.1;
      ctx.strokeText(l, W / 2, y);
      ctx.fillText(l, W / 2, y);
    });
  };
  block(top, true);
  block(bottom, false);
  return c;
}

export function MemeGenerator({ slug, next }: ToolProps) {
  const [file, setFile] = useOneImage();
  const [top, setTop] = useState("When the PDF tool");
  const [bottom, setBottom] = useState("Doesn't upload your file");
  const [caps, setCaps] = useState(true);
  const [bmp, setBmp] = useState<ImageBitmap | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const preview = useRef<HTMLDivElement>(null);
  const job = useToolRun<{ blob: Blob }>();
  useEffect(() => {
    setBmp(null);
    setErr(null);
    if (file)
      loadBitmap(file)
        .then(setBmp)
        .catch((e: Error) => setErr(e.message));
  }, [file]);
  useEffect(() => {
    if (!bmp || !preview.current) return;
    const c = drawMeme(bmp, top, bottom, caps);
    c.className = "block max-h-[460px] max-w-full rounded-xl";
    c.setAttribute("role", "img");
    c.setAttribute("aria-label", `Meme preview: ${top} / ${bottom}`);
    preview.current.replaceChildren(c);
  }, [bmp, top, bottom, caps]);
  const type = file?.type === "image/png" ? "image/png" : "image/jpeg";
  const start = () => job.run(async () => ({ blob: await toBlob(drawMeme(bmp!, top, bottom, caps), type, 0.92) }));
  return (
    <ToolWorkspace
      status={err ? "error" : job.status}
      progress={job.progress}
      error={err ? { cause: err } : job.error}
      onRetry={() => (setFile(null), job.reset())}
      input={
        <div className="space-y-3">
          <OneImageInput file={file} setFile={setFile} onChange={job.reset} />
          {bmp && <div ref={preview} data-testid="meme-preview" className="mx-auto w-fit" />}
        </div>
      }
      settings={
        <>
          <Field label="Top text">
            <input
              value={top}
              maxLength={120}
              onChange={(e) => (setTop(e.target.value), job.reset())}
              className={`${inputClass} w-64`}
            />
          </Field>
          <Field label="Bottom text">
            <input
              value={bottom}
              maxLength={120}
              onChange={(e) => (setBottom(e.target.value), job.reset())}
              className={`${inputClass} w-64`}
            />
          </Field>
          <label className="flex h-11 items-center gap-2 text-sm text-ink">
            <input
              type="checkbox"
              className="size-4"
              checked={caps}
              onChange={(e) => (setCaps(e.target.checked), job.reset())}
            />{" "}
            CAPITALS
          </label>
        </>
      }
      action={{ label: "Make meme", onClick: start, disabled: !bmp || (!top.trim() && !bottom.trim()) }}
      result={
        job.status === "done" &&
        job.result && (
          <Done text={`Ready · ${formatBytes(job.result.blob.size)}`}>
            <ResultActions
              items={[{ name: `${stem(file!.name)}-meme.${extFor(type)}`, type, blob: job.result.blob }]}
              next={next}
              from={slug}
            />
          </Done>
        )
      }
    />
  );
}

// ───────────────────────── Image watermark ─────────────────────────
const POSITIONS = [
  "top-left",
  "top",
  "top-right",
  "left",
  "center",
  "right",
  "bottom-left",
  "bottom",
  "bottom-right",
  "tiled",
] as const;

export function ImageWatermark({ slug, next }: ToolProps) {
  const [files, setFiles] = useImages();
  const [kind, setKind] = useState<"text" | "logo">("text");
  const [text, setText] = useState("© KlipKit");
  const [logo, setLogo] = useState<File | null>(null);
  const [pos, setPos] = useState<(typeof POSITIONS)[number]>("bottom-right");
  const [size, setSize] = useState(5);
  const [opacity, setOpacity] = useState(0.6);
  const [color, setColor] = useState("#ffffff");
  const job = useToolRun<{ name: string; blob: Blob }[]>();
  const start = () =>
    job.run(async (onProgress) => {
      const mark = kind === "logo" ? await loadBitmap(logo!, logo!.name) : null;
      const out = [];
      for (const [i, f] of files.entries()) {
        onProgress({ ratio: i / files.length, label: `Marking ${f.name}` });
        const bmp = await loadBitmap(f, f.name);
        checkSize(bmp.width, bmp.height);
        const { c, ctx } = makeCanvas(bmp.width, bmp.height);
        ctx.drawImage(bmp, 0, 0);
        ctx.globalAlpha = opacity;
        const W = bmp.width;
        const H = bmp.height;
        const pad = Math.round(Math.min(W, H) * 0.03);
        // mark size: text height or logo width, as a share of the image width
        let mw: number, mh: number;
        if (mark) {
          mw = (W * size * 3) / 100;
          mh = (mw * mark.height) / mark.width;
        } else {
          const px = Math.max(10, Math.round((W * size) / 100));
          ctx.font = `600 ${px}px system-ui, -apple-system, 'Segoe UI', sans-serif`;
          mw = ctx.measureText(text).width;
          mh = px;
          ctx.fillStyle = color;
          ctx.strokeStyle = color === "#ffffff" ? "rgba(0,0,0,.35)" : "rgba(255,255,255,.35)";
          ctx.lineWidth = Math.max(1, px / 18);
          ctx.textBaseline = "top";
        }
        const put = (x: number, y: number) => {
          if (mark) ctx.drawImage(mark, x, y, mw, mh);
          else {
            ctx.strokeText(text, x, y);
            ctx.fillText(text, x, y);
          }
        };
        if (pos === "tiled") {
          ctx.save();
          ctx.translate(W / 2, H / 2);
          ctx.rotate(-Math.PI / 6);
          const span = Math.hypot(W, H);
          for (let y = -span / 2; y < span / 2; y += mh * 4)
            for (let x = -span / 2; x < span / 2; x += mw + mh * 3) put(x, y);
          ctx.restore();
        } else {
          const col = pos.includes("left") ? 0 : pos.includes("right") ? 2 : 1;
          const row = pos.startsWith("top") ? 0 : pos.startsWith("bottom") ? 2 : 1;
          put([pad, (W - mw) / 2, W - mw - pad][col], [pad, (H - mh) / 2, H - mh - pad][row]);
        }
        const type = outType(f.type);
        out.push({ name: `${stem(f.name)}-watermarked.${extFor(type)}`, blob: await toBlob(c, type) });
      }
      return out;
    });
  const ready = files.length > 0 && (kind === "text" ? !!text.trim() : !!logo);
  return (
    <ToolWorkspace
      status={job.status}
      progress={job.progress}
      error={job.error}
      onRetry={() => job.reset()}
      input={<ManyImagesInput files={files} setFiles={setFiles} onChange={job.reset} hint="One or more photos" />}
      settings={
        <>
          <Field label="Watermark">
            <select
              value={kind}
              onChange={(e) => (setKind(e.target.value as typeof kind), job.reset())}
              className={inputClass}
            >
              <option value="text">Text</option>
              <option value="logo">Logo (PNG with transparency works best)</option>
            </select>
          </Field>
          {kind === "text" ? (
            <>
              <Field label="Text">
                <input
                  value={text}
                  maxLength={60}
                  onChange={(e) => (setText(e.target.value), job.reset())}
                  className={`${inputClass} w-48`}
                />
              </Field>
              <Field label="Colour">
                <input
                  type="color"
                  value={color}
                  onChange={(e) => (setColor(e.target.value), job.reset())}
                  className="h-11 w-14 rounded-xl border border-line bg-solid"
                />
              </Field>
            </>
          ) : (
            <Field label="Logo">
              <input
                type="file"
                accept={IMAGE_ACCEPT}
                onChange={(e) => (setLogo(e.target.files?.[0] ?? null), job.reset())}
                className="h-11 text-sm file:mr-3 file:h-10 file:rounded-full file:border file:border-line file:bg-solid file:px-4"
              />
            </Field>
          )}
          <Field label="Position">
            <select
              value={pos}
              onChange={(e) => (setPos(e.target.value as typeof pos), job.reset())}
              className={inputClass}
            >
              {POSITIONS.map((p) => (
                <option key={p} value={p}>
                  {p === "tiled"
                    ? "Tiled across the photo"
                    : p.replace("-", " ").replace(/^\w/, (c) => c.toUpperCase())}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Size">
            <select value={size} onChange={(e) => (setSize(+e.target.value), job.reset())} className={inputClass}>
              <option value={3}>Small</option>
              <option value={5}>Medium</option>
              <option value={9}>Large</option>
            </select>
          </Field>
          <Field label="Opacity">
            <select value={opacity} onChange={(e) => (setOpacity(+e.target.value), job.reset())} className={inputClass}>
              <option value={0.3}>Light</option>
              <option value={0.6}>Medium</option>
              <option value={1}>Solid</option>
            </select>
          </Field>
        </>
      }
      action={{ label: "Add watermark", onClick: start, disabled: !ready }}
      result={
        job.status === "done" &&
        job.result && (
          <Done text={`${job.result.length} photo${job.result.length === 1 ? "" : "s"} watermarked`}>
            <ResultActions
              items={job.result.map((r) => ({ name: r.name, type: r.blob.type, blob: r.blob }))}
              zipName="watermarked.zip"
              next={next}
              from={slug}
            />
          </Done>
        )
      }
    />
  );
}

// ───────────────────────── Colour palette ─────────────────────────
export function ColorPalette({ slug }: ToolProps) {
  const [file, setFile] = useOneImage();
  const [k, setK] = useState(6);
  const job = useToolRun<Swatch[]>();
  const start = () =>
    job.run(async () => {
      const bmp = await loadBitmap(file!);
      const s = Math.min(1, 200 / Math.max(bmp.width, bmp.height));
      const { c, ctx } = makeCanvas(bmp.width * s, bmp.height * s);
      ctx.drawImage(bmp, 0, 0, c.width, c.height);
      return palette(ctx.getImageData(0, 0, c.width, c.height).data, k);
    });
  const css = job.result?.map((s, i) => `--color-${i + 1}: ${s.hex};`).join("\n") ?? "";
  return (
    <ToolWorkspace
      status={job.status}
      progress={job.progress}
      error={job.error}
      onRetry={() => (setFile(null), job.reset())}
      input={<OneImageInput file={file} setFile={setFile} onChange={job.reset} />}
      settings={
        <Field label="Colours">
          <select value={k} onChange={(e) => (setK(+e.target.value), job.reset())} className={inputClass}>
            {[3, 4, 5, 6, 8, 10].map((n) => (
              <option key={n} value={n}>
                {n}
              </option>
            ))}
          </select>
        </Field>
      }
      action={{ label: "Get palette", onClick: start, disabled: !file }}
      result={
        job.status === "done" &&
        job.result && (
          <div className="space-y-3">
            <ul data-testid="palette" className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              {job.result.map((s) => (
                <li key={s.hex} className="overflow-hidden rounded-2xl border border-line">
                  <div className="h-16" style={{ background: s.hex }} />
                  <p className="px-3 py-2 font-mono text-sm text-ink">
                    {s.hex} <span className="text-ink2">· {Math.round(s.share * 100)}%</span>
                  </p>
                </li>
              ))}
            </ul>
            <Done text={`${job.result.length} colours`}>
              <ResultActions
                items={[{ name: "palette.css", type: "text/css", text: `:root {\n${css}\n}` }]}
                from={slug}
              />
            </Done>
          </div>
        )
      }
    />
  );
}

// ───────────────────────── Colour picker ─────────────────────────
export function ImageColorPicker({ slug }: ToolProps) {
  const [file, setFile] = useOneImage();
  const [picked, setPicked] = useState<string[]>([]);
  const canvas = useRef<HTMLCanvasElement | null>(null);
  const url = useObjectUrl(file);
  const [err, setErr] = useState<string | null>(null);
  useEffect(() => {
    canvas.current = null;
    setErr(null);
    if (!file) return;
    loadBitmap(file)
      .then((bmp) => {
        const { c, ctx } = makeCanvas(bmp.width, bmp.height);
        ctx.drawImage(bmp, 0, 0);
        canvas.current = c;
      })
      .catch((e: Error) => setErr(e.message));
  }, [file]);
  const pickAt = (e: React.MouseEvent<HTMLImageElement>) => {
    const c = canvas.current;
    if (!c) return;
    const r = e.currentTarget.getBoundingClientRect();
    const x = Math.min(c.width - 1, Math.floor(((e.clientX - r.left) / r.width) * c.width));
    const y = Math.min(c.height - 1, Math.floor(((e.clientY - r.top) / r.height) * c.height));
    const d = c.getContext("2d")!.getImageData(x, y, 1, 1).data;
    const hex = toHex(d[0], d[1], d[2]);
    setPicked((p) => [hex, ...p.filter((h) => h !== hex)].slice(0, 8));
  };
  // Checked after mount: reading `window` during render made the server and client HTML differ (hydration error).
  const [eyeDropper, setEyeDropper] = useState(false);
  useEffect(() => setEyeDropper("EyeDropper" in window), []);
  const cur = picked[0] ? parseColor(picked[0]) : null;
  return (
    <ToolWorkspace
      status={err ? "error" : "idle"}
      error={err ? { cause: err } : null}
      onRetry={() => setFile(null)}
      input={
        <div className="space-y-3">
          <OneImageInput file={file} setFile={setFile} onChange={() => setPicked([])} />
          {url && (
            // eslint-disable-next-line @next/next/no-img-element, jsx-a11y/click-events-have-key-events, jsx-a11y/no-noninteractive-element-interactions
            <img
              data-testid="picker-image"
              src={url}
              alt="Click anywhere to pick its colour"
              onClick={pickAt}
              className="mx-auto block max-h-[420px] max-w-full cursor-crosshair rounded-xl"
            />
          )}
          {eyeDropper && (
            <button
              type="button"
              className="h-11 rounded-full border border-line px-4 text-sm"
              onClick={async () => {
                try {
                  const r = await new (
                    window as unknown as { EyeDropper: new () => { open(): Promise<{ sRGBHex: string }> } }
                  ).EyeDropper().open();
                  setPicked((p) => [r.sRGBHex.toUpperCase(), ...p].slice(0, 8));
                } catch {
                  // cancelled
                }
              }}
            >
              Pick from anywhere on screen
            </button>
          )}
        </div>
      }
      result={
        cur && (
          <div className="space-y-3">
            <div
              data-testid="picked"
              className="flex flex-wrap items-center gap-4 rounded-[20px] border border-line bg-soft p-4"
            >
              <div className="size-16 rounded-2xl border border-line" style={{ background: cur.hex }} />
              <div className="font-mono text-sm text-ink">
                <p>{cur.hex}</p>
                <p>{cur.rgb}</p>
                <p>{cur.hsl}</p>
                <p className="text-ink2">
                  Contrast: {cur.cw.toFixed(2)}:1 on white · {cur.cb.toFixed(2)}:1 on black
                </p>
              </div>
              <ResultActions items={[{ name: "colour.txt", type: "text/plain", text: cur.hex }]} from={slug} />
            </div>
            {picked.length > 1 && (
              <ul className="flex flex-wrap gap-2" aria-label="Picked colours">
                {picked.map((h) => (
                  <li
                    key={h}
                    className="flex items-center gap-2 rounded-full border border-line px-3 py-1 font-mono text-xs"
                  >
                    <span className="size-4 rounded-full border border-line" style={{ background: h }} /> {h}
                  </li>
                ))}
              </ul>
            )}
          </div>
        )
      }
    />
  );
}

// ───────────────────────── Collage ─────────────────────────
const COLLAGE_SIZES: [string, number, number][] = [
  ["Square 1080×1080", 1080, 1080],
  ["Portrait 1080×1350", 1080, 1350],
  ["Story 1080×1920", 1080, 1920],
  ["Wide 1920×1080", 1920, 1080],
];

export function CollageMaker({ slug, next }: ToolProps) {
  const [files, setFiles] = useImages();
  const [size, setSize] = useState(0);
  const [gap, setGap] = useState(12);
  const [bg, setBg] = useState("#ffffff");
  const job = useToolRun<{ blob: Blob; w: number; h: number }>();
  const start = () =>
    job.run(async () => {
      const [, W, H] = COLLAGE_SIZES[size];
      const cells = collageCells(files.length, W, H, gap);
      const { c, ctx } = makeCanvas(W, H);
      ctx.fillStyle = bg;
      ctx.fillRect(0, 0, W, H);
      for (const [i, f] of files.entries()) {
        const bmp = await loadBitmap(f, f.name);
        const cell = cells[i];
        const r = coverRect(bmp.width, bmp.height, cell.w, cell.h);
        ctx.drawImage(bmp, r.x, r.y, r.w, r.h, cell.x, cell.y, cell.w, cell.h);
      }
      return { blob: await toBlob(c, "image/jpeg", 0.92), w: W, h: H };
    });
  return (
    <ToolWorkspace
      status={job.status}
      progress={job.progress}
      error={job.error}
      onRetry={() => job.reset()}
      input={<ManyImagesInput files={files} setFiles={setFiles} onChange={job.reset} hint="2 to 9 photos, in order" />}
      settings={
        <>
          <Field label="Size">
            <select value={size} onChange={(e) => (setSize(+e.target.value), job.reset())} className={inputClass}>
              {COLLAGE_SIZES.map(([l], i) => (
                <option key={l} value={i}>
                  {l}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Spacing">
            <select value={gap} onChange={(e) => (setGap(+e.target.value), job.reset())} className={inputClass}>
              <option value={0}>None</option>
              <option value={12}>Thin</option>
              <option value={32}>Wide</option>
            </select>
          </Field>
          <Field label="Background">
            <input
              type="color"
              value={bg}
              onChange={(e) => (setBg(e.target.value), job.reset())}
              className="h-11 w-14 rounded-xl border border-line bg-solid"
            />
          </Field>
          {files.length > 9 && (
            <p className="basis-full text-sm text-[var(--g-p)]" role="alert">
              Use up to 9 photos ({files.length} added).
            </p>
          )}
        </>
      }
      action={{ label: "Make collage", onClick: start, disabled: files.length < 2 || files.length > 9 }}
      result={
        job.status === "done" &&
        job.result && (
          <Done
            text={`${files.length} photos · ${job.result.w}×${job.result.h} · ${formatBytes(job.result.blob.size)}`}
          >
            <ResultActions
              items={[{ name: "collage.jpg", type: "image/jpeg", blob: job.result.blob }]}
              next={next}
              from={slug}
            />
          </Done>
        )
      }
    />
  );
}
