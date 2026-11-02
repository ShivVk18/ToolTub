import type { Metadata } from "next";
import Link from "next/link";
import { pageMetadata } from "@/lib/metadata";
import { HOME_DESCRIPTION } from "@/lib/site";
import { Code2, FileText, Sparkles } from "lucide-react";
import { SearchButton } from "@/components/search/CommandPalette";
import { JsonLd } from "@/components/seo/JsonLd";
import { ToolCard } from "@/components/workspace/RelatedTools";
import { LocalLists } from "@/components/home/LocalLists";
import { categories } from "@/registry/categories";
import { chains, isChainLive } from "@/registry/chains";
import { getTool, routedTools, tools } from "@/registry/tools";
import { searchIndex } from "@/registry/search-index";

export const metadata: Metadata = pageMetadata({ path: "/", title: "KlipKit – Free Online Tools That Run on Your Device", description: HOME_DESCRIPTION, ogImage: "/og/home.png", ogAlt: "KlipKit: free online tools that run on your device", index: true });

const POPULAR = ["compress-pdf", "image-compressor", "heic-to-jpg", "json-formatter", "jwt-decoder", "qr-code-generator", "background-remover", "pdf-to-word"];
const ICONS = { productivity: FileText, developer: Code2, creator: Sparkles };

const FAQ = [
  { q: "Is KlipKit really free?", a: "Yes. Every KlipKit tool is free with no sign-up, no watermark and no daily limit for tools that run on your device. Because most tools run in your browser, each use costs KlipKit almost nothing, so there is nothing to upsell." },
  { q: "Are my files uploaded?", a: "Not for most tools. Tools marked “Runs on your device” process files in your browser and never upload them. A few Office conversions need KlipKit's own server; those files are deleted automatically after one hour and never shared with anyone." },
  { q: "Does KlipKit use third-party AI services?", a: "No. KlipKit has no AI server and sends nothing to outside AI providers. AI tools such as the Background Remover use small open-source models that download once from klipkit.com and then run entirely on your device." },
  { q: "Do I need to create an account?", a: "No. KlipKit has no accounts. Recently used tools and favourites are saved in your browser's local storage on your device, so they stay private and disappear if you clear your browser data." },
];

export default function Home() {
  const popular = POPULAR.map(getTool).filter((t) => !!t);
  return (
    <main className="mx-auto max-w-6xl space-y-16 px-4 py-12">
      <JsonLd data={{ "@context": "https://schema.org", "@type": "FAQPage", mainEntity: FAQ.map((f) => ({ "@type": "Question", name: f.q, acceptedAnswer: { "@type": "Answer", text: f.a } })) }} />
      <section className="mx-auto max-w-2xl text-center">
        {/* No tool count in the headline until the count is true for live tools (entity facts must be accurate). */}
        <h1 className="text-4xl font-semibold tracking-tight sm:text-5xl">Free online tools that run on your device.</h1>
        <p className="mt-4 text-lg text-fg-muted">PDFs, images, code and video. No sign-up, no uploads, no clutter.</p>
        <SearchButton className="mx-auto mt-8 h-14 w-full max-w-xl text-base" label="What do you need to do? Try “shrink pdf”" />
        <p className="mt-4 text-sm text-fg-muted">No sign-up · Runs on your device · Free forever · {routedTools().length} tools live, {tools.length - routedTools().length} on the way</p>
      </section>

      <LocalLists index={searchIndex} />

      <section aria-labelledby="cats" className="grid gap-4 md:grid-cols-3">
        <h2 id="cats" className="sr-only">Categories</h2>
        {categories.map((c) => {
          const Icon = ICONS[c.id];
          return (
            <Link key={c.id} href={`/${c.hubs[0]}`} className={`rounded-2xl bg-gradient-to-b p-6 ring-1 ${c.accent} transition-transform hover:-translate-y-0.5`}>
              <Icon className="size-6" aria-hidden />
              <h3 className="mt-4 text-lg font-semibold text-fg">{c.name}</h3>
              <p className="mt-1 text-sm text-fg-muted">{c.blurb}</p>
              <p className="mt-4 text-xs text-fg-muted">{routedTools().filter((t) => t.category === c.id).length} live · {tools.filter((t) => t.category === c.id).length} planned in total</p>
            </Link>
          );
        })}
      </section>

      <section aria-labelledby="popular">
        <h2 id="popular" className="mb-4 text-xl font-semibold">Popular tools</h2>
        <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {popular.map((t) => <li key={t!.slug}><ToolCard tool={t!} /></li>)}
        </ul>
      </section>

      <section id="chains" aria-labelledby="chains-h">
        <h2 id="chains-h" className="mb-1 text-xl font-semibold">Tool Chains</h2>
        <p className="mb-4 text-sm text-fg-muted">Several steps, one click. Files stay in memory on your device between steps.</p>
        <ul className="grid gap-3 md:grid-cols-3">
          {chains.filter(isChainLive).map((c) => (
            <li key={c.slug}>
              <Link href={`/chain/${c.slug}`} className="block h-full rounded-xl border border-border bg-card p-4 hover:border-fg/30">
                <span className="font-medium">{c.name}</span>
                <span className="mt-1 block text-sm text-fg-muted">{c.description}</span>
              </Link>
            </li>
          ))}
        </ul>
      </section>

      <section className="prose-klip max-w-3xl">
        <h2>Questions about KlipKit</h2>
        {FAQ.map((f) => (
          <div key={f.q}>
            <h3>{f.q}</h3>
            <p>{f.a}</p>
          </div>
        ))}
      </section>
    </main>
  );
}
