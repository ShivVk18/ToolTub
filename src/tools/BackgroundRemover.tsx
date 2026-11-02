"use client";
import { useState } from "react";
import { Dropzone } from "@/components/workspace/Dropzone";
import { ResultActions, useHandoff } from "@/components/workspace/ToolChrome";
import { Field, ToolWorkspace, inputClass, useToolRun } from "@/components/workspace/ToolWorkspace";
import type { Artifact } from "@/lib/store";
import { bgWorker } from "@/workers/clients";
import type { ToolProps } from "./types";

/** Flattens a transparent PNG onto a solid colour and returns a JPG ([Own] canvas). */
async function flatten(png: Blob, colour: string) {
  const bmp = await createImageBitmap(png);
  const c = new OffscreenCanvas(bmp.width, bmp.height);
  const x = c.getContext("2d")!;
  x.fillStyle = colour;
  x.fillRect(0, 0, c.width, c.height);
  x.drawImage(bmp, 0, 0);
  return c.convertToBlob({ type: "image/jpeg", quality: 0.92 });
}

/** [Model] Background Remover: ISNet (Apache-2.0) on ONNX Runtime Web, entirely on the user's device. */
export function BackgroundRemover({ slug, next }: ToolProps) {
  const [file, setFile] = useState<File | null>(null);
  const [bg, setBg] = useState<"transparent" | "#ffffff" | "custom">("transparent");
  const [custom, setCustom] = useState("#3b82f6");
  const job = useToolRun<{ png: Blob; url: string; backend: string }>();

  useHandoff((items) => items[0]?.blob && setFile(new File([items[0].blob], items[0].name, { type: items[0].type })));

  const start = () =>
    job.run(
      async (onProgress) => {
        const r = await bgWorker.call("remove", { blob: file! }, { onProgress });
        return { png: r.blob, url: URL.createObjectURL(r.blob), backend: r.backend };
      },
      (e) => ({ cause: e.message, fix: "After the first successful download, the model is cached on your device and works offline." }),
    );

  const [items, setItems] = useState<Artifact[]>([]);
  const prepare = async (choice: typeof bg, colour = custom) => {
    setBg(choice);
    if (!job.result) return;
    const base = file!.name.replace(/\.[^.]+$/, "");
    if (choice === "transparent") setItems([{ name: `${base}-no-bg.png`, type: "image/png", blob: job.result.png }]);
    else setItems([{ name: `${base}-bg.jpg`, type: "image/jpeg", blob: await flatten(job.result.png, choice === "custom" ? colour : choice) }]);
  };

  const done = job.status === "done" && job.result;
  const shown = done ? (items.length ? items : [{ name: file!.name.replace(/\.[^.]+$/, "") + "-no-bg.png", type: "image/png", blob: job.result!.png }]) : [];

  return (
    <ToolWorkspace
      status={job.status}
      progress={job.progress}
      error={job.error}
      input={<Dropzone accept="image/png,image/jpeg,image/webp" maxFileMb={25} onFiles={([f]) => (setFile(f), setItems([]), job.reset())} hint={file ? file.name : "JPG, PNG or WebP up to 25 MB · first use downloads a 44 MB AI model once"} />}
      action={{ label: "Remove background", onClick: start, disabled: !file }}
      result={
        done && (
          <div className="space-y-4">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={job.result!.url}
              alt="Your image with the background removed"
              className="max-h-96 rounded-lg border border-border"
              style={{ background: bg === "transparent" ? "repeating-conic-gradient(#ddd 0 25%, #fff 0 50%) 0 0/16px 16px" : bg === "custom" ? custom : bg }}
            />
            <div className="flex flex-wrap items-end gap-4">
              <Field label="Background">
                <select value={bg} onChange={(e) => prepare(e.target.value as typeof bg)} className={inputClass}>
                  <option value="transparent">Transparent (PNG)</option>
                  <option value="#ffffff">White (JPG)</option>
                  <option value="custom">Colour (JPG)</option>
                </select>
              </Field>
              {bg === "custom" && <input type="color" value={custom} onChange={(e) => (setCustom(e.target.value), prepare("custom", e.target.value))} className="h-10 w-16" aria-label="Background colour" />}
              <span className="text-xs text-fg-muted">Ran on your device ({job.result!.backend === "webgpu" ? "GPU" : "CPU"})</span>
            </div>
            <ResultActions items={shown} next={next} from={slug} />
          </div>
        )
      }
    />
  );
}
