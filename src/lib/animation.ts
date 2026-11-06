/**
 * Shared requestAnimationFrame loop and motion utilities for KlipKit.
 * Matches design/reference/KlipKit_UI.html motion specifications.
 */

export const now = (): number => (typeof performance !== "undefined" ? performance.now() : Date.now());

export const wait = (ms: number): Promise<void> => new Promise((resolve) => setTimeout(resolve, ms));

export const clamp = (x: number, a: number, b: number): number => Math.max(a, Math.min(b, x));

export const ease = {
  out: (p: number): number => 1 - Math.pow(1 - p, 3),
  io: (p: number): number => (p < 0.5 ? 4 * p * p * p : 1 - Math.pow(-2 * p + 2, 3) / 2),
  io4: (p: number): number => (p < 0.5 ? 8 * p * p * p * p : 1 - Math.pow(-2 * p + 2, 4) / 2),
};

type FrameCallback = (t: number, dt: number) => void;

class AnimationLoop {
  private loops = new Set<FrameCallback>();
  private lastT = now();
  private running = false;

  constructor() {
    if (typeof window !== "undefined") {
      this.start();
    }
  }

  private start() {
    if (this.running) return;
    this.running = true;
    this.lastT = now();
    const frame = () => {
      const t = now();
      const dt = Math.min(0.05, (t - this.lastT) / 1000);
      this.lastT = t;
      for (const cb of this.loops) {
        try {
          cb(t / 1000, dt);
        } catch (e) {
          console.error("Frame loop error:", e);
        }
      }
      if (this.running) {
        requestAnimationFrame(frame);
      }
    };
    requestAnimationFrame(frame);
  }

  public add(cb: FrameCallback): () => void {
    this.loops.add(cb);
    return () => {
      this.loops.delete(cb);
    };
  }

  public remove(cb: FrameCallback): void {
    this.loops.delete(cb);
  }
}

export const animationLoop = new AnimationLoop();

export function addLoop(cb: FrameCallback): () => void {
  return animationLoop.add(cb);
}

export function tween(ms: number, fn: (p: number) => void, e: (p: number) => number = ease.out): Promise<void> {
  if (typeof window === "undefined") {
    fn(1);
    return Promise.resolve();
  }
  return new Promise((resolve) => {
    const s = now();
    const f: FrameCallback = () => {
      const p = clamp((now() - s) / ms, 0, 1);
      fn(e(p));
      if (p >= 1) {
        animationLoop.remove(f);
        resolve();
      }
    };
    animationLoop.add(f);
    f(s / 1000, 0);
  });
}

// Global pointer coordinates with smoothing
export const ptr = {
  x: typeof window !== "undefined" ? window.innerWidth / 2 : 600,
  y: typeof window !== "undefined" ? window.innerHeight * 0.6 : 400,
  sx: typeof window !== "undefined" ? window.innerWidth / 2 : 600,
  sy: typeof window !== "undefined" ? window.innerHeight * 0.6 : 400,
};

if (typeof window !== "undefined") {
  window.addEventListener(
    "pointermove",
    (e) => {
      ptr.x = e.clientX;
      ptr.y = e.clientY;
    },
    { passive: true },
  );

  addLoop((_t, dt) => {
    ptr.sx += (ptr.x - ptr.sx) * Math.min(1, dt * 3);
    ptr.sy += (ptr.y - ptr.sy) * Math.min(1, dt * 3);
  });
}

/**
 * Deterministic smooth scroll with requestAnimationFrame and ease.io4.
 */
export function goto(target: string | number, ms: number = 1200): Promise<void> {
  if (typeof window === "undefined") return Promise.resolve();
  const y0 = window.scrollY;
  let y1 = 0;
  if (typeof target === "number") {
    y1 = target;
  } else {
    const el = document.getElementById(target);
    if (!el) return Promise.resolve();
    y1 = el.getBoundingClientRect().top + window.scrollY - 20;
  }
  return tween(
    ms,
    (p) => {
      window.scrollTo(0, y0 + (y1 - y0) * p);
    },
    ease.io4,
  );
}

/**
 * Ripple ring helper for clicks, drops, and step completion.
 */
export function ripple(x: number, y: number, size: number = 300, color?: string): void {
  if (typeof document === "undefined") return;
  const r = document.createElement("div");
  r.style.position = "absolute";
  r.style.borderRadius = "50%";
  r.style.border = "2px solid " + (color || "var(--accent)");
  r.style.pointerEvents = "none";
  r.style.zIndex = "4";
  r.style.left = x + "px";
  r.style.top = y + "px";
  r.style.width = size + "px";
  r.style.height = size + "px";
  r.style.animation = "rip 1s cubic-bezier(.2,.8,.2,1) forwards";

  const container = document.getElementById("stage") || document.body;
  container.appendChild(r);
  setTimeout(() => {
    r.remove();
  }, 1100);
}

export const getPointer = () => ptr;

/**
 * Magnetic button pointer attraction effect from KlipKit_UI.html lines 1044-1047
 */
export function initMagneticButtons(): () => void {
  if (typeof window === "undefined") return () => {};
  return addLoop(() => {
    const els = document.querySelectorAll<HTMLElement>("[data-mag]");
    for (const el of Array.from(els)) {
      const r = el.getBoundingClientRect();
      if (!r.width) continue;
      const cx = r.left + r.width / 2;
      const cy = r.top + r.height / 2;
      const dx = ptr.x - cx;
      const dy = ptr.y - cy;
      const d = Math.hypot(dx, dy);
      const R = Math.max(r.width, r.height) * 0.9 + 40;
      const k = d < R ? 1 - d / R : 0;
      const tx = dx * 0.28 * k;
      const ty = dy * 0.38 * k;
      const cur = ((el as unknown as Record<string, unknown>)._mg as [number, number]) || [0, 0];
      cur[0] += (tx - cur[0]) * 0.2;
      cur[1] += (ty - cur[1]) * 0.2;
      (el as unknown as Record<string, unknown>)._mg = cur;
      el.style.translate = `${cur[0].toFixed(2)}px ${cur[1].toFixed(2)}px`;
    }
  });
}
