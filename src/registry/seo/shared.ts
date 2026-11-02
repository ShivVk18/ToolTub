import { SITE_URL } from "@/lib/site";

/**
 * hreflang map. English only at launch; add locales here as translated pages ship
 * (e.g. es: `${SITE_URL}/es/comprimir-pdf`). Every listed URL must exist and link back.
 */
export const loc = (slug: string, extra: Record<string, string> = {}) => ({
  en: `${SITE_URL}/${slug}`,
  ...extra,
  "x-default": `${SITE_URL}/${slug}`,
});
