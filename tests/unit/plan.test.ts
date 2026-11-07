import { describe, expect, it } from "vitest";
import { PDFDocument } from "pdf-lib";
import { parse } from "@/lib/engines/intent";
import { planFor, runDataStep, stepTag } from "@/lib/engines/plan";
import { splitPdf } from "@/workers/pdf-ops";

const step = (text: string, kind: Parameters<typeof parse>[1]) => parse(text, kind).steps[0];

describe("plan capabilities: every step either runs for real, opens its tool, or says Coming soon", () => {
  it("runs on the device only where an implementation exists", () => {
    expect(planFor(step("compress it", "pdf"), { kind: "pdf", name: "a.pdf" })).toEqual({ how: "run" });
    expect(planFor(step("split pages 1-5", "pdf"), { kind: "pdf", name: "a.pdf" })).toEqual({ how: "run" });
    expect(planFor(step("compress it", "image"), { kind: "image", name: "a.jpg" })).toEqual({ how: "run" });
    expect(planFor(step("resize for instagram", "image"), { kind: "image", name: "a.jpg" })).toEqual({ how: "run" });
    expect(planFor(step("convert to webp", "image"), { kind: "image", name: "a.jpg" })).toEqual({ how: "run" });
    expect(planFor(step("format and validate", "data"), { kind: "data", name: "a.json" })).toEqual({ how: "run" });
    expect(planFor(step("minify", "data"), { kind: "data", name: "a.json" })).toEqual({ how: "run" });
  });
  it("sends steps with their own tool page there, with the right privacy label", () => {
    const word = planFor(step("convert to word", "pdf"), { kind: "pdf", name: "a.pdf" });
    expect(word).toEqual({ how: "open", slug: "pdf-to-word", where: "server" });
    expect(stepTag(word)).toBe("Private server");
    const bg = planFor(step("remove the background", "image"), { kind: "image", name: "a.png" });
    expect(bg).toEqual({ how: "open", slug: "background-remover", where: "device" });
    expect(stepTag(bg)).toBe("On device");
  });
  it("never pretends: unbuilt steps are Coming soon (Protect was labelled 'Private server')", () => {
    for (const [text, kind, name] of [
      ["protect it with a password", "pdf", "a.pdf"],
      ["sign it", "pdf", "a.pdf"],
      ["make a gif", "video", "a.mp4"],
      ["transcribe it", "audio", "a.mp3"],
      ["trim 0:10 to 0:30", "audio", "a.mp3"],
      ["compress it", "video", "a.mp4"],
      ["format and validate", "data", "a.csv"], // only JSON is formatted here
    ] as const) {
      const p = planFor(step(text, kind), { kind, name });
      expect(p, text).toEqual({ how: "soon" });
      expect(stepTag(p)).toBe("Coming soon");
    }
  });
});

describe("JSON steps", () => {
  it("format, minify and generate types from real text", () => {
    expect(runDataStep("fmt", '{"a":1,"b":[1,2]}')).toEqual({
      ok: true,
      text: '{\n  "a": 1,\n  "b": [\n    1,\n    2\n  ]\n}',
      ext: "json",
    });
    expect(runDataStep("min", '{\n  "a": 1\n}')).toEqual({ ok: true, text: '{"a":1}', ext: "json" });
    const t = runDataStep("types", '{"id":1,"tags":["a"]}');
    expect(t.ok && t.text).toContain("export interface Root {");
    expect(t.ok && t.ext).toBe("ts");
  });
  it("reports invalid JSON instead of producing output", () => {
    const r = runDataStep("fmt", '{"a":1,}');
    expect(r.ok).toBe(false);
  });
});

describe("splitPdf", () => {
  it("keeps exactly pages a..b, clamped to the document", async () => {
    const doc = await PDFDocument.create();
    for (let i = 0; i < 8; i++) doc.addPage([200 + i, 200]);
    const bytes = await doc.save();
    const out = await PDFDocument.load(
      await (await splitPdf({ bytes: bytes.buffer as ArrayBuffer, a: 2, b: 6 })).blob.arrayBuffer(),
    );
    expect(out.getPageCount()).toBe(5);
    expect(out.getPage(0).getWidth()).toBe(201); // page 2
    const clamped = await splitPdf({ bytes: (await doc.save()).buffer as ArrayBuffer, a: 7, b: 20 });
    expect((await PDFDocument.load(await clamped.blob.arrayBuffer())).getPageCount()).toBe(2);
    await expect(splitPdf({ bytes: (await doc.save()).buffer as ArrayBuffer, a: 9, b: 12 })).rejects.toThrow(
      /only 8 pages/,
    );
  });
});
