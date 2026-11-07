"use client";
import type { FileKind, IntentStep } from "@/lib/engines/intent";
import { runDataStep } from "@/lib/engines/plan";
import { imageWorker, pdfWorker } from "@/workers/clients";

/** A file moving through a plan: each step's output is the next step's input. */
export interface PlanFile {
  blob: Blob;
  name: string;
  type: string;
  kind: FileKind;
}

const base = (name: string) => name.replace(/\.[^.]+$/, "");
const EXT: Record<string, string> = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp" };
const MIME: Record<string, "image/jpeg" | "image/png" | "image/webp"> = {
  jpg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
};

/**
 * Runs one plan step for real, on the device (workers). Only steps that planFor() marks "run" come here;
 * anything else throws, so a step can never produce a made-up result.
 */
export async function runStep(step: IntentStep, input: PlanFile): Promise<PlanFile & { note?: string }> {
  const { kind } = input;
  if (kind === "pdf" && step.id === "compress") {
    const bytes = await input.blob.arrayBuffer();
    const r = await pdfWorker.call(
      "compress",
      { bytes, level: "recommended", targetKB: step.target ? Math.floor(step.target / 1024) : undefined },
      { transfer: [bytes] },
    );
    return { ...input, blob: r.blob, name: `${base(input.name)}-compressed.pdf`, note: r.note };
  }
  if (kind === "pdf" && step.id === "split") {
    if (!step.a || !step.b) throw new Error("Say which pages to keep, for example “split pages 1-5”.");
    const bytes = await input.blob.arrayBuffer();
    const r = await pdfWorker.call("split", { bytes, a: step.a, b: step.b }, { transfer: [bytes] });
    return {
      ...input,
      blob: r.blob,
      name: `${base(input.name)}-pages-${r.from}-${r.to}.pdf`,
      note: `${r.pages} pages`,
    };
  }
  if (kind === "image" && (step.id === "compress" || step.id === "resize" || step.id === "conv")) {
    // Resize fits the box the plan card shows (step.w × step.h); without one, the resizer's 1600 px default.
    const [w, h] = step.id === "resize" ? [step.w ?? 1600, step.h ?? 1600] : [undefined, undefined];
    const mime = step.id === "conv" ? MIME[step.fmt ?? ""] : "auto";
    const r = await imageWorker.call("process", {
      blob: input.blob,
      quality: 0.8,
      mime,
      maxWidth: w,
      maxHeight: h,
      // step.target is in bytes ("200 kb" = 200 000, as the home page shows sizes); the worker counts KiB.
      targetKB: step.id === "compress" && step.target ? Math.floor(step.target / 1024) : undefined,
    });
    const ext = EXT[r.blob.type] ?? "img";
    const suffix = step.id === "compress" ? "-compressed" : step.id === "resize" ? "-resized" : "";
    return {
      ...input,
      blob: r.blob,
      type: r.blob.type,
      name: `${base(input.name)}${suffix}.${ext}`,
      note: `${r.width} × ${r.height}${r.note ? ` · ${r.note}` : ""}`,
    };
  }
  if (kind === "data" && (step.id === "fmt" || step.id === "min" || step.id === "types")) {
    const r = runDataStep(step.id, await input.blob.text());
    if (!r.ok) throw new Error(`This JSON isn't valid. ${r.message}`);
    const type = r.ext === "ts" ? "text/plain" : "application/json";
    const suffix = step.id === "fmt" ? "-formatted" : step.id === "min" ? "-min" : "";
    return { ...input, blob: new Blob([r.text], { type }), type, name: `${base(input.name)}${suffix}.${r.ext}` };
  }
  throw new Error(`${step.t} can't run here yet.`);
}
