# fix(search): "shrink" in ⌘K showed Image Compressor before Compress PDF

**Severity: Low** (search ranking). Found by flow 5.8, whose expected value is shrink → Compress PDF.

**Root cause.** "shrink" matches Compress PDF ("shrink pdf") and Image Compressor ("shrink photo") about equally: Fuse scored them 0.196 and 0.134. Fuse's small difference decided the order, which isn't meaningful at that distance.

**Fix.** Results are ordered by availability first, then by score in 0.1-wide buckets, so the order stays transitive. Within a bucket the tool earlier in the home grid (popularity) wins, and the rest keep Fuse's order. Clear winners are unaffected: every existing search case keeps its result.

**Tests first.** `search.test.ts` now also checks the spec's single-word synonyms: shrink → Compress PDF, bg → Background Remover, iphone → HEIC to JPG. shrink failed before the fix; all 14 pass after. The palette e2e tests (shortcut, synonyms, Popular, no results) pass on Chromium and WebKit.

🤖 Generated with [Claude Code](https://claude.com/claude-code)
