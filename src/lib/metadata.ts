import type { Metadata } from "next";
import { SITE_NAME, SITE_URL, THEME_COLOR } from "./site";

interface PageMetaInput {
  path: string;
  title: string;
  description: string;
  ogTitle?: string;
  ogDescription?: string;
  ogImage: string; // path under /og
  ogAlt: string;
  keywords?: string[];
  languages?: Record<string, string>;
  index: boolean;
  category?: string;
}

/** One metadata builder for tools, variants, hubs and chains, so every page gets the same tags. */
export function pageMetadata(m: PageMetaInput): Metadata {
  const url = m.path === "/" ? SITE_URL : `${SITE_URL}${m.path}`;
  const ogTitle = m.ogTitle ?? m.title;
  const ogDescription = m.ogDescription ?? m.description;
  return {
    title: { absolute: m.title },
    description: m.description,
    keywords: m.keywords,
    alternates: { canonical: url, languages: m.languages },
    robots: m.index
      ? { index: true, follow: true, "max-image-preview": "large", "max-snippet": -1, "max-video-preview": -1 }
      : { index: false, follow: true },
    openGraph: {
      type: "website",
      url,
      siteName: SITE_NAME,
      title: ogTitle,
      description: ogDescription,
      images: [{ url: m.ogImage, width: 1200, height: 630, alt: m.ogAlt }],
      locale: "en_US",
    },
    twitter: { card: "summary_large_image", title: ogTitle, description: ogDescription, images: [m.ogImage] },
    category: m.category,
    other: {
      "application-name": SITE_NAME,
      "apple-mobile-web-app-title": SITE_NAME,
      "theme-color": THEME_COLOR,
      "format-detection": "telephone=no",
    },
  };
}
