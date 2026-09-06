import AxeBuilder from "@axe-core/playwright";
import { chromium } from "playwright";
import assert from "node:assert/strict";

const baseUrl = (process.env.STROKE_LAB_URL || "http://127.0.0.1:4173").replace(/\/$/, "");
const browser = await chromium.launch();
const context = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 1 });
const page = await context.newPage();
const errors = [];
const requestOrigins = new Set();
page.on("console", (message) => { if (message.type() === "error") errors.push(message.text()); });
page.on("pageerror", (error) => errors.push(error.message));
page.on("request", (request) => requestOrigins.add(new URL(request.url()).origin));

async function assertAccessible(currentPage) {
  const result = await new AxeBuilder({ page: currentPage }).analyze();
  const serious = result.violations.filter((item) => item.impact === "serious" || item.impact === "critical");
  assert.deepEqual(serious.map((item) => ({ id: item.id, impact: item.impact })), []);
}

await page.goto(baseUrl, { waitUntil: "networkidle" });
assert.equal(await page.title(), "Stroke Lab — diagnose browser drawing lag");
assert.equal(await page.locator("h1").count(), 1);
assert.equal(await page.locator("h1").innerText(), "FIND WHAT MAKES A DRAWN STROKE LAG");
assert.match(await page.locator(".lede").innerText(), /digital artists.*maintainers/i);
assert.equal(await page.getByRole("link", { name: "Try it with sample data" }).isVisible(), true);
assert.equal(await page.locator(".hero-facts li").count(), 3);
assert.equal(await page.locator("main").count(), 1);
assert.equal(await page.locator("img:not([alt])").count(), 0);
assert.equal(await page.locator('#export').isDisabled(), true);
assert.equal(await page.locator('link[rel="canonical"]').getAttribute("href"), "https://pen-latency-lab.sociobot.in/");
assert.equal(await page.locator('meta[property="og:image"]').getAttribute("content"), "https://pen-latency-lab.sociobot.in/social-card-v1.webp");
assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth), true);

await page.locator("#draw-pad").focus();
const focusedOutline = await page.locator("#draw-pad").evaluate((node) => getComputedStyle(node).outlineWidth);
assert.equal(Number.parseFloat(focusedOutline) >= 3, true);
await page.keyboard.press("ArrowRight");
await page.keyboard.press("Space");
await page.locator("#export:not([disabled])").waitFor();
assert.match(await page.locator("#verdict-code").innerText(), /1 STROKE/);

await page.locator("#smoothing").fill("0");
assert.equal(await page.locator("#smoothing-value").textContent(), "0 ms");
await page.locator("#smoothing").fill("40");
assert.equal(await page.locator("#smoothing-value").textContent(), "40 ms");

page.once("dialog", (dialog) => dialog.dismiss());
await page.getByRole("button", { name: "Clear test" }).click();
assert.match(await page.locator("#verdict-code").innerText(), /1 STROKE/);
page.once("dialog", (dialog) => dialog.accept());
await page.getByRole("button", { name: "Clear test" }).click();
assert.equal(await page.locator("#verdict-code").innerText(), "NO DATA");

await page.locator("#draw-pad").focus();
await page.keyboard.press("Enter");
await page.evaluate(() => Object.defineProperty(navigator, "clipboard", { configurable: true, value: { writeText: () => Promise.reject(new Error("blocked")) } }));
await page.getByRole("button", { name: "Copy summary" }).click();
await page.getByText("Clipboard access was blocked. Export JSON instead.").waitFor();

await page.emulateMedia({ reducedMotion: "reduce" });
const transition = await page.getByRole("button", { name: "Export JSON" }).evaluate((node) => getComputedStyle(node).transitionDuration);
assert.equal(Number.parseFloat(transition) <= .001, true);
await assertAccessible(page);

await page.goto(`${baseUrl}/demo`, { waitUntil: "networkidle" });
assert.equal(await page.title(), "Demo — Stroke Lab");
assert.equal(await page.locator("h1").count(), 1);
assert.equal(await page.getByText("Demo — sample data, nothing is saved").isVisible(), true);
assert.match(await page.locator("#verdict-code").innerText(), /SMOOTHING \/ 3 STROKES/);
await page.getByRole("button", { name: "Reset demo" }).click();
assert.match(await page.locator("#verdict-code").innerText(), /3 STROKES/);
await assertAccessible(page);

await page.setViewportSize({ width: 1366, height: 900 });
await page.goto(baseUrl, { waitUntil: "networkidle" });
await page.locator("#draw-pad").scrollIntoViewIfNeeded();
const desktopPad = await page.locator("#draw-pad").boundingBox();
assert.ok(desktopPad);
await page.mouse.move(desktopPad.x + 80, desktopPad.y + 100);
await page.mouse.down();
await page.mouse.move(desktopPad.x + 360, desktopPad.y + 200, { steps: 12 });
await page.mouse.up();
await page.locator("#export:not([disabled])").waitFor();

for (const [route, title] of [["/privacy/", "Privacy — Stroke Lab"], ["/terms/", "Terms — Stroke Lab"]]) {
  await page.goto(`${baseUrl}${route}`, { waitUntil: "networkidle" });
  assert.equal(await page.title(), title);
  assert.equal(await page.locator("h1").count(), 1);
  assert.equal(await page.locator("main").count(), 1);
  await assertAccessible(page);
}

const sitemap = await fetch(`${baseUrl}/sitemap.xml`);
assert.equal(sitemap.status, 200);
const sitemapText = await sitemap.text();
for (const route of ["/", "/demo", "/privacy/", "/terms/"]) assert.equal(sitemapText.includes(`pen-latency-lab.sociobot.in${route}`), true);

const offlineContext = await browser.newContext({ viewport: { width: 390, height: 844 }, serviceWorkers: "allow" });
const offlinePage = await offlineContext.newPage();
await offlinePage.goto(`${baseUrl}/demo`, { waitUntil: "networkidle" });
await offlinePage.evaluate(() => navigator.serviceWorker?.ready);
await offlinePage.reload({ waitUntil: "networkidle" });
await offlinePage.waitForFunction(() => navigator.serviceWorker.controller !== null);
await offlinePage.waitForFunction(async () => {
  const asset = document.querySelector('script[type="module"]')?.getAttribute("src");
  return Boolean(asset && await caches.match(asset));
});
await offlineContext.setOffline(true);
await offlinePage.reload({ waitUntil: "domcontentloaded" });
assert.match(await offlinePage.locator("#verdict-code").innerText(), /3 STROKES/);
await offlineContext.close();

if (baseUrl.startsWith("https://")) {
  const response = await fetch(baseUrl);
  assert.match(response.headers.get("content-security-policy") || "", /frame-ancestors 'none'/);
  assert.match(response.headers.get("permissions-policy") || "", /camera=\(\)/);
  const html = await response.text();
  const assetPath = html.match(/src="(\/assets\/main-[^"]+\.js)"/)?.[1];
  assert.ok(assetPath);
  const assetResponse = await fetch(`${baseUrl}${assetPath}`);
  assert.match(assetResponse.headers.get("cache-control") || "", /max-age=31536000.*immutable/);
  const missing = await fetch(`${baseUrl}/a-route-that-does-not-exist`, { redirect: "manual" });
  assert.equal(missing.status, 404);
  const missingHtml = await missing.text();
  assert.match(missingHtml, /<title>Page not found — Stroke Lab<\/title>/);
}

assert.deepEqual(errors, []);
assert.deepEqual([...requestOrigins], [new URL(baseUrl).origin]);

console.log(JSON.stringify({
  seriousAxeViolations: 0,
  consoleErrors: errors.length,
  thirdPartyRequests: 0,
  firstScreen: "passed",
  demoSandbox: "passed",
  keyboardAndPointer: "passed",
  boundariesAndRecovery: "passed",
  reducedMotion: "passed",
  offlineReload: "passed",
  legalAndDiscoveryRoutes: "passed",
  livePoliciesAnd404: baseUrl.startsWith("https://") ? "passed" : "checked after deploy",
}));
await context.close();
await browser.close();
