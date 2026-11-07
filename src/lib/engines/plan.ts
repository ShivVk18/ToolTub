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

export function planFor(step: IntentStep, file: { kind: FileKind; name: string }): StepPlan {
  const { kind, name } = file;
  if (!step.ok) return { how: "soon" };
  switch (step.id) {
    case "compress":
      return kind === "pdf" || kind === "image" ? { how: "run" } : { how: "soon" };
    case "split":
      return kind === "pdf" ? { how: "run" } : { how: "soon" };
    case "resize":
      return kind === "image" ? { how: "run" } : { how: "soon" };
    case "conv":
      return kind === "image" && IMAGE_OUT.has(step.fmt ?? "") ? { how: "run" } : { how: "soon" };
    case "fmt":
    case "min":
    case "types":
      return kind === "data" && isJson(name) ? { how: "run" } : { how: "soon" };
    case "word":
      return kind === "pdf" ? { how: "open", slug: "pdf-to-word", where: "server" } : { how: "soon" };
    case "bg":
      return kind === "image" ? { how: "open", slug: "background-remover", where: "device" } : { how: "soon" };
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
