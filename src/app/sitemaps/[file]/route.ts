import { sitemapGroups, xml } from "@/lib/seo/sitemap";

export function generateStaticParams() {
  return Object.keys(sitemapGroups()).map((k) => ({ file: `${k}.xml` }));
}

export async function GET(_: Request, { params }: { params: Promise<{ file: string }> }) {
  const key = (await params).file.replace(/\.xml$/, "");
  const urls = sitemapGroups()[key];
  if (!urls) return new Response("Not found", { status: 404 });
  return xml(
    `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${urls.map((u) => `<url><loc>${u.loc}</loc><lastmod>${u.lastmod}</lastmod></url>`).join("")}</urlset>`,
  );
}
