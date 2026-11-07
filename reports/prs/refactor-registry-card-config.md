# refactor: registry `panel` → `card` (CardConfig) for chat-native tools

Step 1 of the chat-native tools task (`docs/agent/04_CHAT_NATIVE_TOOLS.md`). Tools will run as Live Tool Cards in the chat instead of a full-screen panel, so the names change to match. No behaviour change.

- `src/lib/livePanels.ts` → `src/lib/toolCards.ts`.
  - `PANELS` → `CARDS`.
  - `PanelConfig` → `CardConfig`.
  - `PanelRunResult` → `CardRunResult`.
  - The configs are unchanged: options, sample, regex fields, generator mode and the `run` functions that call the pure engines.
- Registry: `PANEL_SLUGS` → `CARD_SLUGS`, and the `panel` flag on every tool → `card`. The registry stays the single source of truth for which tools are cards.
- `tests/unit/livePanels.test.ts` → `tests/unit/toolCards.test.ts`, with the same assertions.
- The latest reference (`design/reference/KlipKit_UI.html`, saved by the owner, with `toolWidget`, `runW`, `setOpt`, `talkToWidget` and `wLive`) is committed here as the source for the following steps.

`npm run verify` green (335 unit tests).

🤖 Generated with [Claude Code](https://claude.com/claude-code)
