import Link from "next/link";
import type { ToolDefinition } from "@/registry/types";

export function RelatedTools({ tools }: { tools: ToolDefinition[] }) {
  if (!tools.length) return null;
  return (
    <section aria-labelledby="related" className="mt-10">
      <h2 id="related" className="mb-3 text-sm font-medium text-fg-muted">Related tools</h2>
      <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {tools.map((t) => (
          <li key={t.slug}>
            <ToolCard tool={t} />
          </li>
        ))}
      </ul>
    </section>
  );
}

export function ToolCard({ tool }: { tool: Pick<ToolDefinition, "slug" | "name" | "tagline" | "status"> }) {
  const soon = tool.status === "planned";
  const inner = (
    <>
      <span className="block font-medium">{tool.name}</span>
      <span className="mt-1 block text-sm text-fg-muted">{soon ? "Coming soon" : tool.tagline}</span>
    </>
  );
  return soon ? (
    <div className="h-full rounded-xl border border-dashed border-border p-4 opacity-70">{inner}</div>
  ) : (
    <Link href={`/${tool.slug}`} className="block h-full rounded-xl border border-border bg-card p-4 transition-colors hover:border-fg/30">
      {inner}
    </Link>
  );
}
