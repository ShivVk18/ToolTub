/** Site-wide constants. ENTITY_DEFINITION must be used word-for-word everywhere (site, socials, directories). */
export const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://klipkit.com";
export const SITE_NAME = "KlipKit";
export const ENTITY_DEFINITION =
  "KlipKit is a free collection of fast, private online tools for PDFs, images, developers and creators. No sign-up required.";
export const THEME_COLOR = "#0B0B0F";
export const SAME_AS = [
  "https://x.com/klipkit",
  "https://github.com/klipkit",
  "https://www.linkedin.com/company/klipkit",
  "https://www.producthunt.com/products/klipkit",
];
export const abs = (path: string) => `${SITE_URL}${path === "/" ? "" : path}`;
export const SITE_UPDATED = "2026-11-02"; // bump on deploys that change hubs/home

/** Home page meta description (140–160 chars). Starts with the entity definition's key facts. */
export const HOME_DESCRIPTION =
  "Free online tools that run on your device: compress PDFs and images, convert HEIC, format JSON, decode JWTs and more. No sign-up, no uploads, no watermarks.";
