# perf: the QR code was painted only after JavaScript (mobile Lighthouse 86)

**Found by** the Phase 3 Lighthouse re-run. /qr-code-generator was the only page below the mobile ≥ 90 gate: 86, with LCP at 4.2 s.

**Root cause.** The largest paint on the page is the QR image. Its SVG was made in a `useEffect` (`QRCode.toString(...).then(setSvg)`), so it existed only after the lazy tool chunk downloaded and hydrated. The server HTML had just a grey placeholder.

**Fix.** The SVG is made during render with `useMemo`; qrcode's SVG renderer calls its callback synchronously (checked in Node). The default code is now in the server HTML. The 1024 px PNG, needed only for the download, is still made in an effect.

**Test first.** `tools.spec.ts › QR › the default code is in the server HTML` fetches the raw HTML with no JavaScript and expects `<img alt="Your QR code" src="data:image/svg+xml…">`. It failed before the fix and passes after. The other QR tests (7 in total, including PNG + SVG downloads and Wi-Fi) pass.

**Result.** Lighthouse mobile, 3 runs: perf 86 → 92, LCP 4.2 s → 3.3–3.4 s, the same as the site's other pages.

🤖 Generated with [Claude Code](https://claude.com/claude-code)
