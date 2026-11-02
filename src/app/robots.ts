import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/site";

/**
 * Decision: allow search/retrieval bots (they drive citations) AND training bots.
 * KlipKit's content is free marketing for free tools; being in model knowledge means being recommended.
 * Block nothing public; keep /api and /search (thin, per-user) out of every index.
 */
const AI_BOTS = ["GPTBot", "OAI-SearchBot", "ChatGPT-User", "ClaudeBot", "Claude-SearchBot", "Claude-User", "PerplexityBot", "Perplexity-User", "Google-Extended", "Applebot-Extended", "Bingbot", "DuckAssistBot", "Meta-ExternalAgent"];

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      { userAgent: "*", allow: "/", disallow: ["/api/", "/search"] },
      ...AI_BOTS.map((userAgent) => ({ userAgent, allow: "/", disallow: ["/api/", "/search"] })),
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  };
}
