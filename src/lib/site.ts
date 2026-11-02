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
