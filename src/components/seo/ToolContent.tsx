import Link from "next/link";
import type { FAQ, ToolDefinition } from "@/registry/types";
import { people } from "@/registry/people";
import { chains, isChainLive } from "@/registry/chains";

/**
 * The AEO block under every tool, in the exact order of the brief (§8.3).
 * Server component: all of this is in the HTML that crawlers and AI engines fetch, no JS needed.
 */
export function ToolContent({ tool, faqs }: { tool: ToolDefinition; faqs?: FAQ[] }) {
  const s = tool.seo!;
  const reviewer = people[s.reviewedBy];
  const relatedChains = chains.filter((c) => isChainLive(c) && c.steps.some((st) => st.tool === tool.slug));
  return (
    <article className="prose-klip mx-auto mt-16 max-w-3xl space-y-12">
      {/* 1. Answer-first summary */}
      <section>
        <h2>{s.answerQuestion}</h2>
        <p className="text-lg">{s.answerSummary}</p>
      </section>

      {/* 2. Key facts */}
      <section>
        <h2>{tool.name}: key facts</h2>
        <ul>{s.keyFacts.map((f) => <li key={f}>{f}</li>)}</ul>
      </section>

      {/* 3. How-to (mirrors HowTo JSON-LD) */}
      <section>
        <h2>{s.answerQuestion.replace(/\?$/, "")}: step by step</h2>
        <ol>{s.howToSteps.map((st) => <li key={st.name}><strong>{st.name}.</strong> {st.text}</li>)}</ol>
      </section>

      {/* 4. Comparison table */}
      {s.comparisonTable && (
        <section>
          <h2>{s.comparisonTable.caption}</h2>
          <div className="overflow-x-auto" tabIndex={0} role="region" aria-label={s.comparisonTable.caption}>
            <table>
              <thead><tr>{s.comparisonTable.headers.map((h) => <th key={h} scope="col">{h}</th>)}</tr></thead>
              <tbody>{s.comparisonTable.rows.map((r) => <tr key={r[0]}>{r.map((c, i) => (i === 0 ? <th key={i} scope="row">{c}</th> : <td key={i}>{c}</td>))}</tr>)}</tbody>
            </table>
          </div>
        </section>
      )}

      {/* 5. FAQs (mirrors FAQPage JSON-LD) */}
      <section>
        <h2>Frequently asked questions</h2>
        {(faqs ?? s.faqs).map((f) => (
          <div key={f.q}>
            <h3>{f.q}</h3>
            <p>{f.a}</p>
          </div>
        ))}
      </section>

      {/* 6. Explainer */}
      <section>
        <h2>About {s.primaryKeyword}</h2>
        {s.explainer.split("\n\n").map((p) => <p key={p.slice(0, 32)}>{p}</p>)}
      </section>

      {/* 7. Related chains + guides (related tools render above, next to the tool) */}
      {(relatedChains.length > 0 || s.relatedGuides.length > 0) && (
        <section>
          <h2>Keep going</h2>
          <ul>
            {relatedChains.map((c) => <li key={c.slug}><Link href={`/chain/${c.slug}`}>Tool Chain: {c.name}</Link></li>)}
            {/* Guides are listed for planning; link them once /guides pages exist. */}
            {s.relatedGuides.map((g) => <li key={g} className="text-fg-muted">Guide (coming soon): {g.replace(/-/g, " ")}</li>)}
          </ul>
        </section>
      )}

      {/* 8. Freshness + reviewer */}
      <p className="text-sm text-fg-muted">
        Last updated <time dateTime={s.lastReviewed}>{new Date(s.lastReviewed + "T00:00:00Z").toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" })}</time>
        {reviewer && <> · Reviewed by <Link href={reviewer.url}>{reviewer.name}</Link>, {reviewer.role.toLowerCase()}</>}
      </p>
    </article>
  );
}
