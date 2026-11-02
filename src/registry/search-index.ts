import { tools } from "./tools";
import { hubs } from "./categories";

/** Small, serialisable index for Cmd+K. Keeps the full SEO registry out of the client bundle. */
export interface SearchEntry {
  slug: string;
  name: string;
  tagline: string;
  hub: string;
  synonyms: string[];
  available: boolean;
}

export const searchIndex: SearchEntry[] = tools.map((t) => ({
  slug: t.slug,
  name: t.name,
  tagline: t.tagline,
  hub: hubs.find((h) => h.id === t.hub)?.name ?? "",
  synonyms: [...t.synonyms, ...(t.seo ? [t.seo.primaryKeyword, ...t.seo.secondaryKeywords] : [])],
  available: t.status !== "planned",
}));
