import { expect, test, type Page } from "@playwright/test";
import { execFileSync } from "node:child_process";
import { mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { analyzeSession, createStrokeProbe } from "../dist/index.js";

const sampleSummary = {
  id: 1,
  pointerType: "pen",
  durationMs: 160,
  sampleCount: 20,
  eventCount: 20,
  coalescedSampleCount: 0,
  sampleRateHz: 120,
  medianSampleIntervalMs: 8,
  p95SampleIntervalMs: 9,
  intervalJitterMs: 1,
  p95RenderDelayMs: 8,
  smoothingWindowMs: 0,
};

async function downloadedBundle(page: Page): Promise<Record<string, any>> {
  const pending = page.waitForEvent("download");
  await page.getByRole("button", { name: "Export JSON" }).click();
  const download = await pending;
  expect(download.suggestedFilename()).toMatch(/^stroke-lab-\d{4}-\d{2}-\d{2}\.json$/);
  const file = await download.path();
  expect(file).toBeTruthy();
  return JSON.parse(readFileSync(file as string, "utf8"));
}

function withPackedConsumer(run: (directory: string) => void): void {
  const root = process.cwd();
  const temporary = mkdtempSync(path.join(tmpdir(), "stroke-lab-claim-"));
  const consumer = path.join(temporary, "consumer");
  mkdirSync(consumer);
  try {
    const packed = JSON.parse(execFileSync("npm", ["pack", "--json", "--pack-destination", temporary], { cwd: root, encoding: "utf8" }));
    const tarball = path.join(temporary, packed[0].filename);
    execFileSync("npm", ["init", "-y"], { cwd: consumer, stdio: "ignore" });
    execFileSync("npm", ["install", "--offline", "--ignore-scripts", "--no-audit", "--no-fund", tarball], { cwd: consumer, stdio: "ignore" });
    run(consumer);
  } finally {
    rmSync(temporary, { recursive: true, force: true });
  }
}

test("@claim:cause-classification separates the four measured causes", () => {
  expect(analyzeSession([{ ...sampleSummary, smoothingWindowMs: 24 }]).primary).toBe("smoothing");
  expect(analyzeSession([{ ...sampleSummary, sampleRateHz: 28, p95SampleIntervalMs: 40 }]).primary).toBe("input");
  expect(analyzeSession([{ ...sampleSummary, p95RenderDelayMs: 48 }]).primary).toBe("render");
  expect(analyzeSession([sampleSummary], [{ label: "undo", durationMs: 140, measuredAt: 1 }]).primary).toBe("history");
});

test("@claim:json-bundle-download downloads a usable JSON report", async ({ page }) => {
  await page.goto("/demo");
  const bundle = await downloadedBundle(page);
  expect(bundle.schemaVersion).toBe("1.0");
  expect(bundle.issue.title).toBe("Dotted marks after fast pen lifts");
  expect(bundle.strokes).toHaveLength(3);
  expect(bundle.diagnosis.primary).toBe("smoothing");
});

test("@claim:local-only completes the demo without uploads, accounts, cookies, or browser storage", async ({ page, context }) => {
  const origins = new Set<string>();
  page.on("request", (request) => origins.add(new URL(request.url()).origin));
  await page.goto("/demo");
  await page.getByRole("button", { name: "Reset demo" }).click();
  await downloadedBundle(page);
  expect([...origins]).toEqual(["http://127.0.0.1:4173"]);
  expect(await context.cookies()).toEqual([]);
  expect(await page.evaluate(() => ({ local: Object.keys(localStorage), session: Object.keys(sessionStorage) }))).toEqual({ local: [], session: [] });
  await expect(page.locator('input[type="password"]')).toHaveCount(0);
});

test("@claim:default-private-export omits drawing and pen samples by default", async ({ page }) => {
  await page.goto("/demo");
  const bundle = await downloadedBundle(page);
  expect(bundle.privacy).toEqual({ geometryIncluded: false, penDetailsIncluded: false, localOnly: true });
  for (const stroke of bundle.strokes) expect(stroke.samples).toBeUndefined();
  expect(JSON.stringify(bundle)).not.toMatch(/"(?:x|y|pressure|tiltX|tiltY|twist)"\s*:/);
});

test("@claim:bundle-fields includes aggregate timing, capabilities, findings, and notes", async ({ page }) => {
  await page.goto("/demo");
  const bundle = await downloadedBundle(page);
  expect(bundle.environment).toEqual(expect.objectContaining({ pointerEvents: expect.any(Boolean), coalescedEvents: expect.any(Boolean), timestampPrecision: expect.any(String) }));
  expect(bundle.strokes[0]).toEqual(expect.objectContaining({ sampleRateHz: expect.any(Number), p95SampleIntervalMs: expect.any(Number), p95RenderDelayMs: expect.any(Number), smoothingWindowMs: 24 }));
  expect(bundle.diagnosis.findings.map((finding: any) => finding.category)).toEqual(["input", "smoothing", "render", "history"]);
  expect(bundle.issue.notes).toContain("line follows the pen");
});

test("@claim:offline-reload reloads the populated demo without a network", async ({ browser }) => {
  const context = await browser.newContext({ serviceWorkers: "allow" });
  const page = await context.newPage();
  try {
    await page.goto("http://127.0.0.1:4173/demo", { waitUntil: "networkidle" });
    await page.evaluate(() => navigator.serviceWorker.ready);
    await page.reload({ waitUntil: "networkidle" });
    await page.waitForFunction(() => navigator.serviceWorker.controller !== null);
    await page.waitForFunction(async () => {
      const asset = document.querySelector<HTMLScriptElement>('script[type="module"]')?.src;
      return Boolean(asset && await caches.match(asset));
    });
    await context.setOffline(true);
    await page.reload({ waitUntil: "domcontentloaded" });
    await expect(page.getByText("Demo — sample data, nothing is saved")).toBeVisible();
    await expect(page.locator("#verdict-code")).toContainText("3 STROKES");
  } finally {
    await context.close();
  }
});

test("@claim:zero-runtime-dependencies installs and runs offline without transitive packages", () => {
  withPackedConsumer((consumer) => {
    const tree = JSON.parse(execFileSync("npm", ["ls", "--omit=dev", "--all", "--json"], { cwd: consumer, encoding: "utf8" }));
    expect(Object.keys(tree.dependencies)).toEqual(["pen-latency-lab"]);
    expect(tree.dependencies["pen-latency-lab"].dependencies ?? {}).toEqual({});
    writeFileSync(path.join(consumer, "run.mjs"), 'import { createStrokeProbe } from "pen-latency-lab"; const p=createStrokeProbe(new EventTarget()); p.recordStroke([{time:0},{time:8}]); console.log(p.getReport().strokes.length);');
    const output = execFileSync("node", ["run.mjs"], { cwd: consumer, encoding: "utf8" }).replace(/\u001b\[[0-9;]*m/g, "").trim();
    expect(output).toBe("1");
  });
});

test("@claim:package-formats works from ESM, CommonJS, and a strict TypeScript consumer", () => {
  withPackedConsumer((consumer) => {
    writeFileSync(path.join(consumer, "esm.mjs"), 'import { createStrokeProbe } from "pen-latency-lab"; console.log(typeof createStrokeProbe);');
    writeFileSync(path.join(consumer, "common.cjs"), 'const { analyzeSession } = require("pen-latency-lab"); console.log(typeof analyzeSession);');
    writeFileSync(path.join(consumer, "index.ts"), 'import { createStrokeProbe, type IssueBundle } from "pen-latency-lab"; const p=createStrokeProbe(new EventTarget()); const b: IssueBundle=JSON.parse(p.exportIssueBundle()); console.log(b.schemaVersion);');
    writeFileSync(path.join(consumer, "tsconfig.json"), JSON.stringify({ compilerOptions: { strict: true, noEmit: true, target: "ES2022", module: "NodeNext", moduleResolution: "NodeNext", skipLibCheck: false }, files: ["index.ts"] }));
    expect(execFileSync("node", ["esm.mjs"], { cwd: consumer, encoding: "utf8" }).trim()).toBe("function");
    expect(execFileSync("node", ["common.cjs"], { cwd: consumer, encoding: "utf8" }).trim()).toBe("function");
    execFileSync("node", [path.join(process.cwd(), "node_modules/typescript/bin/tsc"), "-p", "tsconfig.json"], { cwd: consumer, stdio: "pipe" });
  });
});

test("@claim:pointer-coalescing records coalesced Pointer Event samples when supplied", () => {
  const previous = globalThis.PointerEvent;
  class FakePointerEvent extends Event {
    pointerId: number;
    pointerType: string;
    isPrimary = true;
    clientX: number;
    clientY: number;
    pressure = .5;
    tiltX = 2;
    tiltY = -2;
    twist = 0;
    private points: FakePointerEvent[];
    constructor(type: string, time: number, points: FakePointerEvent[] = []) {
      super(type);
      this.pointerId = 1;
      this.pointerType = "pen";
      this.clientX = time;
      this.clientY = time / 2;
      this.points = points;
      Object.defineProperty(this, "timeStamp", { value: time });
    }
    getCoalescedEvents(): FakePointerEvent[] { return this.points; }
  }
  Object.assign(globalThis, { PointerEvent: FakePointerEvent });
  try {
    const target = new EventTarget();
    const probe = createStrokeProbe(target);
    target.dispatchEvent(new FakePointerEvent("pointerdown", 10));
    target.dispatchEvent(new FakePointerEvent("pointermove", 20, [new FakePointerEvent("pointermove", 18), new FakePointerEvent("pointermove", 20)]));
    target.dispatchEvent(new FakePointerEvent("pointerup", 28));
    const report = probe.getReport();
    expect(report.environment.coalescedEvents).toBe(true);
    expect(report.strokes[0]?.sampleCount).toBe(4);
    expect(report.strokes[0]?.coalescedSampleCount).toBe(1);
    probe.destroy();
  } finally {
    if (previous) Object.assign(globalThis, { PointerEvent: previous });
    else Reflect.deleteProperty(globalThis, "PointerEvent");
  }
});

test("@claim:detail-opt-ins retain coordinates and pen values only for later strokes", async ({ page }) => {
  await page.goto("/demo");
  await page.locator("#include-geometry").check();
  await page.locator("#include-pen").check();
  const pad = page.locator("#draw-pad");
  await pad.scrollIntoViewIfNeeded();
  const box = await pad.boundingBox();
  expect(box).toBeTruthy();
  await page.mouse.move((box?.x ?? 0) + 60, (box?.y ?? 0) + 90);
  await page.mouse.down();
  await page.mouse.move((box?.x ?? 0) + 250, (box?.y ?? 0) + 150, { steps: 8 });
  await page.mouse.up();
  const bundle = await downloadedBundle(page);
  expect(bundle.strokes.slice(0, 3).every((stroke: any) => stroke.samples === undefined)).toBe(true);
  const laterSamples = bundle.strokes.at(-1).samples;
  expect(laterSamples.length).toBeGreaterThan(1);
  expect(laterSamples[0]).toEqual(expect.objectContaining({ x: expect.any(Number), y: expect.any(Number), pressure: expect.any(Number), tiltX: expect.any(Number) }));
});

test("@claim:invalid-number-safety keeps reports finite and valid JSON", () => {
  const probe = createStrokeProbe(new EventTarget(), { smoothingWindowMs: Infinity, maxStrokes: NaN });
  probe.setPrivacy({ captureGeometry: true, capturePenDetails: true });
  probe.recordStroke([
    { time: NaN, x: Infinity, pressure: Infinity },
    { time: 0, receivedAt: NaN, x: 4, pressure: .5 },
    { time: 8, receivedAt: 10, x: 8, pressure: .6 },
  ], { renderDelaysMs: [NaN, Infinity, -1, 5], smoothingWindowMs: Infinity });
  const raw = probe.exportIssueBundle();
  const report = JSON.parse(raw);
  expect(raw).not.toContain("null");
  expect(report.strokes[0]).toEqual(expect.objectContaining({ sampleCount: 2, p95RenderDelayMs: 5, smoothingWindowMs: 0 }));
  for (const value of Object.values(report.strokes[0])) if (typeof value === "number") expect(Number.isFinite(value)).toBe(true);
});

test("@claim:timestamp-precision includes the browser timing limit in the report", () => {
  const report = createStrokeProbe(new EventTarget()).getReport();
  expect(report.environment.timestampPrecision).toMatch(/browser.*(?:clamp|round)/i);
});

test("@claim:demo-sandbox loads, labels, resets, and leaves isolated sample data", async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem("stroke-lab:real-test", "untouched"));
  await page.goto("/demo");
  const banner = page.getByText("Demo — sample data, nothing is saved");
  await expect(banner).toBeVisible();
  await expect(page.locator("#verdict-code")).toContainText("SMOOTHING / 3 STROKES");
  await expect(page.locator("#issue-title")).toHaveValue("Dotted marks after fast pen lifts");
  page.once("dialog", (dialog) => dialog.accept());
  await page.getByRole("button", { name: "Clear test" }).click();
  await expect(page.locator("#verdict-code")).toHaveText("NO DATA");
  await page.getByRole("button", { name: "Reset demo" }).click();
  await expect(page.locator("#verdict-code")).toContainText("3 STROKES");
  await page.evaluate(() => scrollTo(0, document.body.scrollHeight));
  await expect(banner).toBeVisible();
  expect(await page.evaluate(() => ({ value: localStorage.getItem("stroke-lab:real-test"), keys: Object.keys(localStorage) }))).toEqual({ value: "untouched", keys: ["stroke-lab:real-test"] });
  await page.getByRole("link", { name: "Start for real" }).click();
  await expect(page).toHaveURL("http://127.0.0.1:4173/");
  await expect(page.locator("#demo-banner")).toBeHidden();
  await expect(page.locator("#export")).toBeDisabled();
  expect(await page.evaluate(() => localStorage.getItem("stroke-lab:real-test"))).toBe("untouched");
});

test("@claim:keyboard-operation creates a report without a pointer", async ({ page }) => {
  await page.goto("/");
  await page.locator("#draw-pad").focus();
  await page.keyboard.press("ArrowRight");
  await page.keyboard.press("Space");
  await expect(page.locator("#verdict-code")).toContainText("1 STROKE");
  await expect(page.locator("#export")).toBeEnabled();
});

test("@claim:mit-license ships the MIT terms in the installable package", () => {
  withPackedConsumer((consumer) => {
    const installed = path.join(consumer, "node_modules", "pen-latency-lab");
    const metadata = JSON.parse(readFileSync(path.join(installed, "package.json"), "utf8"));
    const license = readFileSync(path.join(installed, "LICENSE"), "utf8");
    expect(metadata.license).toBe("MIT");
    expect(license).toContain("Permission is hereby granted, free of charge");
  });
});
