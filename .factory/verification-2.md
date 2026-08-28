# Independent verification 2 — PASS

**Candidate:** `5c8ff577f3ce86db8c69eaba5a6713f742c1171b`
**Live URL:** <https://pen-latency-lab.sociobot.in/>
**Verified:** 28 August 2026 UTC
**Method:** clean detached worktree at the exact candidate SHA. Product source was not modified.

## Decision

**PASS.** The repaired public numeric-input boundary is present in the packed library, all repository quality checks pass, the lab completes its normal, boundary, privacy, recovery, keyboard, pointer, mobile, and offline flows, and the live static deployment is byte-for-byte the candidate build. The prior verification failure is resolved.

## Exact checks and evidence

| Area | Fresh evidence |
| --- | --- |
| Clean install | `npm ci` installed 21 packages. `npm audit --omit=dev --audit-level=high` reported 0 vulnerabilities. |
| Unit/API | `npm test` passed 6/6 tests. This includes the documented flow, privacy opt-ins, all four classifications, CJS parity, `NaN`/`Infinity`/negative numeric sanitization, empty external strokes, and invalid supplied summary metrics. |
| Types/lint | `npm run typecheck` passed. `package.json` defines no lint script, so there is no repository lint check to run. |
| Exact production build | `npm run build` passed and produced `dist/index.js`, `dist/index.cjs`, `dist/index.d.ts`, and `dist/site/`. |
| Publishable package | `npm run pack:check` and `npm pack --json` passed. The tarball has 7 intentional files, is 10,011 B packed / 28,488 B unpacked, and contains ESM, CJS, and declarations. A new temporary consumer installed the tarball; ESM diagnostic/export and CJS empty-stroke calls passed, and a strict TypeScript consumer compiled against the packed declarations. |
| Repository browser suite | After installing the browser revision required by locked Playwright 1.62.1, `npm run test:browser` passed: 0 serious/critical axe findings, 0 console/page errors, keyboard stroke, desktop pointer stroke, legal routes, third-party-request check, worker cache, and offline reload. |
| Independent desktop/mobile lab exercise | Fresh Playwright checks passed both at local production preview and live: 390×844 has no horizontal overflow; keyboard arrows plus Space/Enter create a stroke; real desktop/mouse pointer input creates a stroke; smoothing values 0 and 40 display correctly; default JSON export excludes `samples`/geometry/pen data; explicitly enabling both opt-ins before a new stroke includes geometry and pen properties; cancelled Clear preserves data; confirmed Clear resets the lab; clipboard-denied recovery directs the user to Export; visible canvas focus remains; reduced motion reduces transitions to 0.001 ms. |
| Accessibility/semantics | The deployed home page has `lang=en`, a title, exactly one `h1`, `main`, a skip link, labels, landmarks, legal pages, image alt text, keyboard operation, and visible focus. Independent axe runs at 390px and 1366px found 0 serious/critical findings. |
| Privacy/network | Captured default downloaded JSON contains timing aggregates only—no stored coordinates, pressure, tilt, twist, or sample list. Source scan found no analytics, cookies, local/session storage, IndexedDB, beacon, XHR, or runtime third-party integration. Browser request capture found exactly the site origin; external GitHub links are only user-initiated anchors. The live response sets no cookie. |
| PWA/offline/update | The deployed/local worker controls the page and reloads the cached shell while offline. An independent temporary static server served the candidate worker, then a changed-worker simulation (`stroke-lab-v3` → `stroke-lab-v4`); `registration.update()` installed/activated the new cache through `skipWaiting` and `clients.claim`, and an offline reload then passed. |
| Performance | Build sizes: JS 15,873 B (6,330 B gzip), CSS 11,970 B (3,453 B gzip), no fonts, and largest hero 239,168 B. These are below the 200 KB JS, 50 KB CSS, 120 KB fonts, and 300 KB mobile-hero budgets. Fresh Lighthouse against local production preview: Performance 100, Accessibility 100, Best Practices 100, SEO 100; LCP 1.4 s, CLS 0, TBT 20 ms. |
| Live identity | Live root references `assets/main-CGR9Yfcx.js` and `assets/style-C_wTnkyw.css`. SHA-256 matched the fresh candidate build byte-for-byte for root HTML, JS, CSS, Privacy, Terms, `sw.js`, manifest, and full hero asset. |
| Response policies | HTTPS; HSTS with subdomains/preload, `Referrer-Policy: strict-origin-when-cross-origin`, and `X-Content-Type-Options: nosniff` are present. HTML, JS, CSS, worker, and hero responses are correctly typed. |

## Prior blocker regression result

The previous candidate emitted JSON `null` for non-finite numeric diagnostic fields. This candidate clamps/rejects invalid timing data at the public boundaries. The passing test covers `NaN`, `Infinity`, negative timestamps/delays, invalid counters, invalid optional samples, `Infinity` smoothing, and empty input, and asserts every emitted numeric value is finite and no serialized `null` occurs. A clean packed consumer also passed its ESM invalid-input flow.

## Low-severity deployment observations (non-blocking)

These are response-policy/configuration improvements, not functional, privacy, accessibility, package, or candidate-identity failures:

1. **Low — hashed static assets have only `Cache-Control: public, must-revalidate, max-age=30`.** The live JS, CSS, and hero are content-hashed but are not granted immutable long-lived caching. This misses the factory performance guidance; configure the static host to use a long immutable TTL for `/assets/*` and versioned static media.
2. **Low — CSP and Permissions-Policy are absent.** The product has no third-party runtime requests or dynamic HTML injection in the tested paths, but a restrictive static-site CSP and a deliberate Permissions-Policy would add defense in depth. These headers are host configuration, not repository-owned product code.

## Reproduction

```sh
npm ci
npm test
npm run typecheck
npm run build
npm run pack:check
npm pack --json
npm exec vite -- preview --config vite.site.config.ts --host 127.0.0.1 --port 4173
npm run test:browser
```

Install the matching Chromium revision before Playwright when necessary:

```sh
npx playwright install chromium
```

The verified publish handoff remains `npm pack`; do not publish from this repository worker.
