/** Damped spring state for one value. */
export interface SpringState {
  x: number;
  v: number;
}

/**
 * Advance a damped spring toward `target` by `dt` seconds (semi-implicit Euler, as in the reference).
 * `stiffness` k and `damping` ratio ζ: c = 2·√k·ζ; v += ((target − x)·k − v·c)·dt; x += v·dt.
 */
export function stepSpring(
  s: SpringState,
  target: number,
  stiffness: number,
  damping: number,
  dt: number,
): SpringState {
  const c = 2 * Math.sqrt(stiffness) * damping;
  s.v += ((target - s.x) * stiffness - s.v * c) * dt;
  s.x += s.v * dt;
  return s;
}
