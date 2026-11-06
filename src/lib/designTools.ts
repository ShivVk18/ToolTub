import { homeTools } from "@/registry/catalog";
import type { CategoryId } from "@/registry/types";

/** A home-page tool card. Built from the registry; never edit tool data here. */
export interface ToolItem {
  n: string; // short display name
  c: "p" | "d" | "c"; // category key: Productivity, Developer, Creator
  i: string; // icon key
  d: string; // one-line blurb
  s?: string; // 'server' if processed on KlipKit's own server
  slug: string; // registry slug
  live: boolean; // runs as a live panel on the home page
  routed: boolean; // has its own page at /slug
}

const CAT_KEY: Record<CategoryId, ToolItem["c"]> = { productivity: "p", developer: "d", creator: "c" };

export interface CategoryInfo {
  n: string;
  c: string;
}

export const CATS: Record<"p" | "d" | "c", CategoryInfo> = {
  p: { n: "Productivity", c: "#E5484D" },
  d: { n: "Developer", c: "#6D5DF5" },
  c: { n: "Creator", c: "#1F9D63" },
};

/** Home-page cards, derived from the tool registry (the single source of truth) in Explore grid order. */
export const TOOLS: ToolItem[] = homeTools().map((t) => ({
  n: t.home!.name,
  c: CAT_KEY[t.category],
  i: t.home!.icon,
  d: t.home!.blurb,
  s: t.processing.where === "own-server" ? "server" : undefined,
  slug: t.slug,
  live: t.panel,
  routed: t.status !== "planned",
}));

/** Look up a home card by registry slug. */
export const toolBySlug = (slug: string): ToolItem | undefined => TOOLS.find((t) => t.slug === slug);

export const TOOL_ICON_PATHS: Record<string, string> = {
  pdf: "M7 3h7l5 5v13H7z M14 3v5h5",
  doc: "M7 3h7l5 5v13H7z M10 13h6 M10 17h6",
  img: "M3 8a3 3 0 0 1 3-3h12a3 3 0 0 1 3 3v8a3 3 0 0 1-3 3H6a3 3 0 0 1-3-3V8z M9 11.6a1.6 1.6 0 1 0 0-3.2 1.6 1.6 0 0 0 0 3.2z M21 16l-5-5-8 8",
  txt: "M5 6h14 M5 11h14 M5 16h9",
  code: "M9 8l-4 4 4 4 M15 8l4 4-4 4",
  lock: "M5 13a3 3 0 0 1 3-3h8a3 3 0 0 1 3 3v4a3 3 0 0 1-3 3H8a3 3 0 0 1-3-3v-4z M8 10V7a4 4 0 0 1 8 0v3",
  qr: "M4 4h6v6H4z M14 4h6v6h-6z M4 14h6v6H4z M14 14h2v2h-2z M18 18h2v2h-2z",
  audio: "M4 10v4 M8 7v10 M12 4v16 M16 8v8 M20 11v2",
  video: "M3 9a3 3 0 0 1 3-3h7a3 3 0 0 1 3 3v6a3 3 0 0 1-3 3H6a3 3 0 0 1-3-3V9z M16 10l5-3v10l-5-3",
  spark: "M12 3l2 6 6 2-6 2-2 6-2-6-6-2 6-2z",
};

export const tint = (color: string): string => color + "1f";

export const toolKind = (t: ToolItem): "pdf" | "doc" | "image" | "audio" | "video" | "data" => {
  if (t.i === "pdf") return "pdf";
  if (t.i === "doc") return "doc";
  if (t.i === "img") return "image";
  if (t.i === "audio") return "audio";
  if (t.i === "video") return "video";
  if (t.i === "code" || t.i === "txt" || t.i === "qr") return "data";
  if (t.i === "lock") return t.c === "p" ? "pdf" : "data";
  if (t.i === "spark") return t.c === "c" ? "image" : "data";
  return "data";
};
