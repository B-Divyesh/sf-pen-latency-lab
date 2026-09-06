# Stroke Lab

Stroke Lab tests why a browser-drawn stroke lags. It separates input, smoothing, render, and history delays for artists and maintainers.

The local test pad exports a JSON issue bundle. The npm package adds the same measurements to an existing drawing tool.

- Live site: https://pen-latency-lab.sociobot.in
- One-click sample: https://pen-latency-lab.sociobot.in/demo
- License: MIT

## Install

```sh
npm install pen-latency-lab
```

The package has zero runtime dependencies. It includes ESM, CommonJS, and TypeScript declarations.

## Use the probe

```ts
import { createStrokeProbe } from "pen-latency-lab";

const canvas = document.querySelector("canvas")!;
const probe = createStrokeProbe(canvas, {
  smoothingWindowMs: 12,
  onStroke(stroke) {
    console.log(stroke.sampleRateHz, stroke.p95RenderDelayMs);
  },
});

// Call this after your engine paints the newest input.
probe.markRendered();

// Measure an undo, redo, or history rebuild.
await probe.measureHistory("undo", () => undoLastStroke());

const json = probe.exportIssueBundle({
  title: "Dots appear after fast pen lifts",
  notes: "Reproduces with smoothing set to 12 ms",
});

probe.destroy();
```

The probe listens to Pointer Events. It uses coalesced samples when the browser supplies them.

Tools that already collect input can call `probe.recordStroke(samples)`. See the declarations for `InputSample`, `StrokeSummary`, and `IssueBundle`.

## Control report detail

Reports keep aggregate timing by default. They omit coordinates, pressure, tilt, twist, and the sample list.

Enable each extra detail only with the user's consent:

```ts
probe.setPrivacy({ captureGeometry: true, capturePenDetails: true });
```

Each option affects later strokes only. Browser timestamps can be rounded or clamped, so every report states that limit.

## Handle invalid input

All public timing values must be finite. Stroke Lab clamps invalid smoothing to zero and discards invalid timestamps and render delays.

An empty sample list still produces a valid numeric summary. Exported JSON does not contain `NaN`, `Infinity`, or accidental `null` numbers.

## Run from a clean checkout

Use Node.js 18 or newer.

```sh
npm ci
npm test
npm run typecheck
npm run build
npm run pack:check
npm run test:claims
npm run test:browser
```

`npm run build` writes the library and site to `dist/`. The static deployment root is `dist/site/`.

`npm pack` creates the ready-to-publish package. Registry publishing belongs to the factory operator.

Every public promise and its isolated command is listed in [`.factory/claims.json`](.factory/claims.json). The sample design is documented in [`.factory/demo.md`](.factory/demo.md).

## Privacy and limits

Stroke Lab has no accounts, cookies, analytics, uploads, or third-party runtime requests. The site works offline after its first visit.

The default report contains timing and diagnostic fields, not drawing content. Review any optional details and notes before sharing a report.

Stroke Lab does not replace a brush engine or inspect tablet drivers. Its findings are engineering leads, not driver-level proof.

See the live [privacy policy](https://pen-latency-lab.sociobot.in/privacy/) and [terms](https://pen-latency-lab.sociobot.in/terms/).
