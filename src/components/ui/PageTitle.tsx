import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/** Page title for every page except the home hero: left-aligned serif, as in the design DNA (§3). */
export function PageTitle({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <h1
      className={cn(
        "font-serif font-medium text-ink text-[clamp(36px,4.2vw,56px)] leading-[1.05] tracking-[-0.02em]",
        className,
      )}
    >
      {children}
    </h1>
  );
}
