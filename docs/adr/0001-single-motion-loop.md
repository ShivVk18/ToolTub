# 0001 — One motion loop, paused when nothing needs it

- Status: accepted
- Date: 2026-11-06

## Context
All animation already shared one requestAnimationFrame loop (`addLoop`), but it never stopped: it ran with no subscribers and in hidden tabs, a pointer-smoothing subscriber was registered at import time, nothing paused off-screen sections, the magnetic-button effect measured every `[data-mag]` element every frame, and `prefers-reduced-motion` was honoured only by the aurora background.

## Decision
- `src/lib/motion/loop.ts` owns the loop. It runs only while there are subscribers and the tab is visible.
- `addLoop(cb, { target, motion })`: `target` pauses the callback while the element is off screen (IntersectionObserver, 200 px margin); `motion: true` marks decorative motion, skipped under reduced motion.
- Pointer smoothing runs as a per-frame step (`beforeFrame`) that doesn't keep the loop alive.
- Hooks for new code: `useFrame(cb, { target, motion })`, `useSpring(target, k, ζ)`, `useReducedMotion()`. Shared integrator: `stepSpring` (used by the orb).
- Reduced motion: satellites hidden; marquee, bento demos, pricing ring, typewriter, aurora and magnetic buttons stop; the orb still follows its slot but doesn't lean, spin or breathe.

## Consequences
- No CPU work in background tabs or for off-screen sections; idle magnetic buttons cost nothing.
- Functional loops (nav progress line, orb positioning, tweens, scroll) must not be marked `motion`.
- `tests/unit/motion.test.ts` covers start/stop, hidden tab, reduced motion, off-screen pause and the spring; the e2e reduced-motion test asserts satellites hidden and no movement.
