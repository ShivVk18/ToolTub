# fix(plan): Run produced a made-up result; 'password' on a PDF printed a password

**Severity: Critical** (wrong output). Found in Phase 4 (flow 5.6 Plan → Run → Results).

**Bugs.**
1. **Fake run.** `executePlan` animated the step bars, then posted one invented result: `<name>-klipkit.<ext>`, 42% of the input size, "−58%". Download only showed a "Saved ✓" toast; no file was made.
2. **Stuck busy.** `executePlan` set busy and then returned early when no file was loaded, leaving Send blocked.
3. **Pretend samples.** The PDF and JSON samples ("Q3-report.pdf · 24 pages · 12.4 MB", "api-response.json · 2.3 MB") had no bytes, and the sample photo's size was inflated to at least 2.1 MB.
4. **Wrong labels.** The plan card labelled "Protect" (and "Convert to PDF") as "Private server". Protect isn't built at all.
5. **Generator hijack.** With a PDF loaded, "protect it with a password" ran the password generator: `genParse` was checked before the file plan.
6. **Hand-over gap.** PDF to Word didn't accept a hand-over, so continuing there from another tool landed on an empty page.

**Fix.**
- **`lib/engines/plan.ts` (pure).** `planFor(step, file)` returns one of three things:
  - `run`: PDF compress and split; image compress, resize and convert to JPG/PNG/WebP; JSON format, minify and types.
  - `open`: PDF to Word (server) and Background Remover (device).
  - `soon`: everything else.
  `stepTag` derives the card label ("On device" / "Private server" / "Coming soon") from it, and `runDataStep` handles the JSON steps.
- **`lib/plan/run.ts`.** `runStep` calls the real workers; each step's output is the next step's input. The new `splitPdf` uses pdf-lib, with page ranges clamped and a clear error past the end.
- **Workspace.**
  - **Run:** runs only `run` steps, with one result row per step showing the real name, size, gain and note. Download saves the real blob. "Continue in PDF to Word / Background Remover" hands the file over.
  - **Gating and errors:** Run is disabled when every step is Coming soon. Errors say which step failed and why.
  - **Busy:** always released, in a `finally` block. A finished plan shows "Done ✓" and "Done · nothing left your device", as in the reference.
  - **Generators:** with a file loaded, words that describe a step for that file win over the generators.
- **Samples.** The PDF is a real 24-page PDF made with pdf-lib, loaded only when picked. The JSON is a real 400-user file. The photo shows its real size. Song and video stay descriptions, since none of their steps run yet; their steps show Coming soon.
- **PDF to Word.** Accepts a hand-over, shows the file chip, and offers Choose another file on errors.

**Tests first.** All failed before the fix and pass after:
- `tests/e2e/plan.spec.ts` (4):
  - compress + split pages 1-5 on a real PDF: the downloaded file has 5 pages (pdf-lib), the size shown equals the downloaded size, and the page is never left busy;
  - "protect it with a password" on a PDF shows a Coming soon plan with Run disabled, not a password;
  - Convert to Word continues on /pdf-to-word with the file;
  - the sample PDF's plan downloads a real 5-page PDF.
- `tests/unit/plan.test.ts` (6): capability table, JSON steps, `splitPdf` (range, clamping, past the end).

**Re-tested.**
- Unit: 225.
- Chromium: plan, redesign-ui, platform, tools and file-states (141).
- WebKit: plan (4).
- Visual compare: d, e and f at 1440 px are within 2% in both themes; state f improved from 3.5% to 1.3% (the reference also shows one row per step).

**Reference deviation.** The sample PDF card now shows its real size (about 30 KB, not 12.4 MB).

🤖 Generated with [Claude Code](https://claude.com/claude-code)
