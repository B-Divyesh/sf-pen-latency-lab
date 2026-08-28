# Stroke Lab repair handoff — ready for static deployment

**Work order:** `pen-latency-lab-repair-1`

**Base verification:** `879896e143431449bf2c8cf19d8a659c0d058b41` (candidate `dcbdd610c52ea3bf64b3579d7b51fdba29e83ea3`)

**Artifact:** TypeScript npm library (ESM + CJS + declarations) and static Vite documentation/lab at `dist/site/`
**Release:** `0.1.1`

## Repair completed

The verifier’s blocker is fixed at every public numeric boundary. Non-finite smoothing is clamped to `0`; non-finite or negative timestamps and render delays are discarded; invalid counters fall back to safe finite values; and non-finite opt-in geometry/pen values are never retained. Empty or wholly discarded external strokes now export a valid zero-valued summary. `analyzeSession()` also treats missing/invalid sampling metrics as no evidence rather than a false 0 Hz input diagnosis.

Regression coverage in `tests/probe.test.mjs` exercises `NaN`, `Infinity`, negative timestamps, negative delays, non-finite optional samples, invalid counters, empty samples, JSON serialization, and direct invalid summaries. The original verifier reproduction now produces `smoothing: 0` and `delay: 0`, never JSON `null`.

The service worker cache was also advanced to `stroke-lab-v3`. It precaches the built JS/CSS entry assets and only uses the HTML shell as a navigation fallback, preventing an offline module request from receiving HTML. This lets installed clients activate the repaired static shell through the existing `skipWaiting` and `clients.claim` update policy.

## Verification evidence

- Clean install: `npm ci` installed 21 packages; `npm audit` reported 0 vulnerabilities.
- Unit/integration: `npm test` passed 6/6 tests.
- Types: `npm run typecheck` passed. No separate lint script is defined by this small TypeScript package.
- Production build: `npm run build` passed and produced library artifacts plus `dist/site/`. Built JS is 15,873 B (6,330 B gzip); CSS is 11,970 B (3,450 B gzip); largest hero is 239,168 B.
- Browser: `npm run test:browser` passed at 390×844 and 1366×900: keyboard and real pointer strokes, axe serious/critical 0, console/page errors 0, third-party requests 0, legal routes, service-worker control, cached offline shell reload, and online recovery all passed.
- Privacy: source scan found no storage, cookie, analytics, beacon, XMLHttpRequest, or runtime third-party integration; the only matching text is the privacy disclosure itself. Default unit coverage confirms geometry and pen data remain opt-in.
- PWA: the browser suite confirms the active worker has the built module asset in Cache Storage before the offline shell reload; cache version `stroke-lab-v3` provides an update boundary for existing installations.
- Package: `npm pack --dry-run` and `npm pack --json` passed. The ready-to-publish `pen-latency-lab-0.1.1.tgz` contains 7 files, is 10,011 B packed / 28,488 B unpacked. A fresh temporary consumer installed that tarball and passed ESM invalid-input and CommonJS empty-stroke flows.
- Lighthouse: local production preview report scored 100 Performance, 100 Accessibility, 100 Best Practices, and 100 SEO; LCP 1,353 ms, CLS 0, TBT 19 ms. Lighthouse wrote a complete report despite its Chromium process ending with a post-audit target-crash exit status.

## Run, verify, and deploy

```sh
npm ci
npm test
npm run typecheck
npm run build
npx vite preview --config vite.site.config.ts --host 127.0.0.1
npm run test:browser
npm pack
```

Deploy the static artifact at `dist/site/` to `https://pen-latency-lab.sociobot.in`. The repository has no separate deployment manifest; the factory’s static deployment class uses that documented Vite output root. Do not publish the npm package from this worker; `npm pack` creates the handoff tarball for the registry owner.

Repair commit `f901735391bdf80922152ebde2ad5d9092e05f3d` was pushed to `origin/main`. The only available deployment configuration is the work order’s static class, so that push is the deployment trigger. Live identity was checked immediately and again after 60 seconds: it was still serving the previous `assets/main-Dlcdst-6.js` and `stroke-lab-v1`, rather than this build’s `assets/main-CGR9Yfcx.js` and `stroke-lab-v3`. The factory deployment has therefore not propagated yet; recheck those identities after its static publish completes.

## Known follow-ups

The independent verifier’s non-blocking deployment observations still apply to the platform response policy: deployed hashed assets currently have a short cache lifetime, and CSP/Permissions-Policy are not set. Those headers are deployment infrastructure, not repository-owned application behavior.
