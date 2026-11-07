# fix: per-platform resize sizes; AA contrast for the Explore "● Live" tag

Two open decisions from the Phase 4 report, decided by me as asked ("do whatever you want with your own knowledge").

- **Resize for a platform** now uses that platform's own size. Before, every platform got 1080 × 1350.
  - Instagram 1080 × 1350 (spec §4, unchanged)
  - YouTube 1280 × 720
  - LinkedIn 1200 × 627
  - TikTok 1080 × 1920
  - X/Twitter 1600 × 900
  - Names are spelled properly ("YouTube", not "Youtube").
  - The unit test that pinned YouTube to 1080 × 1350 recorded the old behaviour; it now expects 1280 × 720. A LinkedIn case was added.
- **"● Live" tag on Explore cards:** it used `--ok` (about 3.4:1 on white at 12 px). It now uses the AA green token `--g-c`, already used for category glyphs.

**Tried and not shipped:**
- **MP3 output.** `@mediabunny/mp3-encoder` (LAME) was added in a separate worker. Turbopack then split Mediabunny's circular imports into a shared chunk in the wrong order, and every media worker crashed ("Cannot access 'tc' before initialization"). This happened both as a dynamic import and as a separate worker. It's reverted; audio tools offer M4A/WAV/Opus. A future attempt needs the encoder built as a standalone file under `/vendor`.
- **API Tester CSP** and **deleting unused fonts / docs/QA-REPORT.md** were blocked by the session's safety checks. They need the owner to run them or to allow them.

🤖 Generated with [Claude Code](https://claude.com/claude-code)
