import { PageTitle } from "@/components/ui/PageTitle";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { JsonLd } from "@/components/seo/JsonLd";
import { Breadcrumbs } from "@/components/seo/Breadcrumbs";
import { ToolContent } from "@/components/seo/ToolContent";
import { PrivacyBadge } from "@/components/tool/PrivacyBadge";
import { FavouriteButton, VisitTracker } from "@/components/tool/ToolChrome";
import { HubToolCard, RelatedTools } from "@/components/tool/RelatedTools";
import { ToolUI } from "@/tools";
import { getHub, hubs } from "@/registry/categories";
import {
  canChain,
  getTool,
  getVariant,
  isHubIndexable,
  isIndexable,
  relatedFor,
  routedTools,
  toolsInHub,
} from "@/registry/tools";
import type { LongTailVariant, ToolDefinition } from "@/registry/types";
import { hubGraph, toolGraph } from "@/lib/seo/schema";
import { pageMetadata } from "@/lib/seo/metadata";

/**
 * One flat route for every keyword URL: /compress-pdf (tool), /compress-pdf-to-100kb (long-tail variant)
 * and /pdf-tools (category hub). All prerendered at build time from the registry.
 */
type Resolved =
  | { kind: "tool"; tool: ToolDefinition }
  | { kind: "variant"; tool: ToolDefinition; variant: LongTailVariant }
  | { kind: "hub"; hub: NonNullable<ReturnType<typeof getHub>> };

function resolve(slug: string): Resolved | undefined {
  const tool = getTool(slug);
  if (tool && tool.status !== "planned") return { kind: "tool", tool };
  const v = getVariant(slug);
  if (v && v.tool.status !== "planned") return { kind: "variant", ...v };
  const hub = getHub(slug);
  if (hub) return { kind: "hub", hub };
}

export const instant = false;

export function generateStaticParams() {
  const variants = routedTools().flatMap((t) => t.seo?.longTailVariants?.map((v) => v.slug) ?? []);
  return [...routedTools().map((t) => t.slug), ...variants, ...hubs.map((h) => h.id)].map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const r = resolve((await params).slug);
  if (!r) return {};
  if (r.kind === "hub") {
    return pageMetadata({
      path: `/${r.hub.id}`,
      title: r.hub.title,
      description: r.hub.description,
      ogImage: `/og/${r.hub.id}.png`,
      ogAlt: r.hub.h1,
      index: isHubIndexable(r.hub.id),
    });
  }
  const t = r.tool;
  const s = t.seo;
  if (r.kind === "variant") {
    const v = r.variant;
    return pageMetadata({
      path: `/${v.slug}`,
      title: v.title,
      description: v.description,
      ogImage: `/og/${v.slug}.png`,
      ogAlt: v.h1,
      keywords: [v.keyword],
      index: isIndexable(t),
      category: t.category,
    });
  }
  return pageMetadata({
    path: `/${t.slug}`,
    title: s?.title ?? `${t.name} – Free & Private | KlipKit`,
    description: s?.description ?? t.metaDescription ?? t.tagline,
    ogTitle: s?.ogTitle,
    ogDescription: s?.ogDescription,
    ogImage: `/og/${t.slug}.png`,
    ogAlt: s?.ogAlt ?? t.name,
    keywords: s ? [s.primaryKeyword, ...s.secondaryKeywords] : t.synonyms,
    languages: s?.locales,
    index: isIndexable(t),
    category: t.category,
  });
}

export default async function Page({ params }: { params: Promise<{ slug: string }> }) {
  const r = resolve((await params).slug);
  if (!r) notFound();
  if (r.kind === "hub") return <HubPage hub={r.hub} />;

  const t = r.tool;
  const variant = r.kind === "variant" ? r.variant : undefined;
  const hub = getHub(t.hub)!;
  const path = variant ? `/${variant.slug}` : `/${t.slug}`;
  const next = routedTools()
    .filter((x) => x.slug !== t.slug && canChain(t, x))
    .slice(0, 6)
    .map((x) => ({ slug: x.slug, name: x.name }));
  const crumbs = [
    { name: "Home", path: "/" },
    { name: hub.name, path: `/${hub.id}` },
    { name: t.name, path: `/${t.slug}` },
    ...(variant ? [{ name: variant.h1, path }] : []),
  ];
  const faqs = variant && t.seo ? [...variant.faqs, ...t.seo.faqs].slice(0, 8) : undefined;

  return (
    <main className="mx-auto max-w-4xl px-4 py-8">
      <VisitTracker slug={t.slug} />
      {t.seo && <JsonLd data={toolGraph(t, hub, path, faqs)} />}
      <Breadcrumbs items={crumbs} />
      <header className="mb-6 mt-4 space-y-3">
        <PageTitle>{variant?.h1 ?? t.seo?.h1 ?? t.name}</PageTitle>
        <p className="text-lg text-fg-muted">{variant?.intro ?? t.tagline}</p>
        <div className="flex flex-wrap items-center gap-2">
          <PrivacyBadge processing={t.processing} />
          <FavouriteButton slug={t.slug} />
          {t.status === "beta" && (
            <span className="rounded-full border border-amber-500/30 bg-amber-500/5 px-3 py-1 text-xs text-amber-700 dark:text-amber-400">
              Beta
            </span>
          )}
        </div>
      </header>
      <ToolUI slug={t.slug} preset={variant?.preset} next={next} />
      <RelatedTools tools={relatedFor(t)} />
      {t.seo && <ToolContent tool={t} faqs={faqs} />}
    </main>
  );
}

function HubPage({ hub }: { hub: NonNullable<ReturnType<typeof getHub>> }) {
  const all = toolsInHub(hub.id);
  const available = all.filter((t) => t.status !== "planned");
  // Live = has its own page, or runs as a live panel on the home page (opened by its #slug deep link).
  const live = all.filter((t) => t.status !== "planned" || t.card);
  const soon = all.filter((t) => t.status === "planned" && !t.card);
  return (
    <main className="mx-auto max-w-6xl px-4 py-8">
      <JsonLd data={hubGraph(hub, available)} />
      <Breadcrumbs
        items={[
          { name: "Home", path: "/" },
          { name: hub.name, path: `/${hub.id}` },
        ]}
      />
      <PageTitle className="mt-4">{hub.h1}</PageTitle>
      <p className="mt-3 max-w-2xl text-lg text-fg-muted">{hub.description}</p>
      {live.length > 0 && (
        <ul data-hub-live className="mt-8 grid list-none gap-[18px] p-0 sm:grid-cols-2 lg:grid-cols-3">
          {live.map((t) => (
            <li key={t.slug}>
              <HubToolCard tool={t} />
            </li>
          ))}
        </ul>
      )}
      {soon.length > 0 && (
        <>
          <h2 className="mt-12 text-sm font-medium text-ink2">Coming soon</h2>
          <ul data-hub-soon className="mt-3 flex list-none flex-wrap gap-2 p-0">
            {soon.map((t) => (
              <li
                key={t.slug}
                className="inline-flex h-8 items-center rounded-full border border-dashed border-line2 px-3 text-[13px] text-ink2"
              >
                {t.home?.name ?? t.name}
              </li>
            ))}
          </ul>
        </>
      )}
      <section className="prose-klip mt-16 max-w-3xl">
        <h2>{hub.answerQuestion}</h2>
        <p>{hub.answerSummary}</p>
      </section>
    </main>
  );
}
