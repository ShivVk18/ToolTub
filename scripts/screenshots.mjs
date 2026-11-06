// Captures screenshots at the 4 design viewports in light and dark.
//   node scripts/screenshots.mjs <outDir> <baseUrl|file> [paths…]
// For the reference HTML pass the file path as baseUrl and no paths.
import { chromium } from "@playwright/test";
import { mkdirSync } from "node:fs";
import { resolve } from "node:path";

const [outDir, base, ...paths] = process.argv.slice(2);
const VIEWPORTS = [
  [1920, 1080],
  [1440, 900],
  [768, 1024],
  [390, 844],
];
const isFile = !/^https?:/.test(base);
const targets = isFile
  ? [["reference", "file://" + resolve(base)]]
  : (paths.length ? paths : ["/"]).map((p) => [
      p === "/" ? "home" : p.replace(/^\//, "").replace(/\//g, "_"),
      base + p,
    ]);
mkdirSync(outDir, { recursive: true });
const browser = await chromium.launch();
for (const [name, url] of targets) {
  for (const theme of ["light", "dark"]) {
    for (const [w, h] of VIEWPORTS) {
      const ctx = await browser.newContext({
        viewport: { width: w, height: h },
        deviceScaleFactor: 1,
        reducedMotion: "no-preference",
      });
      const page = await ctx.newPage();
      await page.addInitScript((t) => {
        try {
          localStorage.setItem("theme", t);
          localStorage.setItem("kk.theme", JSON.stringify(t));
        } catch {}
      }, theme);
      await page.goto(url, { waitUntil: "networkidle" });
      await page.waitForTimeout(2600); // let entrance animations settle
      await page.screenshot({ path: `${outDir}/${name}-${theme}-${w}x${h}.jpg`, type: "jpeg", quality: 72 });
      await ctx.close();
    }
  }
}
await browser.close();
console.log(`screenshots → ${outDir}`);
