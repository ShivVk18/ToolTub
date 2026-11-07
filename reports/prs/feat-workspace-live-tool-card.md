# feat: tools open as Live Tool Cards inside the chat (no tool pages, no full-screen panel)

Chat-native tools, steps 2, 4 and 5 (`refactor/registry-card-config` was step 1). This ports the latest reference's `openPanel`, `toolWidget`, `runW`, `setOpt`, `wLive` and `routeHash`.

**The thread is a store.**
- `src/lib/store/workspace.ts` holds the typed thread messages (`bot`, `user`, `file`, `paste`, `plan`, `results`, `resultCard`, `chips`, `continue`, `toolCard`).
- It also holds the cards (`{ toolId, input, option, pattern, flags, expanded }`), `activeCardId` and an `openRequest` that any component can raise.
- `Workspace` reads and writes the thread there instead of local state, so cards survive re-renders and several cards keep their own state.

**Live Tool Card** (`src/components/workspace/LiveToolCard.tsx`). It follows the reference's `.card.tw` structure:
- Header: icon tile, serif 24 px name, description with "● Live · on your device", option segments, and ⤢ Expand / ⤡ Collapse.
- Input: textarea with Sample/Clear; regex `/pattern/flags` fields; "↻ Again" for generator tools.
- Output: re-rendered on every keystroke with a flash, plus Copy.
- Status line: dot, summary and "x ms · nothing uploaded".
- ⌘Enter re-runs. Expand grows the card in place and widens the column to `min(1400px, 94vw)`; the thread and composer stay.
- It calls the same `CARDS[tool].run` engines the chat uses.

**File tools as cards** (`FileToolCard`). Merge PDF, Crop, Video to GIF and the rest render their own UI (dropzone, settings, run, results) inside a card in the thread. "Send to next tool" and the plan's "Continue in …" open the next tool as another card with the file handed over; nothing navigates.

**Every entry point opens a card in the thread:**
- ⌘K (on pages with the chat)
- Explore grid
- `#slug` deep links
- generator results ("Edit live here · Tool", with the same options, e.g. the UUID count)
- paste results
- suggestion chips
- QR from chat
- the plan's continue buttons

On the home page the URL only gains `#slug`.

**`/slug` routes.**
- `/json-formatter`, `/merge-pdf` and the rest render the same chat app with that tool's card already open. Long-tail presets travel in the card.
- The server-rendered SEO content follows below the chat: the one H1, summary, how-to, FAQ and JSON-LD. The hero's headline isn't a heading there.
- Live card tools without SEO content (Base64, Regex…) get URLs too, `noindex`.

**Paste into the card (`wLive`).** When the latest message is a card, a paste (in the composer or anywhere on the page) fills that card and shows "Pasted into JSON Formatter". A `/pattern/flags` paste fills the regex fields. A file pasted or dropped while a file-tool card is latest goes to that tool's dropzone. Otherwise a paste or drop starts a fresh context, as before.

**Removed from use:** the full-screen `LiveToolPanel`, `panel-open`/`panel-full` and "Back to chat". The code is deleted in `chore/remove-tool-panel`.

`npm run verify` green. The e2e suites that assumed the old panel and tool pages are rewritten in `test/e2e-chat-native-tools`.

🤖 Generated with [Claude Code](https://claude.com/claude-code)
