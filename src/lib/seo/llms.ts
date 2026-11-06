import { categories, hubs } from "@/registry/categories";
import { chains, isChainLive } from "@/registry/chains";
import { routedTools, tools } from "@/registry/tools";
import { ENTITY_DEFINITION, abs } from "../site";

const md = (s: string) => new Response(s, { headers: { "Content-Type": "text/markdown; charset=utf-8" } });

const HEADER = `# KlipKit

> ${ENTITY_DEFINITION}

KlipKit is an independent service. Privacy model:
- **Runs on your device** (most tools): files are processed in the browser and never uploaded.
- **KlipKit's own server** (Office ↔ PDF only): files are converted in an isolated container and deleted within 1 hour.
- No third-party APIs, no outside AI providers, no external CDNs. On-device AI models are open-source and served from klipkit.com.
- Free, no account, no watermark.
`;

/** /llms.txt: what KlipKit is + every available tool, one line each. Generated from the registry at build time. */
export function llmsTxt() {
  let out = HEADER;
  for (const c of categories) {
    out += `\n## ${c.name} tools\n\n`;
    for (const h of hubs.filter((x) => c.hubs.includes(x.id))) {
      const list = routedTools().filter((t) => t.hub === h.id);
      if (!list.length) continue;
      out += `### ${h.name} (${abs(`/${h.id}`)})\n\n`;
      for (const t of list)
        out += `- [${t.name}](${abs(`/${t.slug}`)}): ${(t.seo?.llmsLine ?? t.tagline).replace(`${t.name}: `, "")} ${t.processing.where === "device" ? "Runs on the device." : "Own server, deleted after 1 hour."}\n`;
      out += "\n";
    }
  }
  out += `## Tool Chains\n\n${chains
    .filter(isChainLive)
    .map((c) => `- [${c.name}](${abs(`/chain/${c.slug}`)}): ${c.description}`)
    .join("\n")}\n`;
  out += `\n## Optional\n\n- [Full content for LLMs](${abs("/llms-full.txt")})\n- [Privacy](${abs("/privacy")})\n- [Open-source licences](${abs("/licences")})\n- Coming soon: ${tools.filter((t) => t.status === "planned").length} more tools.\n`;
  return md(out);
}

/** /llms-full.txt: answer blocks, key facts and FAQs for every tool that has full content. */
export function llmsFullTxt() {
  let out = HEADER;
  for (const t of tools.filter((x) => x.seo && x.status !== "planned")) {
    const s = t.seo!;
    out += `\n---\n\n## ${t.name}\n\nURL: ${abs(`/${t.slug}`)}\nLast reviewed: ${s.lastReviewed}\n\n### ${s.answerQuestion}\n\n${s.answerSummary}\n\n### Key facts\n\n${s.keyFacts.map((f) => `- ${f}`).join("\n")}\n\n### How to use it\n\n${s.howToSteps.map((x, i) => `${i + 1}. ${x.name}: ${x.text}`).join("\n")}\n\n### FAQ\n\n${s.faqs.map((f) => `**${f.q}**\n${f.a}`).join("\n\n")}\n`;
  }
  return md(out);
}
