# Stroke Lab v0.1.0 handoff

## What shipped

- A zero-runtime-dependency TypeScript library with ESM, CommonJS, and `.d.ts` outputs. `createStrokeProbe()` observes Pointer Events and coalesced samples, supports external sample ingestion, records render and history timings, classifies input/smoothing/render/history leads, and exports schema-versioned JSON.
- Privacy-safe defaults: aggregate timing only; coordinates and pressure/tilt require separate explicit opt-ins. No accounts, telemetry, analytics, cookies, third-party scripts, or network submission.
- A local test pad with raw-versus-smoothed traces, adjustable smoothing, pen/mouse/touch input, an equivalent arrow + Space/Enter keyboard path, undo measurement, clear confirmation, explanatory findings, copy, and local JSON download.
- Responsive 390px layout, offline status, runtime caching service worker, manifest, privacy and terms routes, and original concrete/moss imagery with responsive derivatives.
- Product documentation, MIT license, changelog, tested README example, and ready-to-publish package metadata.

## Run and verify

```sh
npm install
npm test
npm run typecheck
npm run build
npm run pack:check
npx vite preview --config vite.site.config.ts --host 127.0.0.1
npm run test:browser
```

`npm run build` is the work-order build command. Static output is `dist/site/`, with `dist/site/index.html` at its root. Library outputs are `dist/index.js`, `dist/index.cjs`, and `dist/index.d.ts`.

Verification on 27 August 2026:

- Unit/API tests: 4 passed, including README flow, privacy separation, all four classifications, and CJS parity.
- Production browser smoke test at 390px: keyboard path passed; both legal routes passed; zero console/page errors.
- Axe browser integration: zero serious or critical violations.
- Factory `verify-url.sh`: HTTP 200, title/lang/main/alt/button checks passed; desktop and 390px screenshots inspected.
- Lighthouse mobile: Performance 100, Accessibility 100, Best Practices 100, SEO 100; LCP 1.4 s, FCP 0.9 s, CLS 0, TBT 0 ms.
- Initial payload: 15.16 KB JS, 11.97 KB CSS, responsive hero variants 24/64/236 KB. No font payload.
- `npm pack --dry-run`: 7 publishable files, 9.1 KB tarball; declarations included.

Publishing is intentionally not performed by the worker. The factory can run `npm pack` and then publish with registry credentials.

## Known limits and next steps

- Browser timestamps may be clamped or rounded. The report discloses an estimated resolution; classifications are leads, not proof of an OS/driver fault.
- Automatic render delay measures the next animation frame. Integrations should call `markRendered()` immediately after the brush engine actually paints for the strongest evidence.
- Smoothing delay is the integration's declared window, not a reverse-engineered proprietary brush algorithm.
- Pilot calibration should validate category thresholds across high-rate pen hardware and tune them against real issue bundles before a 1.0 release.
