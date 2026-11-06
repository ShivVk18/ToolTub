import { tools } from "./tools";
import { hubs } from "./categories";
import { HOME } from "./home";
import type { CategoryId, HomeIcon } from "./types";

const HOME_RANK = new Map(Object.keys(HOME).map((slug, i) => [slug, i]));

/** Small, serialisable index for Cmd+K. Keeps the full SEO registry out of the client bundle. */
export interface SearchEntry {
  slug: string;
  name: string;
  tagline: string;
  hub: string;
  synonyms: string[];
  available: boolean;
  category: CategoryId;
  /** Card icon, short name and blurb from the home grid (when the tool is on it). */
  icon?: HomeIcon;
  short?: string;
  blurb?: string;
  /** Position in the home grid; the first 8 are the palette's "Popular" list. */
  homeRank?: number;
}

export const searchIndex: SearchEntry[] = tools.map((t) => ({
  slug: t.slug,
  name: t.name,
  tagline: t.tagline,
  hub: hubs.find((h) => h.id === t.hub)?.name ?? "",
  synonyms: [...t.synonyms, ...(t.seo ? [t.seo.primaryKeyword, ...t.seo.secondaryKeywords] : [])],
  available: t.status !== "planned",
  category: t.category,
  icon: t.home?.icon,
  short: t.home?.name,
  blurb: t.home?.blurb,
  homeRank: HOME_RANK.get(t.slug),
}));
