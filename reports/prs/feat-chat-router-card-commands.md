# feat: chat router: talk to the active card, paste into it, "open <tool>"

Chat-native tools, step 3. A pure router (`src/lib/intent/chatRouter.ts`, unit-tested) decides what each composer message does, in the spec's order:

1. **Option command for the active card** (reference: `talkToWidget`).
   - Examples: "minify it" → Minify, "decode", "4 spaces", "give me 10", "3 paragraphs".
   - Labels longer than two characters match anywhere in the message; short ones ("1", "10") must be a whole word. Longest label first, so "Bold italic" beats "Bold" and "10" beats "1".
   - The user's bubble shows, the bot says "Done — switched to **Minify**.", and **the card moves to the bottom of the thread** next to the conversation.
   - This only happens when no file is loaded; with a file, words go to its plan.
2. **Content goes into the active card** when it's the latest message, with a "Pasted into JSON Formatter" toast. Generator cards (no input) are skipped.
3. **Paste detection:** other pasted or typed content starts the paste flow (the same path as a page paste).
4. **"open regex tester"** ("show me the JWT decoder tool", "use base64"): fuzzy search over the working tools opens the best match as a card.
5. **Generators, file intents, help:** as before. A step for the loaded file still beats a generator ("protect it with a password" on a PDF).

**Bug fixed: ⌘K showed 32 working tools as "Coming soon".** The search index counted a tool as available only if it had its own page. The card tools (Base64, UUID, Regex, Unit Converter…) were greyed out and couldn't be opened from the palette, even before this work. They're available now and open as cards.

Checked in a real browser: ⌘K → JSON Formatter → "minify it" switches to Minify and moves the card down; a JSON paste fills the card; "open regex tester" adds a second card. No console errors.

`npm run verify` green, with `chat-router.test.ts` (5 tests) added.

🤖 Generated with [Claude Code](https://claude.com/claude-code)
