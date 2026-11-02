import type { ChainPreset, ToolDefinition } from "@/registry/types";
import type { HubMeta } from "@/registry/categories";
import { people } from "@/registry/people";
import { ENTITY_DEFINITION, SAME_AS, SITE_NAME, SITE_URL, abs } from "./site";

/** JSON-LD builders. Every node here is also rendered visibly on the page (never schema-only). */

export const siteGraph = () => ({
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "Organization",
      "@id": `${SITE_URL}/#org`,
      name: SITE_NAME,
      url: SITE_URL,
      logo: abs("/logo.png"),
      description: ENTITY_DEFINITION,
      sameAs: SAME_AS,
      founder: { "@id": `${SITE_URL}/about#founder` },
    },
    {
      "@type": "WebSite",
      "@id": `${SITE_URL}/#website`,
      url: SITE_URL,
      name: SITE_NAME,
      inLanguage: "en",
      publisher: { "@id": `${SITE_URL}/#org` },
      potentialAction: {
        "@type": "SearchAction",
        target: `${SITE_URL}/search?q={search_term_string}`,
        "query-input": "required name=search_term_string",
      },
    },
  ],
});

export const breadcrumb = (items: { name: string; path: string }[]) => ({
  "@type": "BreadcrumbList",
  itemListElement: items.map((it, i) => ({ "@type": "ListItem", position: i + 1, name: it.name, item: abs(it.path) })),
});

export const toolGraph = (t: ToolDefinition, hub: HubMeta, path = `/${t.slug}`, faqsOverride?: { q: string; a: string }[]) => {
  const s = t.seo!;
  const url = abs(path);
  const reviewer = people[s.reviewedBy];
  const faqs = faqsOverride ?? s.faqs;
  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "WebApplication",
        "@id": `${url}#app`,
        name: `${t.name} – ${SITE_NAME}`,
        url,
        description: s.description,
        applicationCategory: t.category === "developer" ? "DeveloperApplication" : "UtilitiesApplication",
        operatingSystem: "Any (web browser)",
        browserRequirements: "Requires JavaScript. Works in Chrome, Edge, Firefox, Safari.",
        isAccessibleForFree: true,
        offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
        featureList: s.featureList,
        publisher: { "@id": `${SITE_URL}/#org` },
        dateModified: s.lastReviewed,
        ...(reviewer && { reviewedBy: { "@type": "Person", name: reviewer.name, url: abs(reviewer.url) } }),
      },
      breadcrumb([
        { name: "Home", path: "/" },
        { name: hub.name, path: `/${hub.id}` },
        { name: t.name, path: `/${t.slug}` },
        ...(path !== `/${t.slug}` ? [{ name: s.h1, path }] : []),
      ]),
      {
        "@type": "HowTo",
        name: s.answerQuestion.replace(/\?$/, ""),
        totalTime: s.totalTime,
        step: s.howToSteps.map((st, i) => ({ "@type": "HowToStep", position: i + 1, name: st.name, text: st.text })),
      },
      {
        "@type": "FAQPage",
        mainEntity: faqs.map((f) => ({ "@type": "Question", name: f.q, acceptedAnswer: { "@type": "Answer", text: f.a } })),
      },
    ],
  };
};

export const hubGraph = (hub: HubMeta, items: ToolDefinition[]) => ({
  "@context": "https://schema.org",
  "@graph": [
    breadcrumb([
      { name: "Home", path: "/" },
      { name: hub.name, path: `/${hub.id}` },
    ]),
    {
      "@type": "ItemList",
      name: hub.h1,
      itemListElement: items.map((t, i) => ({ "@type": "ListItem", position: i + 1, name: t.name, url: abs(`/${t.slug}`) })),
    },
  ],
});

export const chainGraph = (c: ChainPreset) => ({
  "@context": "https://schema.org",
  "@graph": [
    breadcrumb([
      { name: "Home", path: "/" },
      { name: "Tool Chains", path: "/chain" },
      { name: c.name, path: `/chain/${c.slug}` },
    ]),
    {
      "@type": "HowTo",
      name: c.answerQuestion.replace(/\?$/, ""),
      step: c.steps.map((s, i) => ({ "@type": "HowToStep", position: i + 1, name: s.tool, text: `Run ${s.tool}` })),
    },
  ],
});
