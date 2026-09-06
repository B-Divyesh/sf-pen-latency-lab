# Stroke Lab repair handoff — PASS

- **Work order:** `pen-latency-lab-repair-2`
- **Live URL:** <https://pen-latency-lab.sociobot.in>
- **Implementation and deployment SHA:** `9460633b92d84ddc84a7cf46383ac064f793c108`
- **Documentation:** this handoff commit; its exact SHA is recorded in the following verification-only commit
**Deployed:** 6 September 2026 UTC

## Outcome

All five review findings and the earlier numeric-input defect are resolved. The free TypeScript library, built-package playground, one-click sample, local JSON export, offline path, legal pages, and designed 404 work on the deployed HTTPS site.

The sample opens at `/demo` with three pen-like handwriting strokes, a 24 ms smoothing setting, filled issue context, and a populated smoothing diagnosis. Its sticky banner includes **Reset demo** and **Start for real**. The demo uses only its page's memory and does not read or write browser storage.

## Review finding disposition

| Finding | Disposition |
| --- | --- |
| Missing sample-data sandbox | **Resolved.** `/demo` is populated, labeled, resettable, directly addressable, offline-capable, and isolated. `.factory/demo.md` records the sample and storage model. |
| 12 untested public claims | **Resolved.** `.factory/claims.json` declares 15 claims. Each has one tagged outcome test. All 15 commands passed separately in a clean clone of the deployed SHA. |
| Missing routes, metadata, and 404 | **Resolved.** Root, Demo, Privacy, and Terms have route titles and metadata. The build includes canonical, Open Graph, Twitter, touch icon, sitemap, robots, and a product-styled HTTP 404. |
| First-screen plain-language failure | **Resolved.** The first screen names the job, artists and maintainers, the sample action, its result, and three facts. `.factory/copy-audit.md` records word counts and terminology. |
| Missing CSP, Permissions-Policy, and immutable caching | **Resolved live.** Restrictive CSP and Permissions-Policy headers are present. Hashed JS/CSS and versioned visual assets return `max-age=31536000, immutable`. |
| Earlier non-finite numeric exports | **Remains resolved.** Unit and claim tests reject or sanitize invalid public numbers and assert finite, JSON-safe output. |

## Product work

- Rewrote the first screen and section headings in plain words without changing the concrete-and-moss visual identity.
- Added an in-memory sample session with realistic raw and smoothed paths, report context, reset, leave, and keyboard support.
- Made the site import the built package entry point, so the playground exercises the library artifact.
- Added route metadata, a 1200×630 social card derived from the original art, raster app icons, sitemap, and route-specific legal content.
- Added a real static-host 404 response, CSP, Permissions-Policy, security headers, and deliberate cache rules.
- Removed an offline cache race by waiting for fetched modules to be stored before resolving the service-worker response.
- Pinned Playwright and its core to `1.58.2`, matching the worker browser installation.
- Bumped the package to `0.1.2` and updated README, changelog, design provenance, catalog copy, demo docs, and claim docs.

No AI feature was added. Diagnosis uses measured timing and deterministic thresholds, so a model would make the evidence less reproducible. The researched offer is free, so no billing offer or registration is applicable.

## Verification

| Check | Result |
| --- | --- |
| Clean setup | Fresh clone of `9460633`; `npm ci` installed 21 packages with no runtime dependency install. |
| Declared claims | All 15 `.factory/claims.json` commands passed one by one. Log: `/work/.evidence/final-clean-claims.log`. |
| Unit and API | `npm test`: 6/6 passed. |
| Types and build | `npm run typecheck` and `npm run build` passed; `dist/` and `dist/site/index.html` produced. |
| Package | `npm run pack:check` and `npm pack --json` passed; 7 files, 10,191 B packed, 28,919 B unpacked. Clean ESM, CJS, and strict TypeScript consumers run in claim tests. |
| Browser | Local and live `npm run test:browser` passed normal, boundary, recovery, demo, keyboard, pointer, reduced-motion, privacy, offline, route, and 404 checks. |
| Accessibility | Playwright axe found zero serious or critical issues on Home, Demo, Privacy, and Terms. `verify-url.sh` reported title, `lang`, one h1, main, alt text, labels, and zero console errors. |
| Cold live browsers | Separate 390×844 and 1440×960 contexts passed first-screen, sample, reset, leave, isolation sentinel, and same-origin request checks. The default download had three strokes and no samples or pen details. |
| Live policies | Root has CSP and Permissions-Policy. Hashed JS and versioned WebP return one-year immutable caching. An unknown route returns HTTP 404 with the designed page. |
| Performance | Live Lighthouse: Performance 99, Accessibility 100, Best Practices 100, SEO 100; LCP 1.4 s, CLS 0, TBT 0 ms. JS is 17,964 B raw / 7,070 B gzip; CSS is 13,865 B raw / 3,830 B gzip; largest mobile hero is 63,556 B. |

The first deployment attempt was rejected during configuration validation because Azure normalizes `/demo` and `/demo/` as one route. No files changed live. The duplicate rule was removed in `9460633`, the next upload succeeded, and the live checks above ran after that deployment.

## Run and verify

```sh
npm ci
npm test
npm run typecheck
npm run build
npm run pack:check
npm pack --json
npm run test:claims
npm run test:browser
STROKE_LAB_URL=https://pen-latency-lab.sociobot.in npm run test:browser
```

`npm run test:browser` starts and stops a local production preview when no URL is supplied. Each exact claim command is in `.factory/claims.json`.

## Known gaps and next steps

No known product defect remains from the review history. The worker did not publish to npm because registry publication is factory-owned. The ready artifact command is `npm pack`.

The researched success measure still needs pilot data from real artists and maintainers. That external validation does not block the implemented diagnostic job.
