/**
 * The one requestAnimationFrame loop for the whole app (ADR 0001).
 * - Runs only while something is subscribed and the tab is visible.
 * - `target`: the callback runs only while that element is on (or near) the screen.
 * - `motion: true`: decorative motion, skipped while the user prefers reduced motion.
 */
import { prefersReducedMotion } from "./reducedMotion";

export type FrameCallback = (t: number, dt: number) => void;

export interface LoopOptions {
  /** Pause this callback while the element is off screen (200 px margin). */
  target?: Element | null;
  /** Decorative motion: skipped when `prefers-reduced-motion: reduce`. */
  motion?: boolean;
}

interface Entry {
  cb: FrameCallback;
  motion: boolean;
  visible: boolean;
  io?: IntersectionObserver;
}

export const now = (): number => (typeof performance !== "undefined" ? performance.now() : Date.now());

class AnimationLoop {
  private entries = new Set<Entry>();
  private raf = 0;
  private lastT = 0;
  /** Hooks that must run once per frame before subscribers (e.g. pointer smoothing). Don't keep the loop alive. */
  private before = new Set<(dt: number) => void>();

  constructor() {
    if (typeof document !== "undefined") {
      document.addEventListener("visibilitychange", () => (document.hidden ? this.stop() : this.maybeStart()));
    }
  }

  get running(): boolean {
    return this.raf !== 0;
  }

  get size(): number {
    return this.entries.size;
  }

  private maybeStart() {
    if (this.raf || !this.entries.size || typeof window === "undefined") return;
    if (typeof document !== "undefined" && document.hidden) return;
    this.lastT = now();
    this.raf = requestAnimationFrame(this.frame);
  }

  private stop() {
    if (this.raf) cancelAnimationFrame(this.raf);
    this.raf = 0;
  }

  private frame = () => {
    const t = now();
    const dt = Math.min(0.05, (t - this.lastT) / 1000);
    this.lastT = t;
    this.before.forEach((fn) => fn(dt));
    const reduced = prefersReducedMotion();
    for (const e of this.entries) {
      if (!e.visible || (e.motion && reduced)) continue;
      try {
        e.cb(t / 1000, dt);
      } catch (err) {
        console.error("Frame loop error:", err);
      }
    }
    this.raf = this.entries.size ? requestAnimationFrame(this.frame) : 0;
  };

  add(cb: FrameCallback, opts: LoopOptions = {}): () => void {
    const e: Entry = { cb, motion: !!opts.motion, visible: true };
    if (opts.target && typeof IntersectionObserver !== "undefined") {
      e.io = new IntersectionObserver(([x]) => (e.visible = x.isIntersecting), { rootMargin: "200px" });
      e.io.observe(opts.target);
    }
    this.entries.add(e);
    this.maybeStart();
    return () => {
      e.io?.disconnect();
      this.entries.delete(e);
      if (!this.entries.size) this.stop();
    };
  }

  /** Run `fn` at the start of every frame while the loop is running (doesn't keep it running). */
  beforeFrame(fn: (dt: number) => void): () => void {
    this.before.add(fn);
    return () => this.before.delete(fn);
  }
}

export const animationLoop = new AnimationLoop();

/** Subscribe to the shared frame loop. Returns an unsubscribe function. */
export function addLoop(cb: FrameCallback, opts?: LoopOptions): () => void {
  return animationLoop.add(cb, opts);
}
