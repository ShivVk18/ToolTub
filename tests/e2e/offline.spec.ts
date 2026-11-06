import { test, expect } from "@playwright/test";
import { fx, output, primary, upload } from "./helpers";

test("PWA: after one visit, on-device tools work with the network off", async ({ page, context }) => {
  await page.goto("/json-formatter");
  await page.evaluate(() => navigator.serviceWorker.ready);
  await page
    .waitForFunction(() => !!navigator.serviceWorker.controller, null, { timeout: 15_000 })
    .catch(() => page.reload());
  await page.waitForFunction(() => !!navigator.serviceWorker.controller);
  await page.waitForTimeout(1500); // let the SW finish caching
  await context.setOffline(true);
  await page.reload();
  await page.getByRole("button", { name: "Try a sample" }).click();
  await expect(output(page)).toContainText("Valid JSON");
  await context.setOffline(false);
});

test("slow network (Slow 3G): progress text is shown and the HEIC conversion still completes", async ({
  page,
  context,
}) => {
  test.setTimeout(240_000);
  const cdp = await context.newCDPSession(page);
  await page.goto("/heic-to-jpg");
  await cdp.send("Network.emulateNetworkConditions", {
    offline: false,
    latency: 400,
    downloadThroughput: (500 * 1024) / 8,
    uploadThroughput: (500 * 1024) / 8,
  });
  await upload(page, fx("iphone.heic"));
  await primary(page).click();
  await expect(output(page)).toContainText(/Converting|Loading/);
  await expect(output(page)).toContainText("Converted 1 photo", { timeout: 200_000 });
});
