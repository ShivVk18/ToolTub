import Fuse from "fuse.js";
import type { SearchEntry } from "@/registry/search-index";

/** Fuzzy tool search with synonyms ("shrink pdf" → Compress PDF). Available tools rank first. */
export function createToolSearch(index: SearchEntry[]) {
  const fuse = new Fuse(index, {
    keys: [
      { name: "name", weight: 3 },
      { name: "synonyms", weight: 2 },
      { name: "tagline", weight: 1 },
    ],
    threshold: 0.38,
    ignoreLocation: true,
  });
  return (q: string, limit = 8) =>
    q.trim()
      ? fuse
          .search(q.trim())
          .map((r) => r.item)
          .sort((a, b) => Number(b.available) - Number(a.available))
          .slice(0, limit)
      : [];
}
