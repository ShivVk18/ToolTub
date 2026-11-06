# refactor: one motion loop that pauses off screen, in hidden tabs and under reduced motion (ADR 0001)

## What and why
Standards §2.5. The shared rAF loop never stopped (no subscribers, hidden tabs), the magnetic effect measured every button every frame, nothing paused off-screen sections, and reduced motion was ignored everywhere except the aurora.

## How
- `lib/motion/loop.ts` (new core), `reducedMotion.ts`, `spring.ts` (`stepSpring`), `hooks.ts` (`useFrame`, `useSpring`, `useReducedMotion`). `animation.ts` keeps `tween`/`goto`/`ripple`/pointer/magnetic on top of it.
- Loop starts with the first subscriber, stops with the last, stops while `document.hidden`.
- `addLoop` options: `target` (marquee, bento, pricing ring, wordmark, Explore count-up, satellites/stage) and `motion` (marquee, bento, pricing ring, satellites, typewriter, aurora, magnetic).
- Magnetic buttons skip all measuring when the pointer is idle and buttons are at rest.
- Orb uses `stepSpring` (same integrator) and, under reduced motion, follows its slot without lean/spin/breathe. Satellites hidden under reduced motion (CSS).

## Evidence
- New `tests/unit/motion.test.ts` (7): loop runs only with subscribers, stops/resumes with tab visibility, skips decorative callbacks under reduced motion, pauses off-screen targets, tween unsubscribes, `stepSpring` equals the reference integrator and settles.
- E2E "prefers-reduced-motion turns off continuous animations" now asserts satellites hidden, orb `--r`, typewriter placeholder and marquee transforms unchanged over 1.5 s, and orb centred on its slot (previously it only checked the hero was visible).
- Normal-motion screenshots vs before: home light 0.16%, dark 0.00%, mobile 0.00%, JSON Formatter 0.00%.
- `npm run verify`: exit 0 — 215/215 unit tests. Playwright platform + chromium: 119 passed, 11 skipped, 0 failed.

## Checklist
- [x] One concern only (motion infrastructure)
- [x] `npm run verify` green
- [x] ADR 0001 added
