# fix(home): bento cards keep one height while their demos cycle

**Bug (B18, Medium).** On a phone, the "Say it" and "Paste anything" bento cards changed height every few seconds. Their demos cycle through samples of different lengths: the paste samples run from 7 to 58 characters, and the typing demos differ too. Longer samples wrap onto more lines, so the section grew and shrank by up to 142 px while someone was reading it. This was layout shift, and it is why "bento cards don't grow when they scroll into view" failed under load in the final Phase 4 run (88 px on Chromium, 112 px on WebKit): a slow load moves the demo clock onto a longer sample.

**Reproduce.** Run the new test on the old code: at 390 px, with the clock driven through 21 s (every typing demo and paste sample), the `#bento` height ranged from 2881 to 3023 px.

**Root cause.** Each demo area's height follows its current text. The reference has the same CSS and cycling, so it has the same shift.

**Fix (`FeelSection.tsx`).** On mount, the effect draws every typing demo (fully typed) and every paste sample once, measures each demo area, and sets the tallest value as its `min-height`. It then returns to the resting frame. It measures again after `document.fonts.ready` and whenever the window width changes. Height-only resizes, such as the mobile URL bar, are skipped. Nothing visible changes except that the cards stay still.

**Tests.** New: `bento keeps one height while its demos cycle through every sample (phone)`. It fails on the old code (142 px range) and passes on Chromium and WebKit, as do all the existing bento tests. The visual compare against the reference is unchanged.

🤖 Generated with [Claude Code](https://claude.com/claude-code)
