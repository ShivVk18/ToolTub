import { catColor, catKey, glyphColor, tint, TOOL_ICON_PATHS } from "@/lib/designTools";
import type { CategoryId, HomeCard } from "@/registry/types";

/** A tool's tinted icon tile, or its mono glyph when it has one (as in the Explore grid). */
export function ToolMark({ category, home, size = 46 }: { category: CategoryId; home?: HomeCard; size?: number }) {
  const c = catColor(category);
  const g = home?.glyph;
  return (
    <span
      aria-hidden
      className="ti grid flex-none place-items-center"
      style={{ width: size, height: size, borderRadius: size * 0.3, background: tint(c) }}
    >
      {g ? (
        <span
          className="font-mono font-semibold leading-none tracking-[-0.02em]"
          style={{ color: glyphColor(catKey(category)), fontSize: g.length > 3 ? 12 : g.length > 2 ? 14 : 17 }}
        >
          {g}
        </span>
      ) : (
        <svg
          width={size * 0.48}
          height={size * 0.48}
          viewBox="0 0 24 24"
          fill="none"
          stroke={c}
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d={TOOL_ICON_PATHS[home?.icon ?? "code"] || TOOL_ICON_PATHS.code} />
        </svg>
      )}
    </span>
  );
}
