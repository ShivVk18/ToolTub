/**
 * Visual compare: the reference prototype (design/reference/KlipKit_UI.html) vs the app, state by state.
 *
 *   node scripts/visual-compare.ts                       # all states × 5 viewports × 2 themes
 *   node scripts/visual-compare.ts --states a,h --vp 1920x1080 --theme light
 *   APP_URL=http://127.0.0.1:3000/ node scripts/visual-compare.ts   # use an already-running app
 *
 * Deterministic frames: both pages get a fake clock (page.clock.install) and time only moves through
 * page.clock.runFor(); after each state every CSS animation is paused at a fixed point. Both pages are
 * driven through the same window.__kk test hook. Output: reports/ui/{ref,app,diff,side}-<state>-<theme>-<vp>.png,
 * reports/ui/results.json and reports/ui/summary.md. Pass = ≤ 2% of unmasked pixels differ (pixelmatch).
 */
import { chromium, type Page } from "@playwright/test";
import pngjs from "pngjs";
import pixelmatch from "pixelmatch";
import { spawn, type ChildProcess } from "node:child_process";
import * as fs from "node:fs";
import * as path from "node:path";

const { PNG } = pngjs;
const OUT_DIR = path.resolve("reports/ui");
const REF_URL = "file://" + path.resolve("design/reference/KlipKit_UI.html");
const PORT = 3333;
const APP_URL = process.env.APP_URL || `http://127.0.0.1:${PORT}/`;
const PASS_PCT = 2;

type Theme = "light" | "dark";
type Vp = [number, number];
type StateHandler = (page: Page, vp: Vp) => Promise<void>;

const arg = (name: string) => {
  const i = process.argv.indexOf(`--${name}`);
  return i > 0 ? process.argv[i + 1] : undefined;
};

/** Advance the page's fake clock (rAF, timers, Date) by `ms`. */
const settle = (page: Page, ms: number) => page.clock.runFor(ms);
/** Call a window.__kk hook without awaiting it: its animations need the clock, which we drive from outside. */
const kk = (page: Page, fn: string, ...args: unknown[]) =>
  page.evaluate(
    ([f, a]) => {
      const hook = (window as unknown as { __kk?: Record<string, (...x: unknown[]) => unknown> }).__kk;
      void hook?.[f as string]?.(...(a as unknown[]));
    },
    [fn, args] as const,
  );

const STATES: Record<string, { desc: string; run: StateHandler }> = {
  a: { desc: "hero at rest", run: async (p) => settle(p, 400) },
  b: {
    desc: "cursor near the orb",
    run: async (p, [w]) => {
      const slot = await p.locator("#orbSlot").boundingBox();
      await p.mouse.move(w / 2 + 75, slot ? slot.y + slot.height / 2 - 40 : 330);
      await settle(p, 800);
    },
  },
  c: {
    desc: "file dragged over the page",
    run: async (p, [w]) => {
      await kk(p, "drag", true, w / 2, 350);
      await settle(p, 800);
    },
  },
  d: {
    desc: "workspace after the sample PDF",
    run: async (p, [w]) => {
      await kk(p, "ingestSample", "pdf", w / 2, 350);
      await settle(p, 3000);
    },
  },
  e: {
    desc: "typing a multi-step instruction",
    run: async (p, [w]) => {
      await kk(p, "ingestSample", "pdf", w / 2, 350);
      await settle(p, 3000);
      await p.locator("#cmp").fill("compress to under 2 mb and split pages 1-5");
      await settle(p, 600);
    },
  },
  f: {
    desc: "plan running and done",
    run: async (p, [w]) => {
      await kk(p, "ingestSample", "pdf", w / 2, 350);
      await settle(p, 3000);
      await p.locator("#cmp").fill("compress to under 2 mb and split pages 1-5");
      await p.locator("#cmp").press("Enter");
      await settle(p, 1500);
      await p
        .locator(".run")
        .first()
        .click({ timeout: 2000 })
        .catch(() => {});
      await settle(p, 5000);
    },
  },
  g: {
    desc: "pasted JSON flow",
    run: async (p) => {
      await kk(p, "pasteIn", '{"user":{"id":42,"roles":["admin"]},"active":true}');
      await settle(p, 3000);
    },
  },
  h: {
    desc: "live panel (JSON Formatter)",
    run: async (p) => {
      await kk(p, "openPanel", "JSON Formatter", '{"a":1,"b":[1,2]}');
      await settle(p, 1200);
    },
  },
  i: {
    desc: "⌘K palette",
    run: async (p) => {
      await kk(p, "openPal");
      await settle(p, 600);
    },
  },
  j: {
    desc: "Pro voice sheet",
    run: async (p) => {
      await p.locator("#nav .pill.ink, #gopro").first().click();
      await settle(p, 600);
    },
  },
  k: {
    desc: "scrolled 200 px (capsule nav)",
    run: async (p) => {
      await p.evaluate(() => window.scrollTo(0, 200));
      await settle(p, 900);
    },
  },
  l: { desc: "marquee band", run: async (p) => scrollTo(p, ".band") },
  m: { desc: "bento section", run: async (p) => scrollTo(p, "#feel", 1500) },
  n: {
    desc: "Explore grid + tab change",
    run: async (p) => {
      await scrollTo(p, "#explore");
      await clickText(p, "#tabs", "Developer");
      await settle(p, 900);
    },
  },
  o: {
    desc: "pricing (yearly)",
    run: async (p) => {
      await scrollTo(p, "#pricing");
      await clickText(p, "#billTabs", "Yearly");
      await settle(p, 900);
    },
  },
  p: {
    desc: "footer wordmark with the cursor over it",
    run: async (p, [w]) => {
      await scrollTo(p, "#giant");
      const g = await p.locator("#giant").boundingBox();
      await p.mouse.move(w / 2, g ? g.y + g.height / 2 : 400);
      await settle(p, 900);
    },
  },
};

/**
 * Click the first element under `scope` whose text contains `text`, with a DOM click so the page doesn't
 * scroll. (Playwright's click scrolls into view first; in the reference that jumped the page ~570 px.)
 */
const clickText = (p: Page, scope: string, text: string) =>
  p.evaluate(
    ([sc, t]) => {
      const el = Array.from(document.querySelectorAll<HTMLElement>(`${sc} *`)).find(
        (e) => e.children.length === 0 && e.textContent?.includes(t),
      );
      ((el?.closest("button, [role=tab], .tab") as HTMLElement | null) ?? el)?.click();
    },
    [scope, text] as const,
  );

async function scrollTo(p: Page, sel: string, ms = 900) {
  await p.evaluate((s) => {
    const el = document.querySelector(s);
    if (el) window.scrollTo(0, el.getBoundingClientRect().top + window.scrollY - 40);
  }, sel);
  await settle(p, ms);
}

async function preparePage(page: Page, url: string, theme: Theme) {
  await page.clock.install({ time: new Date("2026-11-04T10:07:00+05:30") });
  await page.addInitScript((t) => {
    try {
      localStorage.setItem("theme", t);
      localStorage.setItem("kk.theme", JSON.stringify(t));
    } catch {}
  }, theme);
  await page.goto(url, { waitUntil: "load" });
  await page.evaluate((t) => {
    document.documentElement.dataset.theme = t;
    document.documentElement.classList.toggle("dark", t === "dark");
    const s = document.createElement("style");
    // Carets and the film grain are noise, not design.
    s.textContent = "*{caret-color:transparent!important}.bcar{opacity:0!important}#grain{display:none!important}";
    document.head.appendChild(s);
  }, theme);
  await page.evaluate(() => document.fonts.ready);
  await settle(page, 2500); // entrance animations, squiggle, satellites measured
}

/** Pause every CSS animation: finite ones at their end state, infinite ones at t = 0. */
const freezeAnimations = (page: Page) =>
  page.evaluate(() => {
    for (const a of document.getAnimations()) {
      const timing = a.effect?.getComputedTiming();
      a.pause();
      a.currentTime = timing && Number.isFinite(timing.endTime as number) ? (timing.endTime as number) : 0;
    }
  });

/** Circles to ignore: the orb interior (animated gradient). */
const orbMask = (page: Page) =>
  page.evaluate(() => {
    const o = document.getElementById("orb")?.getBoundingClientRect();
    return o && o.width > 4 ? { x: o.left + o.width / 2, y: o.top + o.height / 2, r: o.width * 0.45 } : null;
  });

function compare(refBuf: Buffer, appBuf: Buffer, masks: ({ x: number; y: number; r: number } | null)[]) {
  const ref = PNG.sync.read(refBuf);
  const app = PNG.sync.read(appBuf);
  const w = Math.min(ref.width, app.width);
  const h = Math.min(ref.height, app.height);
  const crop = (img: InstanceType<typeof PNG>) => {
    const out = new PNG({ width: w, height: h });
    PNG.bitblt(img, out, 0, 0, w, h, 0, 0);
    return out;
  };
  const a = crop(ref);
  const b = crop(app);
  let masked = 0;
  for (const m of masks) {
    if (!m) continue;
    for (let y = Math.max(0, Math.floor(m.y - m.r)); y < Math.min(h, m.y + m.r); y++)
      for (let x = Math.max(0, Math.floor(m.x - m.r)); x < Math.min(w, m.x + m.r); x++)
        if ((x - m.x) ** 2 + (y - m.y) ** 2 <= m.r ** 2) {
          const i = (y * w + x) * 4;
          for (let k = 0; k < 4; k++) b.data[i + k] = a.data[i + k];
          masked++;
        }
  }
  const diff = new PNG({ width: w, height: h });
  const n = pixelmatch(a.data, b.data, diff.data, w, h, { threshold: 0.12, includeAA: false });
  const side = new PNG({ width: w * 3, height: h });
  PNG.bitblt(a, side, 0, 0, w, h, 0, 0);
  PNG.bitblt(crop(app), side, 0, 0, w, h, w, 0);
  PNG.bitblt(diff, side, 0, 0, w, h, w * 2, 0);
  return { pct: (100 * n) / (w * h - masked), diff: PNG.sync.write(diff), side: PNG.sync.write(side) };
}

async function ensureApp(): Promise<ChildProcess | null> {
  const up = await fetch(APP_URL).then(
    (r) => r.ok,
    () => false,
  );
  if (up) return null;
  if (process.env.APP_URL) throw new Error(`APP_URL ${APP_URL} is not reachable`);
  console.log(`Starting the production build on :${PORT} (run "npm run build" first if this fails)…`);
  const child = spawn(process.execPath, ["scripts/start-standalone.mjs"], {
    env: { ...process.env, PORT: String(PORT), HOSTNAME: "127.0.0.1" },
    stdio: "ignore",
  });
  for (let i = 0; i < 60; i++) {
    await new Promise((r) => setTimeout(r, 500));
    if (
      await fetch(APP_URL).then(
        (r) => r.ok,
        () => false,
      )
    )
      return child;
  }
  child.kill();
  throw new Error("App did not start");
}

async function main() {
  const pick = <T>(all: T[], key: string, f: (x: T) => string) => {
    const want = arg(key)?.split(",");
    return want ? all.filter((x) => want.includes(f(x))) : all;
  };
  const viewports = pick<Vp>(
    [
      [2560, 1440],
      [1920, 1080],
      [1440, 900],
      [768, 1024],
      [390, 844],
    ],
    "vp",
    ([w, h]) => `${w}x${h}`,
  );
  const themes = pick<Theme>(["light", "dark"], "theme", (t) => t);
  const states = pick(Object.entries(STATES), "states", ([k]) => k);

  fs.mkdirSync(OUT_DIR, { recursive: true });
  const server = await ensureApp();
  const browser = await chromium.launch();
  const results: {
    state: string;
    desc: string;
    theme: Theme;
    viewport: string;
    diffPercent: number;
    passed: boolean;
    error?: string;
  }[] = [];
  console.log(`Reference: ${REF_URL}\nApp:       ${APP_URL}`);

  try {
    for (const vp of viewports)
      for (const theme of themes) {
        const vpKey = `${vp[0]}x${vp[1]}`;
        console.log(`\n— ${vpKey} ${theme}`);
        for (const [key, { desc, run }] of states) {
          const pages: Page[] = [];
          try {
            const shots: Buffer[] = [];
            const masks = [];
            for (const url of [REF_URL, APP_URL]) {
              const ctx = await browser.newContext({ viewport: { width: vp[0], height: vp[1] }, colorScheme: theme });
              const page = await ctx.newPage();
              pages.push(page);
              await preparePage(page, url, theme);
              await run(page, vp);
              await freezeAnimations(page);
              masks.push(await orbMask(page));
              shots.push(await page.screenshot({ type: "png" }));
            }
            const { pct, diff, side } = compare(shots[0], shots[1], masks);
            const base = `${key}-${theme}-${vpKey}`;
            fs.writeFileSync(path.join(OUT_DIR, `ref-${base}.png`), shots[0]);
            fs.writeFileSync(path.join(OUT_DIR, `app-${base}.png`), shots[1]);
            fs.writeFileSync(path.join(OUT_DIR, `diff-${base}.png`), diff);
            fs.writeFileSync(path.join(OUT_DIR, `side-${base}.png`), side);
            const passed = pct <= PASS_PCT;
            results.push({ state: key, desc, theme, viewport: vpKey, diffPercent: +pct.toFixed(2), passed });
            console.log(`  ${passed ? "✓" : "✗"} ${key} ${desc}: ${pct.toFixed(2)}%`);
          } catch (err) {
            const message = (err as Error).message.split("\n")[0];
            results.push({ state: key, desc, theme, viewport: vpKey, diffPercent: 100, passed: false, error: message });
            console.log(`  ! ${key} ${desc}: ${message}`);
          } finally {
            for (const p of pages) await p.context().close();
          }
        }
      }
  } finally {
    await browser.close();
    server?.kill();
  }

  fs.writeFileSync(path.join(OUT_DIR, "results.json"), JSON.stringify(results, null, 2) + "\n");
  const passed = results.filter((r) => r.passed).length;
  const rows = results.map(
    (r) =>
      `| ${r.state} | ${r.desc} | ${r.viewport} | ${r.theme} | ${r.diffPercent.toFixed(2)}% | ${r.passed ? "✅" : "❌"}${r.error ? ` ${r.error}` : ""} |`,
  );
  fs.writeFileSync(
    path.join(OUT_DIR, "summary.md"),
    `# Visual compare\n\n${passed}/${results.length} states within ${PASS_PCT}%.\n\n| State | Description | Viewport | Theme | Diff | Pass |\n|---|---|---|---|---|---|\n${rows.join("\n")}\n`,
  );
  console.log(`\n${passed}/${results.length} within ${PASS_PCT}% → reports/ui/summary.md`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
