/** `prefers-reduced-motion: reduce`, kept current when the OS setting changes. */
const QUERY = "(prefers-reduced-motion: reduce)";
let reduced = false;
const listeners = new Set<(r: boolean) => void>();

if (typeof window !== "undefined" && typeof window.matchMedia === "function") {
  const mq = window.matchMedia(QUERY);
  reduced = mq.matches;
  mq.addEventListener?.("change", (e) => {
    reduced = e.matches;
    listeners.forEach((l) => l(reduced));
  });
}

export const prefersReducedMotion = (): boolean => reduced;

export function onReducedMotionChange(cb: (reduced: boolean) => void): () => void {
  listeners.add(cb);
  return () => listeners.delete(cb);
}
