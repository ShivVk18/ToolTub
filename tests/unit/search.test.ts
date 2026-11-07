import { describe, expect, it } from "vitest";
import { createToolSearch } from "@/lib/search";
import { searchIndex } from "@/registry/search-index";

const search = createToolSearch(searchIndex);
const top = (q: string) => search(q)[0]?.slug;

describe("tool search", () => {
  it.each([
    ["shrink pdf", "compress-pdf"],
    ["jwt", "jwt-decoder"],
    ["heic", "heic-to-jpg"],
    ["iphone photo to jpg", "heic-to-jpg"],
    ["jsno formater", "json-formatter"],
    ["remove bg", "background-remover"],
    ["reduce image size", "image-compressor"],
    ["wifi qr", "qr-code-generator"],
    ["pdf to docx", "pdf-to-word"],
    // §5.8 expected synonyms (the single words, as typed into ⌘K)
    ["shrink", "compress-pdf"],
    ["bg", "background-remover"],
    ["iphone", "heic-to-jpg"],
  ])("%s → %s", (q, slug) => expect(top(q)).toBe(slug));

  it("ranks available tools above coming-soon ones", () => {
    const r = search("pdf");
    const firstPlanned = r.findIndex((e) => !e.available);
    const lastAvailable = r.map((e) => e.available).lastIndexOf(true);
    expect(firstPlanned === -1 || firstPlanned > lastAvailable).toBe(true);
  });
  it("returns nothing for gibberish and empty queries", () => {
    expect(search("zzqxw")).toEqual([]);
    expect(search("   ")).toEqual([]);
  });
});
