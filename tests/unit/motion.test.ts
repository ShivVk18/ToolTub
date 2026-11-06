// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from "vitest";
import { stepSpring } from "@/lib/motion/spring";

// Manual rAF clock: frames run only when the test calls tick().
let queue: FrameRequestCallback[] = [];
const tick = (n = 1) => {
  for (let i = 0; i < n; i++) {
    const q = queue;
    queue = [];
    q.forEach((cb) => cb(performance.now()));
  }
};
let reduce = false;
const ioCallbacks: ((entries: { isIntersecting: boolean }[]) => void)[] = [];

beforeEach(() => {
  vi.resetModules();
  queue = [];
  reduce = false;
  ioCallbacks.length = 0;
  vi.stubGlobal("requestAnimationFrame", (cb: FrameRequestCallback) => (queue.push(cb), queue.length));
  vi.stubGlobal("cancelAnimationFrame", () => (queue = []));
  vi.stubGlobal("matchMedia", () => ({ matches: reduce, addEventListener: () => {} }));
  vi.stubGlobal(
    "IntersectionObserver",
    class {
      constructor(cb: (e: { isIntersecting: boolean }[]) => void) {
        ioCallbacks.push(cb);
      }
      observe() {}
      disconnect() {}
    },
  );
  Object.defineProperty(document, "hidden", { configurable: true, value: false });
});

describe("single frame loop (ADR 0001)", () => {
  it("runs only while something is subscribed", async () => {
    const { addLoop, animationLoop } = await import("@/lib/motion/loop");
    expect(animationLoop.running).toBe(false);
    const cb = vi.fn();
    const off = addLoop(cb);
    expect(animationLoop.running).toBe(true);
    tick(3);
    expect(cb).toHaveBeenCalledTimes(3);
    off();
    expect(animationLoop.running).toBe(false);
    tick(2);
    expect(cb).toHaveBeenCalledTimes(3);
  });

  it("stops while the tab is hidden and resumes when visible", async () => {
    const { addLoop, animationLoop } = await import("@/lib/motion/loop");
    const cb = vi.fn();
    addLoop(cb);
    Object.defineProperty(document, "hidden", { configurable: true, value: true });
    document.dispatchEvent(new Event("visibilitychange"));
    expect(animationLoop.running).toBe(false);
    tick(2);
    expect(cb).not.toHaveBeenCalled();
    Object.defineProperty(document, "hidden", { configurable: true, value: false });
    document.dispatchEvent(new Event("visibilitychange"));
    tick();
    expect(cb).toHaveBeenCalledTimes(1);
  });

  it("skips decorative motion under prefers-reduced-motion", async () => {
    reduce = true;
    const { addLoop } = await import("@/lib/motion/loop");
    const decorative = vi.fn();
    const functional = vi.fn();
    addLoop(decorative, { motion: true });
    addLoop(functional);
    tick(2);
    expect(decorative).not.toHaveBeenCalled();
    expect(functional).toHaveBeenCalledTimes(2);
  });

  it("pauses a callback while its target is off screen", async () => {
    const { addLoop } = await import("@/lib/motion/loop");
    const cb = vi.fn();
    addLoop(cb, { target: document.body });
    ioCallbacks[0]([{ isIntersecting: false }]);
    tick(2);
    expect(cb).not.toHaveBeenCalled();
    ioCallbacks[0]([{ isIntersecting: true }]);
    tick();
    expect(cb).toHaveBeenCalledTimes(1);
  });

  it("tween resolves and unsubscribes when done", async () => {
    const { tween } = await import("@/lib/motion/animation");
    const { animationLoop } = await import("@/lib/motion/loop");
    const before = animationLoop.size;
    const seen: number[] = [];
    const p = tween(0, (v) => seen.push(v));
    await p;
    expect(seen.at(-1)).toBe(1);
    expect(animationLoop.size).toBe(before);
  });
});

describe("stepSpring", () => {
  it("matches the reference integrator (k=150, ζ=0.78)", () => {
    const s = { x: 0, v: 0 };
    let x = 0,
      v = 0;
    const c = 2 * Math.sqrt(150) * 0.78;
    for (let i = 0; i < 30; i++) {
      stepSpring(s, 100, 150, 0.78, 1 / 60);
      v += ((100 - x) * 150 - v * c) / 60;
      x += v / 60;
      expect(s.x).toBeCloseTo(x, 10);
    }
  });
  it("settles on the target", () => {
    const s = { x: 0, v: 0 };
    for (let i = 0; i < 600; i++) stepSpring(s, 42, 120, 0.7, 1 / 60);
    expect(s.x).toBeCloseTo(42, 3);
  });
});
