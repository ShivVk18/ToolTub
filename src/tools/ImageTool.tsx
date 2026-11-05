"use client";
import { useState } from "react";
import { Dropzone } from "@/components/workspace/Dropzone";
import { ResultActions, useHandoff } from "@/components/workspace/ToolChrome";
import { Field, ToolWorkspace, inputClass, useToolRun } from "@/components/workspace/ToolWorkspace";
import type { Artifact } from "@/lib/store";
import { formatBytes, renameExt } from "@/lib/utils";
import type { ImageJob, ImageResult } from "@/workers/image-ops";
import { imageWorker } from "@/workers/clients";
import type { ToolProps } from "./types";

type Mode = "compress" | "resize" | "convert";
type Mime = NonNullable<ImageJob["mime"]>;

const LABEL: Record<Mode, string> = { compress: "Compress images", resize: "Resize images", convert: "Convert images" };

/**
 * [Own] Image Compressor / Resizer / Converter. One component, one worker, three modes,
 * because they are the same pipeline (decode → scale → encode) with different defaults.
 */
export function ImageTool({ slug, preset, next, mode }: ToolProps & { mode: Mode }) {
  const [files, setFiles] = useState<File[]>([]);
  const [quality, setQuality] = useState(Number(preset?.quality ?? 0.8));
  const [targetKB, setTargetKB] = useState<number | "">(preset?.targetKB ? Number(preset.targetKB) : "");
  const [maxWidth, setMaxWidth] = useState<number | "">(preset?.maxWidth ? Number(preset.maxWidth) : mode === "resize" ? 1600 : "");
  const [maxHeight, setMaxHeight] = useState<number | "">(preset?.maxHeight ? Number(preset.maxHeight) : "");
  const [mime, setMime] = useState<Mime>((preset?.mime as Mime) ?? (mode === "convert" ? "image/webp" : "auto"));
  const job = useToolRun<{ file: File; out: ImageResult }[]>();

  useHandoff((items) => setFiles(items.filter((i) => i.blob).map((i) => new File([i.blob!], i.name, { type: i.type }))));

  const start = () =>
    job.run(
      async (onProgress) => {
        const results = [];
        for (const [i, file] of files.entries()) {
          onProgress({ ratio: i / files.length, label: `Processing ${i + 1} of ${files.length} on your device…` });
          const out = await imageWorker.call("process", {
            blob: file,
            quality,
            mime,
            targetKB: targetKB || undefined,
            maxWidth: maxWidth || undefined,
            maxHeight: maxHeight || undefined,
          });
          results.push({ file, out });
        }
        return results;
      },
      (e) => ({ cause: e.message.includes("decode") ? "One of these files isn't an image this browser can read." : e.message, fix: "Try a JPG, PNG or WebP file. For iPhone photos, use HEIC to JPG first." }),
    );

  const before = job.result?.reduce((s, r) => s + r.file.size, 0) ?? 0;
  const after = job.result?.reduce((s, r) => s + r.out.blob.size, 0) ?? 0;
  const suffix = mode === "compress" ? "-compressed" : mode === "resize" ? "-resized" : "";
  const artifacts: Artifact[] =
    job.result?.map((r) => ({ name: renameExt(r.file.name.replace(/(\.[^.]+)?$/, `${suffix}$1`), r.out.blob.type), type: r.out.blob.type, blob: r.out.blob })) ?? [];

  return (
    <ToolWorkspace
      status={job.status}
      progress={job.progress}
      error={job.error}
      input={
        files.length === 0 ? (
          <Dropzone accept="image/png,image/jpeg,image/webp,image/avif,image/gif,image/bmp" multiple maxFileMb={50} onFiles={(f) => (setFiles(f.slice(0, 50)), job.reset())} hint="JPG, PNG, WebP or AVIF · up to 50 images, 50 MB each" />
        ) : (
          <div className="flex items-center justify-between rounded-lg bg-muted px-4 py-3 text-sm">
            <span>
              {files.length} image{files.length > 1 && "s"} · {formatBytes(files.reduce((s, f) => s + f.size, 0))}
            </span>
            <button className="inline-flex min-h-11 items-center text-fg-muted underline sm:min-h-0" onClick={() => (setFiles([]), job.reset())}>
              Change
            </button>
          </div>
        )
      }
      settings={
        <>
          {mode === "compress" && (
            <Field label={`Quality: ${Math.round(quality * 100)}`}>
              <input type="range" min={0.4} max={0.95} step={0.05} value={quality} onChange={(e) => setQuality(Number(e.target.value))} className="w-48 h-6 min-h-[24px] cursor-pointer" disabled={!!targetKB} />
            </Field>
          )}
          {mode === "compress" && (
            <Field label="Target size (KB, optional)">
              <input type="number" min={10} inputMode="numeric" placeholder="e.g. 100" value={targetKB} onChange={(e) => setTargetKB(e.target.value ? Number(e.target.value) : "")} className={`${inputClass} w-36`} />
            </Field>
          )}
          {mode === "resize" && (
            <>
              <Field label="Max width (px)">
                <input type="number" min={1} value={maxWidth} onChange={(e) => setMaxWidth(e.target.value ? Number(e.target.value) : "")} className={`${inputClass} w-32`} />
              </Field>
              <Field label="Max height (px)">
                <input type="number" min={1} value={maxHeight} onChange={(e) => setMaxHeight(e.target.value ? Number(e.target.value) : "")} className={`${inputClass} w-32`} />
              </Field>
            </>
          )}
          {mode === "convert" && (
            <Field label="Convert to">
              <select value={mime} onChange={(e) => setMime(e.target.value as Mime)} className={inputClass}>
                <option value="image/webp">WebP</option>
                <option value="image/jpeg">JPG</option>
                <option value="image/png">PNG</option>
              </select>
            </Field>
          )}
        </>
      }
      advanced={
        mode !== "convert" ? (
          <>
            <Field label="Output format">
              <select value={mime} onChange={(e) => setMime(e.target.value as Mime)} className={inputClass}>
                <option value="auto">Same as input</option>
                <option value="image/webp">WebP</option>
                <option value="image/jpeg">JPG</option>
                <option value="image/png">PNG</option>
              </select>
            </Field>
            {mode === "compress" && (
              <Field label="Max width (px)">
                <input type="number" min={1} value={maxWidth} onChange={(e) => setMaxWidth(e.target.value ? Number(e.target.value) : "")} className={`${inputClass} w-32`} />
              </Field>
            )}
          </>
        ) : undefined
      }
      action={{ label: LABEL[mode], onClick: start, disabled: files.length === 0 }}
      result={
        job.status === "done" &&
        job.result && (
          <div className="space-y-4">
            <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/5 p-4">
              <p className="text-lg font-semibold">
                {formatBytes(before)} → {formatBytes(after)}
                {after < before && <span className="ml-2 text-emerald-600 dark:text-emerald-400">−{Math.round((1 - after / before) * 100)}%</span>}
              </p>
              {[...new Set(job.result.map((r) => r.out.note).filter(Boolean))].map((n) => (
                <p key={n} className="mt-1 text-sm text-fg-muted">{n}</p>
              ))}
            </div>
            <ul className="divide-y divide-border text-sm">
              {job.result.map((r, i) => (
                <li key={i} className="flex justify-between gap-4 py-2">
                  <span className="truncate">{artifacts[i].name}</span>
                  <span className="shrink-0 text-fg-muted">
                    {r.out.width}×{r.out.height} · {formatBytes(r.out.blob.size)}
                  </span>
                </li>
              ))}
            </ul>
            <ResultActions items={artifacts} next={next} from={slug} zipName="klipkit-images.zip" />
          </div>
        )
      }
    />
  );
}

export const ImageCompressor = (p: ToolProps) => <ImageTool {...p} mode="compress" />;
export const ImageResizer = (p: ToolProps) => <ImageTool {...p} mode="resize" />;
export const ImageConverter = (p: ToolProps) => <ImageTool {...p} mode="convert" />;
