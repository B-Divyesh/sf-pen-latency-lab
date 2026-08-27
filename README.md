# Stroke Lab

Stroke Lab is a zero-dependency TypeScript probe and local test pad for diagnosing why a browser-drawn stroke feels wrong. It separates four common causes—input sampling, smoothing delay, render delay, and undo/history cost—and exports a reproducible, privacy-safe issue bundle.

It is for digital artists gathering evidence and maintainers debugging Pointer Events. It does not replace a brush engine, inspect tablet drivers, or upload telemetry.

Live lab: https://pen-latency-lab.sociobot.in

## Install

```sh
npm install pen-latency-lab
```

## Usage

```ts
import { createStrokeProbe } from "pen-latency-lab";

const canvas = document.querySelector("canvas")!;
const probe = createStrokeProbe(canvas, {
  smoothingWindowMs: 12,
  onStroke(stroke) {
    console.log(stroke.sampleRateHz, stroke.p95RenderDelayMs);
  },
});

// Call after your engine has painted the newest input.
probe.markRendered();

// Measure an undo/redo or history rebuild.
await probe.measureHistory("undo", () => undoLastStroke());

// Coordinates and pen details are excluded unless explicitly enabled.
const json = probe.exportIssueBundle({
  title: "Dots appear after fast pen lifts",
  notes: "Reproduces with smoothing set to 12 ms",
});

probe.destroy();
```

`createStrokeProbe()` listens to Pointer Events and coalesced events when available. It stores aggregate timing only by default. The callback receives coordinates so your renderer can use the current sample, but the report does not retain them unless the user opts in:

```ts
probe.setPrivacy({ captureGeometry: true, capturePenDetails: true });
```

Pressure, tilt, and twist are never retained without `capturePenDetails: true`. Browser timestamps can be rounded or clamped; `report.environment.timestampPrecision` describes that limitation and findings are diagnostic leads, not driver-level proof.

Frameworks that already own input collection can call `probe.recordStroke(samples)` instead of relying on DOM listeners. See the exported TypeScript declarations for `InputSample`, `StrokeSummary`, and `IssueBundle`.

## Development

```sh
npm install
npm run dev          # local documentation and lab
npm test             # builds the library and runs API tests
npm run typecheck
npm run build        # library + static site in dist/site/
npm run pack:check   # inspect the publishable npm tarball
```

The static deployment root is `dist/site` (with `index.html` at that root). The package entry points are `dist/index.js`, `dist/index.cjs`, and `dist/index.d.ts`.

## Privacy and support

Stroke Lab has no analytics, accounts, network submission, or runtime dependencies. The lab runs locally and downloads bundles directly in the browser. Reports exclude stroke coordinates and pen details by default. See `/privacy/` and `/terms/` on the site.

Open an issue with a generated bundle when reporting a problem. This project is MIT licensed.
