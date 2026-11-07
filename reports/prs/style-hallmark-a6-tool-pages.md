# style(hallmark A6): tool pages adopt the home page's devices

**Problem.** Tool pages looked like a different site from the home page: sans H2s with no section rhythm, a flat wall of FAQ questions and answers, and a generic lucide upload icon in the drop target.

**Fix (approved ASK item A6).**
- **Section heads.** Every guide section opens with a numbered kicker (`01 In short`, `02 Key facts` … `07 Next`), the home `.eyb` left-aligned. The H2s are serif (`--serif`, 28–40 px), as on the home page. The kicker number uses `--g-d`, so it stays AA in dark mode.
- **FAQ.** Each question is a `<details class="faq">` with a +/× marker, closed by default. The answers stay in the HTML, and the FAQPage JSON-LD is unchanged. `seo.spec` still finds every question and answer in the page text.
- **Drop target.** The upload icon becomes a small orb (the hero's conic colours) with an arrow, inside a 24 px-radius dashed box with a faint violet tint at the top.
- **SEO markup unchanged.** The answer-first block keeps its exact `<h2>…?</h2><p class="text-lg">` markup; kickers sit before the H2.

**Test first.** `tool-design.spec.ts › A6`. It failed before the change and passes after:
- H2s use the serif font;
- every section has a kicker, starting at "01";
- the FAQ is `details.faq`, closed, and opens on click;
- the dropzone has `.kk-orb-mini` with a conic gradient and no lucide upload icon.

Other results:
- `seo.spec` (6) passes.
- `tools`, `platform`, `file-states` and `tool-design` pass on Chromium (104).
- Screenshots checked (drop target light, full page dark), and axe is clean in both themes.

🤖 Generated with [Claude Code](https://claude.com/claude-code)
