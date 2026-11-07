import type { FileKind, IntentStep } from "./intent";
import { formatJson, tsType } from "./json";

/**
 * What a plan step can really do for a given file (Phase 4: no faked results).
 * - run:  implemented on the device and run by the workspace's plan runner
 * - open: has its own tool page; the runner offers to continue there with the file
 * - soon: not built yet; shown as Coming soon and never "run"
 */
export type StepPlan = { how: "run" } | { how: "open"; slug: string; where: "device" | "server" } | { how: "soon" };

const isJson = (name: string) => /\.json$/i.test(name);
const IMAGE_OUT = new Set(["jpg", "png", "webp"]);

const dev = (slug: string): StepPlan => ({ how: "open", slug, where: "device" });

export function planFor(step: IntentStep, file: { kind: FileKind; name: string }): StepPlan {
  const { kind, name } = file;
  if (!step.ok) return { how: "soon" };
  const media = kind === "video" || kind === "audio";
  switch (step.id) {
    case "compress":
      if (kind === "pdf" || kind === "image") return { how: "run" };
      return kind === "video" ? dev("video-compressor") : kind === "audio" ? dev("audio-converter") : { how: "soon" };
    case "split":
      return kind === "pdf" ? { how: "run" } : { how: "soon" };
    case "merge":
      return kind === "pdf" ? dev("merge-pdf") : kind === "image" ? dev("collage-maker") : { how: "soon" };
    case "pdf":
      return kind === "image"
        ? dev("jpg-to-pdf")
        : kind === "doc" && /\.(docx|xlsx|pptx|odt|ods|odp)$/i.test(name)
          ? { how: "open", slug: "word-to-pdf", where: "server" }
          : { how: "soon" };
    case "sign":
      return kind === "pdf" ? dev("sign-pdf") : { how: "soon" };
    case "protect":
      return kind === "pdf" ? dev("protect-pdf") : { how: "soon" };
    case "resize":
      return kind === "image" ? { how: "run" } : kind === "video" ? dev("video-compressor") : { how: "soon" };
    case "conv":
      if (kind === "image" && IMAGE_OUT.has(step.fmt ?? "")) return { how: "run" };
      return kind === "video" ? dev("video-converter") : kind === "audio" ? dev("audio-converter") : { how: "soon" };
    case "gif":
      return kind === "video" ? dev("video-to-gif") : { how: "soon" };
    case "audio":
      return kind === "video" ? dev("extract-audio") : { how: "soon" };
    case "trans":
      return media ? dev("transcription") : { how: "soon" };
    case "trim":
      return media ? dev("video-trimmer") : { how: "soon" };
    case "fmt":
    case "min":
    case "types":
      return kind === "data" && isJson(name) ? { how: "run" } : { how: "soon" };
    case "word":
      return kind === "pdf" ? { how: "open", slug: "pdf-to-word", where: "server" } : { how: "soon" };
    case "bg":
      return kind === "image" ? dev("background-remover") : { how: "soon" };
    default:
      return { how: "soon" };
  }
}

export const stepTag = (p: StepPlan): "On device" | "Private server" | "Coming soon" =>
  p.how === "soon" ? "Coming soon" : p.how === "open" && p.where === "server" ? "Private server" : "On device";

export type DataStepResult = { ok: true; text: string; ext: "json" | "ts" } | { ok: false; message: string };

/** JSON steps of a plan. Pure: text in, text out. */
export function runDataStep(id: "fmt" | "min" | "types", text: string): DataStepResult {
  const r = formatJson({ text, indent: id === "min" ? 0 : 2 });
  if (!r.ok) return { ok: false, message: `Line ${r.line}, column ${r.column}: ${r.message}` };
  if (id !== "types") return { ok: true, text: r.output, ext: "json" };
  const acc: string[] = [];
  tsType(JSON.parse(r.output), "Root", acc);
  return { ok: true, text: acc.join("\n\n"), ext: "ts" };
}
