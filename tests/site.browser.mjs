import AxeBuilder from "@axe-core/playwright";
import { chromium } from "playwright";
import assert from "node:assert/strict";

const baseUrl = process.env.STROKE_LAB_URL || "http://127.0.0.1:4173";
const browser = await chromium.launch();
const context = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 1 });
const page = await context.newPage();
const errors = [];
const requestOrigins = new Set();
page.on("console", (message) => { if (message.type() === "error") errors.push(message.text()); });
page.on("pageerror", (error) => errors.push(error.message));
page.on("request", (request) => requestOrigins.add(new URL(request.url()).origin));

await page.goto(baseUrl, { waitUntil: "networkidle" });
assert.equal(await page.locator("h1").count(), 1);
assert.equal(await page.locator("main").count(), 1);
assert.equal(await page.locator("img:not([alt])").count(), 0);
assert.equal(await page.locator("#export").isDisabled(), true);
await page.waitForFunction(() => navigator.serviceWorker?.ready);
await page.reload({ waitUntil: "networkidle" });
await page.waitForFunction(() => navigator.serviceWorker.controller !== null);
assert.equal(await page.evaluate(async () => {
  const asset = document.querySelector('script[type="module"]')?.getAttribute("src");
  return Boolean(asset && await caches.match(asset));
}), true);
await context.setOffline(true);
await page.reload({ waitUntil: "domcontentloaded" });
assert.equal(await page.locator("h1").count(), 1);
await context.setOffline(false);
errors.splice(0);
await page.reload({ waitUntil: "networkidle" });
assert.equal(await page.locator("#export").isDisabled(), true);

await page.locator("#draw-pad").focus();
await page.keyboard.press("Space");
await page.locator("#export:not([disabled])").waitFor();
assert.match(await page.locator("#verdict-code").innerText(), /1 STROKE/);

await page.locator("#include-geometry").check();
await page.locator("#include-pen").check();
assert.equal(await page.locator("#include-geometry").isChecked(), true);
assert.equal(await page.locator("#include-pen").isChecked(), true);

const accessibility = await new AxeBuilder({ page }).analyze();
const serious = accessibility.violations.filter((item) => item.impact === "serious" || item.impact === "critical");
if (serious.length) console.error(JSON.stringify(serious, null, 2));
assert.deepEqual(serious.map((item) => ({ id: item.id, impact: item.impact })), []);
assert.deepEqual(errors, []);
assert.deepEqual([...requestOrigins], [new URL(baseUrl).origin]);

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
await page.goto(`${baseUrl}/privacy/`, { waitUntil: "networkidle" });
assert.equal(await page.locator("h1").count(), 1);
await page.goto(`${baseUrl}/terms/`, { waitUntil: "networkidle" });
assert.equal(await page.locator("h1").count(), 1);

console.log(JSON.stringify({ seriousAxeViolations: serious.length, consoleErrors: errors.length, thirdPartyRequests: 0, keyboardPath: "passed", desktopPointerPath: "passed", offlineReload: "passed", legalRoutes: "passed" }));
await browser.close();
