/**
 * The tool registry is KlipKit's single source of truth.
 * Routes, metadata, JSON-LD, sitemaps, llms.txt, search, related tools and
 * Tool Chains are all generated from these types. Add a tool here first.
 */

export type CategoryId = "productivity" | "developer" | "creator";

/** Hubs are the indexable category pages (/pdf-tools, /image-tools, ...). */
export type HubId =
  "pdf-tools" | "image-tools" | "text-tools" | "utility-tools" | "developer-tools" | "video-tools" | "creator-tools";

export type Priority = "P0" | "P1" | "P2";

/** How a tool is built, cheapest first (brief §0.3). */
export type BuildType = "own" | "lib" | "model" | "srv";

/** Where the work happens. Drives the privacy badge on every tool. No third parties, ever. */
export type Processing = { where: "device" } | { where: "own-server"; retentionMinutes: number };

/** Every bundled library or model, with its licence. Rendered on /licences. */
export interface Dependency {
  name: string;
  licence:
    "MIT" | "Apache-2.0" | "BSD-2-Clause" | "BSD-3-Clause" | "ISC" | "MPL-2.0" | "LGPL-2.1" | "LGPL-3.0" | "OFL-1.1";
  sizeKb: number; // transferred size the first time the tool runs
  url: string;
}

export interface Limits {
  maxFileMb?: number;
  maxDurationSec?: number;
  notes?: string;
}

/**
 * live    = routed, indexed, has full ToolSEO content
 * beta    = routed, noindex (working UI, content or quality not ready)
 * planned = in the registry for planning/search only, not routed
 */
export type ToolStatus = "live" | "beta" | "planned";

/**
 * Typed I/O contract used by Tool Chains. Values are MIME patterns.
 * A chain step N can feed step N+1 only if an output of N matches an input of N+1.
 */
export type IOType =
  | "image/*"
  | "image/jpeg"
  | "image/png"
  | "image/webp"
  | "image/heic"
  | "application/pdf"
  | "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
  | "audio/*"
  | "video/*"
  | "text/plain"
  | "text/markdown"
  | "application/json"
  | "text/csv"
  | "text/vtt"
  | "application/x-subrip";

export interface FAQ {
  q: string;
  a: string;
}

export interface LongTailVariant {
  slug: string;
  keyword: string;
  h1: string;
  title: string;
  description: string;
  intro: string;
  /** Preset applied to the tool when this landing page loads (e.g. targetKB: 100). */
  preset?: Record<string, string | number | boolean>;
  faqs: FAQ[];
}

export interface ToolSEO {
  primaryKeyword: string;
  secondaryKeywords: string[];
  searchIntent: "do" | "know" | "compare";
  title: string; // <= 60 chars
  description: string; // 140–160 chars
  ogTitle: string;
  ogDescription: string;
  ogAlt: string;
  h1: string;
  answerQuestion: string;
  answerSummary: string; // 40–60 words
  keyFacts: string[];
  howToSteps: { name: string; text: string }[];
  totalTime: string; // ISO 8601 duration for HowTo
  faqs: FAQ[]; // 5–8, answers 40–60 words
  comparisonTable?: { caption: string; headers: string[]; rows: string[][] };
  explainer: string; // 150–300 words, plain paragraphs separated by blank lines
  featureList: string[];
  llmsLine: string;
  longTailVariants?: LongTailVariant[];
  relatedGuides: string[];
  locales: Record<string, string>; // hreflang -> absolute URL
  lastReviewed: string; // ISO date
  reviewedBy: string; // person id from people.ts
}

/** Icon keys for home-page cards (paths in lib/designTools.ts TOOL_ICON_PATHS). */
export type HomeIcon = "pdf" | "doc" | "img" | "txt" | "code" | "lock" | "qr" | "audio" | "video" | "spark";

/** Presentation for the home-page Explore card. */
export interface HomeCard {
  /** Short display name on the card, e.g. "Word to PDF". */
  name: string;
  icon: HomeIcon;
  /** Short mono mark shown instead of the icon (≤ 4 chars), so tools that share an icon stay distinct. */
  glyph?: string;
  blurb: string;
}

export interface ToolDefinition {
  slug: string;
  name: string;
  /** One line under the H1 and in cards. */
  tagline: string;
  category: CategoryId;
  hub: HubId;
  priority: Priority;
  status: ToolStatus;
  buildType: BuildType[];
  processing: Processing;
  dependencies: Dependency[];
  limits: Limits;
  inputs: IOType[];
  outputs: IOType[];
  /** Extra words for Cmd+K search, e.g. "shrink pdf". */
  synonyms: string[];
  relatedTools: string[];
  /** <meta description> for routed tools without full SEO content yet (140–160 chars). */
  metaDescription?: string;
  /** Full SEO/AEO content. Required for status "live". */
  seo?: ToolSEO;
  /** Card on the home page (Explore grid, palette icons). */
  home?: HomeCard;
  /** True when the tool runs as a Live Tool Card in the chat (text in, live output). */
  card: boolean;
}

/** Tool facts without SEO copy (registry/catalog.ts); light enough for client bundles. */
export type ToolCore = Omit<ToolDefinition, "seo" | "metaDescription">;

export interface Person {
  id: string;
  name: string;
  role: string;
  bio: string;
  url: string;
  sameAs: string[];
}

export interface ChainStep {
  tool: string;
  options?: Record<string, string | number | boolean>;
}

export interface ChainPreset {
  slug: string;
  name: string;
  description: string;
  /** 140–160 characters for <meta name="description">. */
  metaDescription: string;
  steps: ChainStep[];
  input: IOType;
  answerQuestion: string;
  answerSummary: string;
}
