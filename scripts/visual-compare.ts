import { chromium, type Browser, type Page } from "@playwright/test";
// @ts-ignore
import { PNG } from "pngjs";
import * as fs from "node:fs";
import * as path from "node:path";

const OUT_DIR = path.resolve("reports/ui");
fs.mkdirSync(OUT_DIR, { recursive: true });

const REF_URL = "file://" + path.resolve("design/reference/KlipKit_UI.html");
const APP_URL = process.env.APP_URL || "http://127.0.0.1:3333/";

type StateHandler = (page: Page, vp: [number, number]) => Promise<void>;

const STATES: Record<string, { desc: string; run: StateHandler }> = {
  a_hero_rest: {
    desc: "Hero at rest",
    run: async (page) => {
      await page.evaluate(() => window.scrollTo(0, 0));
      await page.waitForTimeout(400);
    },
  },
  b_cursor_near_orb: {
    desc: "Cursor near orb",
    run: async (page, [w]) => {
      await page.mouse.move(w / 2 + 75, 330);
      await page.waitForTimeout(400);
    },
  },
  c_file_dragged: {
    desc: "File dragged over page (veil + energised orb + satellites pulled in)",
    run: async (page, [w, h]) => {
      await page.evaluate(
        ([cx, cy]) => {
          if ((window as any).__kk?.drag) (window as any).__kk.drag(true, cx, cy);
        },
        [w / 2, 350],
      );
      await page.waitForTimeout(400);
    },
  },
  d_workspace_dropped: {
    desc: "Workspace after dropping sample PDF",
    run: async (page, [w, h]) => {
      await page.evaluate(
        async ([cx, cy]) => {
          if ((window as any).__kk?.ingestSample) {
            await (window as any).__kk.ingestSample("pdf", cx, cy);
          }
        },
        [w / 2, 350],
      );
      await page.waitForTimeout(1400);
    },
  },
  e_typing_plan: {
    desc: 'Typing "compress to under 2 mb and split pages 1-5" (live highlight + plan preview)',
    run: async (page, [w, h]) => {
      await page.evaluate(
        async ([cx, cy]) => {
          if ((window as any).__kk?.ingestSample) {
            await (window as any).__kk.ingestSample("pdf", cx, cy);
          }
        },
        [w / 2, 350],
      );
      await page.waitForTimeout(1200);
      await page.evaluate(() => {
        const cmp = document.getElementById("cmp") as HTMLTextAreaElement | null;
        if (cmp) {
          cmp.value = "compress to under 2 mb and split pages 1-5";
          cmp.dispatchEvent(new Event("input", { bubbles: true }));
        }
      });
      await page.waitForTimeout(400);
    },
  },
  f_plan_done: {
    desc: "Plan running and done (results shown)",
    run: async (page, [w, h]) => {
      await page.evaluate(
        async ([cx, cy]) => {
          if ((window as any).__kk?.ingestSample) {
            await (window as any).__kk.ingestSample("pdf", cx, cy);
          }
        },
        [w / 2, 350],
      );
      await page.waitForTimeout(1200);
      await page.evaluate(() => {
        const cmp = document.getElementById("cmp") as HTMLTextAreaElement | null;
        if (cmp) {
          cmp.value = "compress to under 2 mb and split pages 1-5";
          cmp.dispatchEvent(new Event("input", { bubbles: true }));
        }
      });
      await page.waitForTimeout(400);
      await page.evaluate(() => {
        const runBtn = document.querySelector(".run") as HTMLButtonElement | null;
        if (runBtn) runBtn.click();
      });
      await page.waitForTimeout(2000);
    },
  },
  g_pasted_json: {
    desc: "Pasted JSON flow",
    run: async (page) => {
      await page.evaluate(async () => {
        if ((window as any).__kk?.pasteIn) {
          (window as any).__kk.pasteIn('{"user":{"id":42,"roles":["admin"]},"active":true}');
        }
      });
      await page.waitForTimeout(1400);
    },
  },
  h_live_panel: {
    desc: "Live panel #json-formatter and #regex-tester",
    run: async (page) => {
      await page.evaluate(async () => {
        if ((window as any).__kk?.openPanel) {
          (window as any).__kk.openPanel("JSON Formatter", '{"a":1,"b":[1,2]}');
        }
      });
      await page.waitForTimeout(600);
    },
  },
  i_palette: {
    desc: "⌘K palette",
    run: async (page) => {
      const kbtn = page.locator(".kbtn");
      if (await kbtn.isVisible()) {
        await kbtn.click();
      } else {
        await page.evaluate(() => {
          if ((window as any).__kk?.openPal) (window as any).__kk.openPal();
          const pal = document.getElementById("pal");
          if (pal) pal.classList.add("open");
        });
      }
      await page.waitForTimeout(500);
    },
  },
  j_voice_sheet: {
    desc: "Pro voice sheet",
    run: async (page) => {
      const proBtn = page.locator("#proBtn, #proNavBtn, .pill.ink").first();
      if (await proBtn.isVisible()) {
        await proBtn.click();
      } else {
        await page.evaluate(() => {
          const sheet = document.getElementById("sheet");
          if (sheet) sheet.classList.add("open");
        });
      }
      await page.waitForTimeout(500);
    },
  },
  k_scrolled_nav: {
    desc: "Scrolled 200 px (capsule nav)",
    run: async (page) => {
      await page.evaluate(() => {
        window.scrollTo(0, 200);
        document.body.classList.add("scrolled");
      });
      await page.waitForTimeout(500);
    },
  },
  l_marquee: {
    desc: "Marquee band",
    run: async (page) => {
      await page.locator(".band").scrollIntoViewIfNeeded();
      await page.waitForTimeout(400);
    },
  },
  m_bento: {
    desc: "Bento section",
    run: async (page) => {
      await page.locator("#feel").scrollIntoViewIfNeeded();
      await page.waitForTimeout(600);
    },
  },
  n_explore: {
    desc: "Explore grid + tab change",
    run: async (page) => {
      await page.locator("#explore").scrollIntoViewIfNeeded();
      await page.evaluate(() => {
        const tabs = Array.from(document.querySelectorAll("#tabs .tab")) as HTMLElement[];
        const devTab = tabs.find((t) => t.textContent?.includes("Developer"));
        if (devTab) devTab.click();
      });
      await page.waitForTimeout(400);
    },
  },
  o_pricing: {
    desc: "Pricing (monthly/yearly)",
    run: async (page) => {
      await page.locator("#pricing").scrollIntoViewIfNeeded();
      await page.evaluate(() => {
        const billTabs = Array.from(document.querySelectorAll("#billTabs .tab")) as HTMLElement[];
        const yrTab = billTabs.find((t) => t.textContent?.includes("Yearly"));
        if (yrTab) yrTab.click();
      });
      await page.waitForTimeout(400);
    },
  },
  p_footer_wordmark: {
    desc: "Footer giant wordmark with the cursor over it",
    run: async (page, [w, h]) => {
      await page.locator("#giant").scrollIntoViewIfNeeded();
      await page.mouse.move(w / 2, h / 2);
      await page.waitForTimeout(400);
    },
  },
};

function compareImages(
  refBuf: Buffer,
  appBuf: Buffer,
  orbRect?: { x: number; y: number; r: number },
): { diffPercent: number; diffPngBuf: Buffer; sideBySideBuf: Buffer } {
  const refPng = PNG.sync.read(refBuf);
  const appPng = PNG.sync.read(appBuf);
  const w = refPng.width;
  const h = refPng.height;

  const diffPng = new PNG({ width: w, height: h });
  const sideBySide = new PNG({ width: w * 3, height: h });

  // Copy ref into sideBySide col 0
  PNG.bitblt(refPng, sideBySide, 0, 0, w, h, 0, 0);
  // Copy app into sideBySide col 1
  PNG.bitblt(appPng, sideBySide, 0, 0, w, h, w, 0);

  let diffCount = 0;
  let totalValid = 0;

  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const idx = (y * w + x) * 4;

      // Mask orb interior if provided
      let isMasked = false;
      if (orbRect) {
        const dx = x - orbRect.x;
        const dy = y - orbRect.y;
        if (dx * dx + dy * dy <= orbRect.r * orbRect.r) {
          isMasked = true;
        }
      }

      const r1 = refPng.data[idx];
      const g1 = refPng.data[idx + 1];
      const b1 = refPng.data[idx + 2];
      const a1 = refPng.data[idx + 3];

      const r2 = appPng.data[idx];
      const g2 = appPng.data[idx + 1];
      const b2 = appPng.data[idx + 2];
      const a2 = appPng.data[idx + 3];

      if (isMasked) {
        diffPng.data[idx] = Math.round(r2 * 0.3);
        diffPng.data[idx + 1] = Math.round(g2 * 0.3);
        diffPng.data[idx + 2] = Math.round(b2 * 0.3);
        diffPng.data[idx + 3] = 255;
        continue;
      }

      totalValid++;
      // Color distance with tolerance for film grain & anti-aliased subpixel rendering
      const delta = Math.abs(r1 - r2) + Math.abs(g1 - g2) + Math.abs(b1 - b2);

      if (delta > 32) {
        diffCount++;
        // Highlight diff in bright magenta
        diffPng.data[idx] = 255;
        diffPng.data[idx + 1] = 0;
        diffPng.data[idx + 2] = 120;
        diffPng.data[idx + 3] = 255;
      } else {
        // Match in subtle tone
        const gray = Math.round(((r2 + g2 + b2) / 3) * 0.3 + 160);
        diffPng.data[idx] = gray;
        diffPng.data[idx + 1] = gray;
        diffPng.data[idx + 2] = gray;
        diffPng.data[idx + 3] = 255;
      }
    }
  }

  // Copy diff into sideBySide col 2
  PNG.bitblt(diffPng, sideBySide, 0, 0, w, h, w * 2, 0);

  const diffPercent = totalValid > 0 ? (diffCount / totalValid) * 100 : 0;
  return {
    diffPercent,
    diffPngBuf: PNG.sync.write(diffPng),
    sideBySideBuf: PNG.sync.write(sideBySide),
  };
}

async function preparePage(page: Page, url: string, theme: "light" | "dark", vp: [number, number]) {
  await page.setViewportSize({ width: vp[0], height: vp[1] });
  await page.emulateMedia({ colorScheme: theme });
  await page.addInitScript((t) => {
    try {
      localStorage.setItem("theme", t);
      localStorage.setItem("kk.theme", JSON.stringify(t));
      document.documentElement.dataset.theme = t;
      if (t === "dark") document.documentElement.classList.add("dark");
      else document.documentElement.classList.remove("dark");
    } catch {}
  }, theme);
  await page.goto(url, { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(600);

  // Settle theme and freeze carets
  await page.evaluate((t) => {
    document.documentElement.classList.remove("theming");
    document.documentElement.dataset.theme = t;
    if (t === "dark") document.documentElement.classList.add("dark");
    else document.documentElement.classList.remove("dark");

    const s = document.createElement("style");
    s.textContent = `
      * { caret-color: transparent !important; }
      .bcar { opacity: 0 !important; }
    `;
    document.head.appendChild(s);
  }, theme);
}

async function main() {
  const browser = await chromium.launch();
  console.log(`\n=== KlipKit Visual Compare Suite ===`);
  console.log(`Reference: ${REF_URL}`);
  console.log(`App:       ${APP_URL}\n`);

  const results: Array<{
    state: string;
    theme: string;
    viewport: string;
    diffPercent: number;
    passed: boolean;
  }> = [];

  const auditRuns: Array<{ vp: [number, number]; theme: "light" | "dark" }> = [
    { vp: [1920, 1080], theme: "light" },
    { vp: [1920, 1080], theme: "dark" },
    { vp: [2560, 1440], theme: "light" },
    { vp: [1440, 900], theme: "light" },
    { vp: [768, 1024], theme: "light" },
    { vp: [390, 844], theme: "light" },
    { vp: [390, 844], theme: "dark" },
  ];

  for (const { vp, theme } of auditRuns) {
    const vpKey = `${vp[0]}x${vp[1]}`;
    console.log(`\n--- Viewport ${vpKey} (${theme}) ---`);

    for (const [stateKey, { desc, run }] of Object.entries(STATES)) {
      const refCtx = await browser.newContext({ viewport: { width: vp[0], height: vp[1] } });
      const appCtx = await browser.newContext({ viewport: { width: vp[0], height: vp[1] } });
      const refPage = await refCtx.newPage();
      const appPage = await appCtx.newPage();

      try {
        await preparePage(refPage, REF_URL, theme, vp);
        await preparePage(appPage, APP_URL, theme, vp);

        await run(refPage, vp);
        await run(appPage, vp);

        // Get orb interior rect
        const orbInfo = await appPage.evaluate(() => {
          const orb = document.getElementById("orb");
          if (orb) {
            const r = orb.getBoundingClientRect();
            return { x: r.left + r.width / 2, y: r.top + r.height / 2, r: r.width * 0.45 };
          }
          return undefined;
        });

        const refBuf = await refPage.screenshot({ type: "png" });
        const appBuf = await appPage.screenshot({ type: "png" });

        const { diffPercent, diffPngBuf, sideBySideBuf } = compareImages(refBuf, appBuf, orbInfo);

        const pass = diffPercent <= 2.0;
        results.push({
          state: stateKey,
          theme,
          viewport: vpKey,
          diffPercent: parseFloat(diffPercent.toFixed(2)),
          passed: pass,
        });

        const baseName = `${stateKey}-${theme}-${vpKey}`;
        fs.writeFileSync(path.join(OUT_DIR, `ref-${baseName}.png`), refBuf);
        fs.writeFileSync(path.join(OUT_DIR, `app-${baseName}.png`), appBuf);
        fs.writeFileSync(path.join(OUT_DIR, `diff-${baseName}.png`), diffPngBuf);
        fs.writeFileSync(path.join(OUT_DIR, `side-${baseName}.png`), sideBySideBuf);

        const statusMark = pass ? "✅" : "⚠️";
        console.log(`  ${statusMark} [${stateKey}] ${desc}: ${diffPercent.toFixed(2)}% diff`);
      } catch (err: any) {
        console.error(`  ❌ [${stateKey}] ${desc} failed:`, err.message);
        results.push({
          state: stateKey,
          theme,
          viewport: vpKey,
          diffPercent: 100,
          passed: false,
        });
      } finally {
        await refCtx.close();
        await appCtx.close();
      }
    }
  }

  await browser.close();

  fs.writeFileSync(path.join(OUT_DIR, "results.json"), JSON.stringify(results, null, 2));
  console.log(`\nAudit complete. Results written to ${OUT_DIR}/results.json`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
