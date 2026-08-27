import AxeBuilder from "@axe-core/playwright";
import { chromium } from "playwright";
import assert from "node:assert/strict";

const baseUrl = process.env.STROKE_LAB_URL || "http://127.0.0.1:4173";
const browser = await chromium.launch();
const context = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 1 });
const page = await context.newPage();
const errors = [];
page.on("console", (message) => { if (message.type() === "error") errors.push(message.text()); });
page.on("pageerror", (error) => errors.push(error.message));

await page.goto(baseUrl, { waitUntil: "networkidle" });
assert.equal(await page.locator("h1").count(), 1);
assert.equal(await page.locator("main").count(), 1);
assert.equal(await page.locator("img:not([alt])").count(), 0);
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

await page.setViewportSize({ width: 1366, height: 900 });
await page.goto(`${baseUrl}/privacy/`, { waitUntil: "networkidle" });
assert.equal(await page.locator("h1").count(), 1);
await page.goto(`${baseUrl}/terms/`, { waitUntil: "networkidle" });
assert.equal(await page.locator("h1").count(), 1);

console.log(JSON.stringify({ seriousAxeViolations: serious.length, consoleErrors: errors.length, keyboardPath: "passed", legalRoutes: "passed" }));
await browser.close();
