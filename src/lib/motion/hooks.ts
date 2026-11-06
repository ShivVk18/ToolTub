"use client";
import { useEffect, useRef, useState, type RefObject } from "react";
import { addLoop, type FrameCallback } from "./loop";
import { onReducedMotionChange, prefersReducedMotion } from "./reducedMotion";
import { stepSpring, type SpringState } from "./spring";

/**
 * Run `cb` every frame while mounted. With `target`, only while that element is on screen;
 * with `motion`, never under reduced motion. The latest `cb` is always used (no resubscribe).
 */
export function useFrame(
  cb: FrameCallback,
  opts: { target?: RefObject<Element | null>; motion?: boolean; enabled?: boolean } = {},
) {
  const ref = useRef(cb);
  ref.current = cb;
  const { target, motion, enabled = true } = opts;
  useEffect(() => {
    if (!enabled) return;
    return addLoop((t, dt) => ref.current(t, dt), { target: target?.current ?? null, motion });
  }, [target, motion, enabled]);
}

/** Current `prefers-reduced-motion`, updated live. False during SSR and the first render. */
export function useReducedMotion(): boolean {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    setReduced(prefersReducedMotion());
    return onReducedMotionChange(setReduced);
  }, []);
  return reduced;
}

/**
 * A spring-animated number that follows `target`. Returns a ref (read it inside useFrame) so updates
 * don't re-render. Under reduced motion it snaps to the target.
 */
export function useSpring(target: number, stiffness = 150, damping = 0.78): RefObject<SpringState> {
  const s = useRef<SpringState>({ x: target, v: 0 });
  const goal = useRef(target);
  goal.current = target;
  useFrame((_t, dt) => {
    if (prefersReducedMotion()) {
      s.current.x = goal.current;
      s.current.v = 0;
      return;
    }
    stepSpring(s.current, goal.current, stiffness, damping, dt);
  });
  return s;
}
