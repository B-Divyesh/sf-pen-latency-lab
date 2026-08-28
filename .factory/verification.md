# Independent verification — FAIL

**Candidate:** `dcbdd610c52ea3bf64b3579d7b51fdba29e83ea3`
**Live URL:** https://pen-latency-lab.sociobot.in/
**Verified:** 28 August 2026 UTC
**Method:** clean detached clone at the candidate SHA; product source was not changed.

## Decision

**FAIL.** Normal product and deployment verification pass, but the package's public API accepts non-finite numeric inputs and emits JSON `null` where its exported TypeScript issue-bundle contract says `number`. This fails the required invalid-input/public-library boundary check and can produce an unusable diagnostic bundle.

## Blocking defect

### Medium — public API serializes invalid numeric diagnostic fields

`createStrokeProbe().setSmoothingWindow(NaN)` and `setSmoothingWindow(Infinity)` are accepted. Likewise, `recordStroke(..., { renderDelaysMs: [NaN] })` is accepted. The probe retains `NaN`; `exportIssueBundle()` then serializes it as `null` because of JSON semantics.

Fresh-package evidence (ESM import):

```json
{"input":"NaN","smoothing":null,"delay":null,
 "report":{"p95RenderDelayMs":null,"smoothingWindowMs":null}}
{"input":"Infinity","smoothing":null,"delay":null,
 "report":{"p95RenderDelayMs":null,"smoothingWindowMs":null}}
```

`StrokeSummary.p95RenderDelayMs` and `StrokeSummary.smoothingWindowMs` are declared as `number`, not `number | null`. A consumer accepting untrusted configuration or external samples can therefore export a report that contradicts the package's own schema/type contract and does not faithfully diagnose the stroke. Negative smoothing is correctly clamped to zero; the missing case is non-finite validation. Recommended fix: reject, clamp, or filter every public numeric input with `Number.isFinite`, then add tests for `NaN`, `Infinity`, negative delays/timestamps, and empty samples.

## Checks that passed

| Area | Evidence |
| --- | --- |
| Clean install | `npm ci`: 21 packages installed; `npm audit`: 0 vulnerabilities. |
| API/unit suite | `npm test`: 4/4 passed (documented flow, privacy opt-ins, all four classifications, CommonJS parity). |
| Types | `npm run typecheck` passed. No lint script is defined in `package.json`. |
| Production build | `npm run build` passed; library ESM/CJS/declarations and static `dist/site/` produced. |
| Publishing | `npm pack --dry-run` and `npm pack --json` passed: 7 files, 9.1 kB tarball, 26.2 kB unpacked. Fresh temporary consumer installed the tarball and exercised ESM and CommonJS APIs; a strict TypeScript consumer compiled against the packed declarations. |
| Built browser test | After installing the repository-declared Playwright Chromium revision (the preinstalled revision did not match Playwright 1.62), `npm run test:browser` passed locally and against the live URL: zero serious/critical axe findings and zero console/page errors. |
| End-to-end lab | Desktop and 390×844 mobile: real pointer stroke; keyboard Space/Enter stroke; smoothing bounds 0, 12, and 40 ms; geometry/pen opt-ins; default and opt-in downloads; undo; clear cancel/confirm recovery; forced clipboard-denied fallback; focus; reduced motion; no horizontal mobile overflow. All passed locally and live. |
| Privacy/network | Default download contained no `samples`, coordinates, pressure, tilt, or twist. Opt-in future keyboard stroke contained the expected details. Browser request capture found 0 third-party requests; no runtime analytics/storage/cookies calls in source; live response sets no cookie. The only external links are user-initiated GitHub links. |
| PWA | Service worker controlled the page; offline reload passed. A controlled changed-worker simulation activated a fresh shell after `registration.update()` (`skipWaiting`/`clients.claim`). |
| Accessibility | Live and built pages have `lang`, title, one h1, main, skip link, labels, legal routes, visible 3px focus styling, keyboard operation, image alt text, and reduced-motion styling. axe serious/critical: 0 on desktop and 390px mobile. |
| Performance | Build output: JS 15,162 B (6,050 B gzip), CSS 11,970 B (3,450 B gzip), no font payload; largest responsive hero 239,168 B (<300 kB). Lighthouse mobile against production output: Performance 99, Accessibility 100, Best Practices 100, SEO 100; LCP 1.9 s, CLS 0, TBT 20 ms. |
| Deployment identity | Live root, JS, CSS, Privacy, Terms, service worker, manifest, and hero asset SHA-256 matched a fresh candidate build byte-for-byte. Root and assets reference `main-Dlcdst-6.js` and `style-C_wTnkyw.css`. |

## Deployment/header observations (non-blocking)

The live deployment is HTTPS and returns HSTS, `Referrer-Policy: strict-origin-when-cross-origin`, and `X-Content-Type-Options: nosniff`. It has no CSP or Permissions-Policy, and serves hashed JS/CSS with `Cache-Control: public, must-revalidate, max-age=30` rather than long-lived immutable caching. These do not affect the functional failure above, but the cache policy misses the factory performance recommendation for hashed static assets and the absent policies are defense-in-depth gaps.

## Reproduction commands

```sh
npm ci
npm test
npm run typecheck
npm run build
npm run pack:check
npm pack --json
npx vite preview --config vite.site.config.ts --host 127.0.0.1
npm run test:browser
```

To reproduce the blocker after building:

```sh
node --input-type=module -e '
  import { createStrokeProbe } from "./dist/index.js";
  const p = createStrokeProbe(new EventTarget());
  p.setSmoothingWindow(NaN);
  p.recordStroke([{ time: 0 }, { time: 10 }], { renderDelaysMs: [NaN] });
  console.log(p.exportIssueBundle());
'
```

## Scope and next step

No product code was modified. Validate finite numbers at every public API boundary, add regression tests, rebuild/redeploy, and re-run this verification.
