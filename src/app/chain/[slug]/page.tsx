import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Breadcrumbs } from "@/components/seo/Breadcrumbs";
import { JsonLd } from "@/components/seo/JsonLd";
import { PrivacyBadge } from "@/components/workspace/PrivacyBadge";
import { chains, getChain, isChainLive } from "@/registry/chains";
import { getTool } from "@/registry/tools";
import { chainGraph } from "@/lib/schema";
import { pageMetadata } from "@/lib/metadata";
import { ChainRunner } from "./ChainRunner";

export const instant = false;

export function generateStaticParams() {
  return chains.filter(isChainLive).map((c) => ({ slug: c.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const c = getChain((await params).slug);
  if (!c) return {};
  return pageMetadata({ path: `/chain/${c.slug}`, title: `${c.name} – Free Tool Chain | KlipKit`, description: c.metaDescription, ogImage: `/og/chain-${c.slug}.png`, ogAlt: c.name, index: true });
}

export default async function ChainPage({ params }: { params: Promise<{ slug: string }> }) {
  const c = getChain((await params).slug);
  if (!c || !isChainLive(c)) notFound();
  const steps = c.steps.map((s) => ({ ...s, name: getTool(s.tool)!.name }));
  return (
    <main className="mx-auto max-w-4xl px-4 py-8">
      <JsonLd data={chainGraph(c)} />
      <Breadcrumbs items={[{ name: "Home", path: "/" }, { name: "Tool Chains", path: "/#chains" }, { name: c.name, path: `/chain/${c.slug}` }]} />
      <h1 className="mt-4 text-3xl font-semibold tracking-tight sm:text-4xl">{c.name}</h1>
      <p className="mt-3 text-lg text-fg-muted">{c.description}</p>
      <ol className="my-6 flex flex-wrap items-center gap-2 text-sm">
        {steps.map((s, i) => (
          <li key={i} className="flex items-center gap-2">
            {i > 0 && <span aria-hidden className="text-fg-muted">→</span>}
            <span className="rounded-full border border-border px-3 py-1">{s.name}</span>
          </li>
        ))}
      </ol>
      <div className="mb-4"><PrivacyBadge processing={{ where: "device" }} /></div>
      <ChainRunner steps={steps} accept={c.input === "image/heic" ? ".heic,.heif" : "image/*"} />
      <section className="prose-klip mx-auto mt-16 max-w-3xl">
        <h2>{c.answerQuestion}</h2>
        <p>{c.answerSummary}</p>
      </section>
    </main>
  );
}
