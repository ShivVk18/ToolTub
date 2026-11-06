import { sitemapGroups, xml } from "@/lib/seo/sitemap";
import { SITE_UPDATED, abs } from "@/lib/site";

/** Sitemap index → one sitemap per category (/sitemaps/pdf.xml, /sitemaps/developer.xml, …). */
export function GET() {
  const items = Object.keys(sitemapGroups())
    .map((k) => `<sitemap><loc>${abs(`/sitemaps/${k}.xml`)}</loc><lastmod>${SITE_UPDATED}</lastmod></sitemap>`)
    .join("");
  return xml(`<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${items}</sitemapindex>`);
}
