import Link from "next/link";
import type { ToolDefinition } from "@/registry/types";
import { catColor } from "@/lib/designTools";
import { ToolMark } from "./ToolMark";

/** Related tools as home-style chips (a pill with the category's colour mark), in the page's one column. */
export function RelatedTools({ tools }: { tools: ToolDefinition[] }) {
  if (!tools.length) return null;
  return (
    <section aria-labelledby="related" className="mt-10 max-w-3xl">
      <h2 id="related" className="mb-3 text-sm font-medium text-ink2">
        Related tools
      </h2>
      <ul className="flex flex-wrap gap-2 list-none p-0">
        {tools.map((t) => (
          <li key={t.slug}>
            <Link
              href={`/${t.slug}`}
              title={t.tagline}
              className="inline-flex h-10 items-center gap-2 rounded-full border border-line bg-solid px-4 text-sm font-medium text-ink no-underline transition-colors hover:border-line2 hover:bg-soft"
            >
              <i aria-hidden className="block size-2 rounded-[3px]" style={{ background: catColor(t.category) }} />
              {t.home?.name ?? t.name}
            </Link>
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
    <div className="h-full rounded-xl border border-dashed border-border p-4">{inner}</div>
  ) : (
    <Link
      href={`/${tool.slug}`}
      className="block h-full rounded-xl border border-border bg-card p-4 transition-colors hover:border-fg/30"
    >
      {inner}
    </Link>
  );
}

/** Large hub card for a live tool, in the Explore grid's style. Panel tools open on the home page. */
export function HubToolCard({ tool }: { tool: ToolDefinition }) {
  const routed = tool.status !== "planned";
  return (
    <Link
      href={routed ? `/${tool.slug}` : `/#${tool.slug}`}
      className="relative block h-full min-h-[168px] rounded-[24px] border border-line bg-solid p-[22px] no-underline transition-shadow hover:shadow-[var(--shadow)]"
    >
      <ToolMark category={tool.category} home={tool.home} />
      <span className="absolute right-[22px] top-[22px] text-[12px] font-medium text-ink2">
        {!routed ? (
          // --g-c: the AA-safe green (--ok is 3.4:1 on white at 12 px)
          <b style={{ color: "var(--g-c)", fontWeight: 600 }}>● Live</b>
        ) : tool.processing.where === "own-server" ? (
          "Private server"
        ) : (
          "On device"
        )}
      </span>
      <span className="mt-[16px] block text-[18px] font-semibold text-ink">{tool.name}</span>
      <span className="mt-[4px] block text-[14px] leading-[1.45] text-ink2">{tool.tagline}</span>
    </Link>
  );
}
