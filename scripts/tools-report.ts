/**
 * Builds the Phase 4 tools report data from real test output — no hand-typed pass marks.
 *
 *   npx playwright test …            # writes test-results/results.json (+ test-results/perf.json)
 *   npx jiti scripts/tools-report.ts [results.json] [perf.json]
 *                                     # → reports/tools-e2e-results.json, reports/tools-e2e-report.html
 *
 * Status per tool comes from the Playwright JSON results; timings from perf.json. Entry-point evidence
 * is a short map of which test proves each entry point (it can't be derived automatically).
 */
import * as fs from "node:fs";
import { catalog } from "../src/registry/catalog";

type PwResult = { status: string; duration: number; projectName?: string };
type PwTest = { projectName: string; results: PwResult[]; status: string };
type PwSpec = { title: string; file: string; tests: PwTest[] };
type PwSuite = { title: string; file?: string; specs?: PwSpec[]; suites?: PwSuite[] };

const res = JSON.parse(fs.readFileSync(process.argv[2] ?? "test-results/results.json", "utf8")) as {
  suites: PwSuite[];
  stats: Record<string, number>;
};
const perfPath = process.argv[3] ?? "test-results/perf.json";
const perf: Record<string, number> = fs.existsSync(perfPath) ? JSON.parse(fs.readFileSync(perfPath, "utf8")) : {};

// Flatten every test with its full title path.
type Row = { path: string; file: string; project: string; status: string; ms: number };
const rows: Row[] = [];
const walk = (s: PwSuite, trail: string[]) => {
  for (const spec of s.specs ?? [])
    for (const t of spec.tests) {
      const last = t.results.at(-1);
      rows.push({
        path: [...trail, spec.title].join(" › "),
        file: spec.file,
        project: t.projectName,
        status:
          t.status === "skipped"
            ? "skipped"
            : last?.status === "passed"
              ? t.status === "flaky"
                ? "flaky"
                : "passed"
              : "failed",
        ms: last?.duration ?? 0,
      });
    }
  for (const c of s.suites ?? []) walk(c, [...trail, c.title]);
};
for (const s of res.suites) walk(s, [s.title]);

const live = catalog.filter((t) => t.status !== "planned" || t.card);
const soon = catalog.filter((t) => t.status === "planned" && !t.card);

/** Which tests prove each entry point (route/⌘K/Explore/chat/paste). "—" = no test (not claimed). */
const ENTRY: Record<string, Partial<Record<"route" | "palette" | "explore" | "chat" | "paste", string>>> = {
  "compress-pdf": { route: "tools universal", palette: "search: shrink", explore: "redesign A1/F5", chat: "plan.spec" },
  "pdf-to-word": { route: "tools universal", palette: "search: pdf to docx", chat: "plan.spec continue" },
  "image-compressor": { route: "tools universal", palette: "search: reduce image size", chat: "plan.spec §4" },
  "image-resizer": { route: "tools universal", chat: "plan.spec §4 resize" },
  "image-converter": { route: "tools universal" },
  "heic-to-jpg": { route: "tools universal", palette: "platform ⌘K + search: iphone" },
  "background-remover": { route: "tools universal", palette: "search: bg", chat: "plan.spec (continue)" },
  "json-formatter": {
    route: "tools universal + live-panels",
    palette: "search: jsno formater",
    explore: "redesign live panel",
    paste: "flows 5.4",
  },
  "jwt-decoder": { route: "tools universal + live-panels", palette: "platform ⌘K", paste: "flows 5.4" },
  "qr-code-generator": { route: "tools universal", palette: "search: wifi qr", chat: "flows 5.3" },
  "uuid-generator": { route: "live-panels", chat: "flows 5.3" },
  "password-generator": { route: "live-panels", chat: "flows 5.3" },
  "lorem-ipsum": { route: "live-panels", chat: "flows 5.3" },
  "hash-generator": { route: "live-panels", chat: "flows 5.3" },
  base64: { route: "live-panels + redesign #base64", chat: "flows 5.3" },
  "timestamp-converter": { route: "live-panels", chat: "flows 5.3" },
};

const match = (t: (typeof catalog)[number]) => {
  const keys = [t.slug, t.name, t.home?.name].filter(Boolean).map((k) => k!.toLowerCase());
  return rows.filter((r) => keys.some((k) => r.path.toLowerCase().includes(k)));
};
const summarise = (rs: Row[]) => ({
  passed: rs.filter((r) => r.status === "passed").length,
  flaky: rs.filter((r) => r.status === "flaky").length,
  failed: rs.filter((r) => r.status === "failed").length,
  skipped: rs.filter((r) => r.status === "skipped").length,
});
const has = (rs: Row[], re: RegExp) => {
  const m = rs.filter((r) => re.test(r.path));
  if (!m.length) return "—";
  const s = summarise(m);
  return s.failed ? `✗ ${s.failed} failed` : `✓ ${s.passed + s.flaky}`;
};

const tools = live.map((t) => {
  const rs = match(t);
  const s = summarise(rs);
  const e = ENTRY[t.slug] ?? (t.card ? { route: "live-panels" } : {});
  return {
    slug: t.slug,
    name: t.home?.name ?? t.name,
    category: t.category,
    kind: t.status !== "planned" ? (t.processing.where === "own-server" ? "page · server" : "page") : "live panel",
    entryPoints: e,
    entryCount: Object.keys(e).length,
    tests: s,
    output: has(
      rs,
      /(compress|resiz|convert|decod|format|valid|download|output|png|qr|hash|uuid|base64|live panel|§4|expired|invalid|docx|heic|background|transparen|split)/i,
    ),
    privacy: has(rs, /(no upload|nothing uploaded|privacy|third-party|loads cleanly|live panel)/i),
    a11y: has(rs, /accessible|axe/i),
    mobile: rs.some((r) => r.project.startsWith("mobile"))
      ? has(
          rs.filter((r) => r.project.startsWith("mobile")),
          /./,
        )
      : "—",
    dark: has(rs, /light and dark|dark/i),
    medianMs: perf[t.slug] ?? null,
    status: s.failed ? "fail" : s.passed + s.flaky > 0 ? "pass" : "untested",
  };
});

const byProject = Object.fromEntries(
  [...new Set(rows.map((r) => r.project))].map((p) => [p, summarise(rows.filter((r) => r.project === p))]),
);
const out = {
  generated: new Date().toISOString(),
  totals: {
    toolsInRegistry: catalog.length,
    live: live.length,
    comingSoon: soon.length,
    toolsPassing: tools.filter((t) => t.status === "pass").length,
    toolsFailing: tools.filter((t) => t.status === "fail").length,
    tests: summarise(rows),
  },
  byProject,
  tools,
  comingSoon: soon.map((t) => ({ slug: t.slug, name: t.home?.name ?? t.name, category: t.category })),
  failures: rows.filter((r) => r.status === "failed").map((r) => ({ test: r.path, project: r.project })),
  flaky: rows.filter((r) => r.status === "flaky").map((r) => ({ test: r.path, project: r.project })),
};
fs.writeFileSync("reports/tools-e2e-results.json", JSON.stringify(out, null, 2) + "\n");

// ---- HTML: one self-contained page in the KlipKit look (tokens inline, no external resources) ----
const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]!);
const pill = (st: string) =>
  `<span class="pill ${st}">${st === "pass" ? "Pass" : st === "fail" ? "Fail" : "Untested"}</span>`;
const t = out.totals;

// ---- The narrative (flows, bugs, open items, privacy, performance, how to re-run) comes from the markdown
// report, sections 3 onward, converted with a tiny converter (headings, tables, lists, paragraphs, inline
// bold/code/links): the HTML is the same report, not a second copy to keep in sync. ----
const inline = (s: string) =>
  esc(s)
    .replace(/`([^`]+)`/g, "<code>$1</code>")
    .replace(/\*\*([^*]+)\*\*/g, "<b>$1</b>")
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, (_m, t, u) => `<a href="${u.replace(/^reports\//, "")}">${t}</a>`);
const cells = (l: string) =>
  l
    .trim()
    .replace(/^\||\|$/g, "")
    .split(/(?<!\\)\|/)
    .map((c) => inline(c.trim().replace(/\\\|/g, "|")));
function mdToHtml(md: string) {
  const out: string[] = [];
  const lines = md.split("\n");
  for (let i = 0; i < lines.length; i++) {
    const l = lines[i];
    if (/^##+ /.test(l)) out.push(`<h2>${inline(l.replace(/^#+ /, ""))}</h2>`);
    else if (l.startsWith("|")) {
      const rows: string[] = [];
      while (i < lines.length && lines[i].startsWith("|")) rows.push(lines[i++]);
      i--;
      const [head, , ...body] = rows;
      const pills = (c: string) => c.replace(/^✅ Pass$/, '<span class="pill pass">Pass</span>');
      out.push(
        `<table class="md"><thead><tr>${cells(head)
          .map((c) => `<th>${c}</th>`)
          .join("")}</tr></thead><tbody>${body
          .map(
            (r) =>
              `<tr>${cells(r)
                .map((c) => `<td>${pills(c)}</td>`)
                .join("")}</tr>`,
          )
          .join("")}</tbody></table>`,
      );
    } else if (/^(- |\d+\. )/.test(l)) {
      const ordered = /^\d/.test(l);
      const items: string[] = [];
      while (i < lines.length && /^(- |\d+\. )/.test(lines[i])) items.push(lines[i++].replace(/^(- |\d+\. )/, ""));
      i--;
      const tag = ordered ? "ol" : "ul";
      out.push(`<${tag}>${items.map((x) => `<li>${inline(x)}</li>`).join("")}</${tag}>`);
    } else if (l.trim() && l.trim() !== "---") out.push(`<p>${inline(l)}</p>`);
  }
  return out.join("\n");
}
const mdPath = "reports/tools-e2e-report.md";
const md = fs.existsSync(mdPath) ? fs.readFileSync(mdPath, "utf8") : "";
const narrative = md.includes("## 3.") ? mdToHtml(md.slice(md.indexOf("## 3."))) : "";

const html = `<!DOCTYPE html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>KlipKit — tools end-to-end report</title>
<style>
:root{--bg:#f3f0e8;--solid:#fff;--soft:#faf8f3;--ink:#17161b;--ink2:#55524c;--line:rgba(23,22,27,.08);--accent:#6d5df5;--ok:#18774b;--okSoft:rgba(31,157,99,.12);--bad:#b42318;--badSoft:rgba(229,72,77,.12)}
*{box-sizing:border-box}body{margin:0;font:15px/1.5 system-ui,-apple-system,"Segoe UI",sans-serif;background:var(--bg);color:var(--ink)}
main{max-width:1200px;margin:0 auto;padding:48px 24px}h1{font:500 44px/1.1 Georgia,serif;letter-spacing:-.02em;margin:0}
.sub{color:var(--ink2);margin:8px 0 28px}.cards{display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:14px;margin-bottom:32px}
.card{background:var(--solid);border:1px solid var(--line);border-radius:20px;padding:18px}.card b{display:block;font:500 34px Georgia,serif}.card span{color:var(--ink2);font-size:13px}
h2{font:500 26px Georgia,serif;margin:36px 0 12px}input{width:100%;max-width:360px;height:44px;border-radius:999px;border:1px solid var(--line);padding:0 18px;font:inherit;background:var(--solid);margin-bottom:14px}
table{width:100%;border-collapse:collapse;background:var(--solid);border:1px solid var(--line);border-radius:20px;overflow:hidden;font-size:14px}
th,td{text-align:left;padding:10px 12px;border-bottom:1px solid var(--line);vertical-align:top}th{background:var(--soft);font-weight:600}
.pill{display:inline-block;padding:2px 10px;border-radius:999px;font-weight:600;font-size:12px}.pill.pass{color:var(--ok);background:var(--okSoft)}.pill.fail{color:var(--bad);background:var(--badSoft)}.pill.untested{color:var(--ink2);background:var(--soft)}
code{font:12px ui-monospace,Menlo,monospace}table.md{margin:8px 0 20px}p,li{max-width:80ch}a{color:var(--accent)}
</style></head><body><main>
<h1>Tools end-to-end report</h1><p class="sub">Generated ${esc(out.generated)} from Playwright results and panel timings · see reports/tools-e2e-report.md for the narrative, bug table and how to re-run.</p>
<div class="cards">
<div class="card"><b>${t.live}</b><span>live tools (of ${t.toolsInRegistry})</span></div>
<div class="card"><b>${t.toolsPassing}</b><span>live tools passing</span></div>
<div class="card"><b>${t.toolsFailing}</b><span>live tools failing</span></div>
<div class="card"><b>${t.tests.passed + t.tests.flaky}</b><span>e2e tests passed (${t.tests.flaky} flaky)</span></div>
<div class="card"><b>${t.tests.failed}</b><span>e2e tests failed</span></div>
<div class="card"><b>${t.comingSoon}</b><span>Coming soon (not built)</span></div>
</div>
<h2>Tool matrix</h2><input id="q" placeholder="Filter tools…" aria-label="Filter tools">
<table id="m"><thead><tr><th>Tool</th><th>Type</th><th>Entry points</th><th>Output verified</th><th>Privacy</th><th>a11y</th><th>Mobile</th><th>Dark</th><th>Median ms</th><th>Status</th></tr></thead><tbody>
${tools
  .map(
    (x) =>
      `<tr><td><b>${esc(x.name)}</b><br><code>${x.slug}</code></td><td>${x.kind}</td><td>${x.entryCount}/5 ${Object.entries(
        x.entryPoints,
      )
        .map(([k, v]) => `<br><small>${k}: ${esc(v!)}</small>`)
        .join(
          "",
        )}</td><td>${x.output}</td><td>${x.privacy}</td><td>${x.a11y}</td><td>${x.mobile}</td><td>${x.dark}</td><td>${x.medianMs ?? "—"}</td><td>${pill(x.status)}</td></tr>`,
  )
  .join("\n")}
</tbody></table>
<h2>Tests by project</h2><table><thead><tr><th>Project</th><th>Passed</th><th>Flaky</th><th>Failed</th><th>Skipped</th></tr></thead><tbody>
${Object.entries(byProject)
  .map(
    ([p, s]) =>
      `<tr><td>${p}</td><td>${s.passed}</td><td>${s.flaky}</td><td>${s.failed}</td><td>${s.skipped}</td></tr>`,
  )
  .join("")}
</tbody></table>
<h2>Coming soon (${soon.length})</h2><p>${out.comingSoon.map((c) => esc(c.name)).join(" · ")}</p>
${narrative}
${out.failures.length ? `<h2>Failures</h2><ul>${out.failures.map((f) => `<li>[${f.project}] ${esc(f.test)}</li>`).join("")}</ul>` : ""}
<script>document.getElementById("q").addEventListener("input",e=>{const q=e.target.value.toLowerCase();for(const r of document.querySelectorAll("#m tbody tr"))r.style.display=r.textContent.toLowerCase().includes(q)?"":"none"})</script>
</main></body></html>
`;
fs.writeFileSync("reports/tools-e2e-report.html", html);
console.log(
  JSON.stringify({ totals: out.totals, byProject, failures: out.failures.length, flaky: out.flaky.length }, null, 2),
);
