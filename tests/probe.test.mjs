import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { test } from "node:test";
import { analyzeSession, createStrokeProbe } from "../dist/index.js";

const makeSamples = (count = 20, gap = 8) => Array.from({ length: count }, (_, index) => ({
  time: 100 + index * gap,
  receivedAt: 102 + index * gap,
  x: 40 + index,
  y: 80 + index / 2,
  pressure: .6,
  tiltX: 12,
  tiltY: -4,
}));

test("documented probe flow reports timing without retaining drawing content", async () => {
  const target = new EventTarget();
  const completed = [];
  const probe = createStrokeProbe(target, { smoothingWindowMs: 12, onStroke: (stroke) => completed.push(stroke) });

  const stroke = probe.recordStroke(makeSamples(), { pointerType: "pen", renderDelaysMs: [7, 9, 11] });
  assert.equal(stroke.sampleRateHz, 125);
  assert.equal(stroke.p95RenderDelayMs, 11);
  assert.equal(stroke.samples, undefined);
  assert.equal(completed.length, 1);

  await probe.measureHistory("undo", () => "done");
  const bundle = JSON.parse(probe.exportIssueBundle({ title: "Example report" }));
  assert.equal(bundle.schemaVersion, "1.0");
  assert.equal(bundle.issue.title, "Example report");
  assert.equal(bundle.privacy.geometryIncluded, false);
  assert.equal(bundle.privacy.penDetailsIncluded, false);
  assert.equal(bundle.strokes[0].samples, undefined);
  assert.equal(bundle.history[0].label, "undo");
  probe.destroy();
});

test("geometry and sensitive pen details require separate opt-ins", () => {
  const probe = createStrokeProbe(new EventTarget());
  probe.setPrivacy({ captureGeometry: true });
  const geometry = probe.recordStroke(makeSamples(3));
  assert.equal(geometry.samples[0].x, 40);
  assert.equal(geometry.samples[0].pressure, undefined);

  probe.setPrivacy({ captureGeometry: false, capturePenDetails: true });
  const pen = probe.recordStroke(makeSamples(3));
  assert.equal(pen.samples[0].x, undefined);
  assert.equal(pen.samples[0].pressure, .6);
  assert.equal(probe.getReport().privacy.penDetailsIncluded, true);
  probe.destroy();
});

test("classifier separates smoothing, input, render, and history leads", () => {
  const base = {
    id: 1, pointerType: "pen", durationMs: 160, sampleCount: 20, eventCount: 20,
    coalescedSampleCount: 0, sampleRateHz: 120, medianSampleIntervalMs: 8,
    p95SampleIntervalMs: 9, intervalJitterMs: 1, p95RenderDelayMs: 8, smoothingWindowMs: 40,
  };
  assert.equal(analyzeSession([base]).primary, "smoothing");
  assert.equal(analyzeSession([{ ...base, smoothingWindowMs: 0, sampleRateHz: 30, p95SampleIntervalMs: 38 }]).primary, "input");
  assert.equal(analyzeSession([{ ...base, smoothingWindowMs: 0, p95RenderDelayMs: 45 }]).primary, "render");
  assert.equal(analyzeSession([{ ...base, smoothingWindowMs: 0 }], [{ label: "undo", durationMs: 120, measuredAt: 1 }]).primary, "history");
});

test("CommonJS export exposes the same public API", () => {
  const require = createRequire(import.meta.url);
  const commonjs = require("../dist/index.cjs");
  assert.equal(typeof commonjs.createStrokeProbe, "function");
  assert.equal(typeof commonjs.analyzeSession, "function");
});

test("numeric public inputs cannot serialize as null", () => {
  const probe = createStrokeProbe(new EventTarget(), { smoothingWindowMs: Infinity, maxStrokes: NaN });
  probe.setPrivacy({ captureGeometry: true, capturePenDetails: true });
  probe.setSmoothingWindow(NaN);
  const configured = probe.recordStroke([{ time: 0 }, { time: 10 }], { renderDelaysMs: [NaN, Infinity, -1] });
  probe.setSmoothingWindow(Infinity);
  const infiniteConfigured = probe.recordStroke([{ time: 20 }, { time: 30 }]);
  const stroke = probe.recordStroke([
    { time: -1, x: 1 },
    { time: NaN, x: 2 },
    { time: Infinity, x: 3 },
    { time: 0, receivedAt: NaN, x: NaN, y: Infinity, pressure: Infinity, tiltX: NaN, tiltY: Infinity, twist: NaN },
    { time: 12, receivedAt: Infinity, x: -4, y: 8, pressure: .5, tiltX: -3, tiltY: 4, twist: 9 },
  ], { eventCount: Infinity, coalescedSampleCount: NaN, renderDelaysMs: [-1, NaN, Infinity, 4], smoothingWindowMs: Infinity });
  const empty = probe.recordStroke([], { renderDelaysMs: [-1, NaN, Infinity], smoothingWindowMs: -3 });
  const bundle = JSON.parse(probe.exportIssueBundle());

  assert.equal(configured.p95RenderDelayMs, 0);
  assert.equal(configured.smoothingWindowMs, 0);
  assert.equal(infiniteConfigured.smoothingWindowMs, 0);
  assert.equal(stroke.sampleCount, 2);
  assert.equal(stroke.eventCount, 2);
  assert.equal(stroke.coalescedSampleCount, 0);
  assert.equal(stroke.p95RenderDelayMs, 4);
  assert.equal(stroke.smoothingWindowMs, 0);
  assert.deepEqual(stroke.samples[0], { time: 0 });
  assert.equal(empty.sampleCount, 0);
  assert.equal(empty.p95RenderDelayMs, 0);
  assert.equal(empty.smoothingWindowMs, 0);
  assert.equal(JSON.stringify(bundle).includes("null"), false);
  for (const summary of bundle.strokes) {
    for (const value of Object.values(summary)) {
      if (typeof value === "number") assert.equal(Number.isFinite(value), true);
    }
  }
  probe.destroy();
});

test("analysis treats invalid supplied summary metrics as zero evidence", () => {
  const invalid = {
    id: 1, pointerType: "external", durationMs: NaN, sampleCount: Infinity, eventCount: NaN,
    coalescedSampleCount: Infinity, sampleRateHz: Infinity, medianSampleIntervalMs: NaN,
    p95SampleIntervalMs: Infinity, intervalJitterMs: NaN, p95RenderDelayMs: -1, smoothingWindowMs: Infinity,
  };
  const diagnosis = analyzeSession([invalid], [{ label: "undo", durationMs: NaN, measuredAt: Infinity }]);
  assert.equal(diagnosis.primary, "healthy");
  assert.equal(JSON.stringify(diagnosis).includes("null"), false);
  assert.equal(JSON.stringify(diagnosis).includes("NaN"), false);
});
