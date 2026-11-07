import type { Metadata } from "next";
import Link from "next/link";
import { pageMetadata } from "@/lib/seo/metadata";
import { HOME_DESCRIPTION } from "@/lib/site";
import { Code2, FileText, Sparkles } from "lucide-react";
import { JsonLd } from "@/components/seo/JsonLd";
import { ToolCard } from "@/components/tool/RelatedTools";
import { LocalLists } from "@/components/home/LocalLists";
import { categories } from "@/registry/categories";
import { chains, isChainLive } from "@/registry/chains";
import { getTool, routedTools, tools } from "@/registry/tools";
import { searchIndex } from "@/registry/search-index";
import { HomeStage } from "@/components/home/HomeStage";

export const metadata: Metadata = pageMetadata({
  path: "/",
  title: "KlipKit — Drop anything. Just say what you need.",
  description: HOME_DESCRIPTION,
  ogImage: "/og/home.png",
  ogAlt: "KlipKit: free online tools that run on your device",
  index: true,
});

const POPULAR = [
  "compress-pdf",
  "image-compressor",
  "heic-to-jpg",
  "json-formatter",
  "jwt-decoder",
  "qr-code-generator",
  "background-remover",
  "pdf-to-word",
];
const ICONS = { productivity: FileText, developer: Code2, creator: Sparkles };

/**
 * A paste in the first moments after load (before React hydrates and attaches its listener) used to be lost.
 * This runs immediately and keeps such pastes (outside text fields) until HomeStage is ready to replay them.
 */
const EARLY_PASTE = `window.__kkPaste=[];addEventListener("paste",function(e){if(window.__kkPasteReady)return;var t=e.target;if(t&&t.closest&&t.closest("input,textarea,[contenteditable]"))return;var d=e.clipboardData;if(!d)return;var f=[].slice.call(d.files||[]);var x=d.getData("text")||"";if(f.length||x.trim())window.__kkPaste.push({files:f,text:x})},true);`;

const FAQ = [
  {
    q: "Is KlipKit really free?",
    a: "Yes. Every KlipKit tool is free with no sign-up, no watermark and no daily limit for tools that run on your device. Because most tools run in your browser, each use costs KlipKit almost nothing, so there is nothing to upsell.",
  },
  {
    q: "Are my files uploaded?",
    a: "Not for most tools. Tools marked “Runs on your device” process files in your browser and never upload them. A few Office conversions need KlipKit's own server; those files are deleted automatically after one hour and never shared with anyone.",
  },
  {
    q: "Does KlipKit use third-party AI services?",
    a: "No. KlipKit has no AI server and sends nothing to outside AI providers. AI tools such as the Background Remover use small open-source models that download once from klipkit.com and then run entirely on your device.",
  },
  {
    q: "Do I need to create an account?",
    a: "No. KlipKit has no accounts. Recently used tools and favourites are saved in your browser's local storage on your device, so they stay private and disappear if you clear your browser data.",
  },
];

export default function Home() {
  const popular = POPULAR.map(getTool).filter((t) => !!t);

  return (
    <>
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "FAQPage",
          mainEntity: FAQ.map((f) => ({
            "@type": "Question",
            name: f.q,
            acceptedAnswer: { "@type": "Answer", text: f.a },
          })),
        }}
      />

      {/* Main Interactive Stage matching KlipKit_UI.html */}
      <script dangerouslySetInnerHTML={{ __html: EARLY_PASTE }} />
      <HomeStage />

      {/* Server-Rendered SEO Content, FAQ, Tool Chains and Categories preserved for search/screen-readers */}
      <div className="sr-only">
        <p className="text-center text-sm font-medium text-ink2">No sign-up · Runs on your device · Free forever</p>

        <LocalLists index={searchIndex} />

        <div aria-labelledby="cats-h">
          <h2 id="cats-h" className="text-2xl font-serif font-medium mb-6">
            Tool Categories
          </h2>
          <div className="grid gap-4 md:grid-cols-3">
            {categories.map((c) => {
              const Icon = ICONS[c.id];
              return (
                <Link
                  key={c.id}
                  href={`/${c.hubs[0]}`}
                  className="rounded-2xl p-6 bg-solid border border-line shadow-sm hover:-translate-y-0.5 transition-transform block text-ink"
                >
                  <Icon className="size-6 text-accent mb-4" aria-hidden />
                  <h3 className="text-lg font-semibold text-ink">{c.name}</h3>
                  <p className="mt-1 text-sm text-ink2">{c.blurb}</p>
                  <p className="mt-4 text-xs text-ink2">
                    {routedTools().filter((t) => t.category === c.id).length} live ·{" "}
                    {tools.filter((t) => t.category === c.id).length} planned
                  </p>
                </Link>
              );
            })}
          </div>
        </div>

        <div aria-labelledby="popular-h">
          <h2 id="popular-h" className="text-2xl font-serif font-medium mb-6">
            Popular tools
          </h2>
          <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {popular.map((t) => (
              <li key={t!.slug}>
                <ToolCard tool={t!} />
              </li>
            ))}
          </ul>
        </div>

        <div id="chains" aria-labelledby="chains-h">
          <h2 id="chains-h" className="text-2xl font-serif font-medium mb-2">
            Tool Chains
          </h2>
          <p className="mb-6 text-sm text-ink2">
            Several steps, one click. Files stay in memory on your device between steps.
          </p>
          <ul className="grid gap-4 md:grid-cols-3">
            {chains.filter(isChainLive).map((c) => (
              <li key={c.slug}>
                <Link
                  href={`/chain/${c.slug}`}
                  className="block h-full rounded-2xl border border-line bg-solid p-5 shadow-sm hover:border-line2 transition-colors text-ink"
                >
                  <span className="font-semibold">{c.name}</span>
                  <span className="mt-1 block text-sm text-ink2">{c.description}</span>
                </Link>
              </li>
            ))}
          </ul>
        </div>

        <div className="prose-klip max-w-3xl">
          <h2 className="text-2xl font-serif font-medium mb-4">Questions about KlipKit</h2>
          <div className="space-y-6">
            {FAQ.map((f) => (
              <div key={f.q} className="rounded-2xl bg-solid border border-line p-6 shadow-sm">
                <h3 className="text-lg font-semibold text-ink mt-0 mb-2">{f.q}</h3>
                <p className="text-ink2 leading-relaxed m-0">{f.a}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </>
  );
}
