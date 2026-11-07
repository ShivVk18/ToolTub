# chore: remove the full-screen tool panel

Chat-native tools, step 6. Every tool now runs as a card in the thread (#87, #88), so the old full-screen panel goes, as the spec asks:

- `src/components/home/LiveToolPanel.tsx` deleted, including its "Chat" / "Back to chat" button and full-screen toggle.
- UI store: `panelTool`, `panelInput`, `isPanelFull`, `openPanel`, `closePanel` and `togglePanelFull` removed.
- CSS: the 18 panel-only rule blocks removed (`#panel`, `body.panel-open …`, `body.panel-full .col`, `.pn-head`, `.pn-t`, `.pn-body`, `#pnIn`, `#pnOut`, `#pnRx`, `#pnPat`, `#pnFl`, `#pnGen` and the panel's own media query). The classes the cards share (`.pn-box`, `.pn-lab`, `.segs`, `.seg`, `.mini`, `.pn-status`, `.pn-d`, `.pn-r`) stay.
- No route or layout hides the thread for a tool any more. `/slug` renders the chat (#87).
- The visual-compare hook keeps the name `__kk.openPanel` (it mirrors the reference's test API) and now opens a card.

`npm run verify` green.

🤖 Generated with [Claude Code](https://claude.com/claude-code)
