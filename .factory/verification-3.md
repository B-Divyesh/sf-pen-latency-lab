# Stroke Lab verification 3 — FAIL

**Work order:** `pen-latency-lab-verify-3`  
**Implementation candidate:** `9460633b92d84ddc84a7cf46383ac064f793c108`  
**Documentation base:** `275bb32b3f7af3c0f9de976aa9ccbeee2ee39dc2`  
**Live URL:** <https://pen-latency-lab.sociobot.in>  
**Verified:** 6 September 2026 UTC

## Verdict

**FAIL — 1 medium finding; 0 untested claims.**

The library, sample sandbox, deployed output, privacy path, offline path, policy headers, package artifact, and all 15 declared claims pass. The product cannot receive a PASS because navigation from Home to Demo does not move focus to the new page heading or announce the route change, as required by the site-structure accessibility contract.

## Finding

### Medium — navigation does not give keyboard or screen-reader users a new-page focus target

In a fresh live 390×844 context, activating the **Demo** link from Home reached `/demo` and rendered its correct title and h1, but `document.activeElement` was `BODY`, not the new `h1`. The `h1` is not focusable and the route does not provide an `aria-live="polite"` route announcement. The same route mechanism is used by the Home/Demo links.

This leaves a keyboard or screen-reader user without the required focus hand-off after changing places. Make the new route heading programmatically focusable, move focus to it after navigation (including back/forward), and announce the new page name through a polite live region. Add a browser regression test that activates Home → Demo and asserts the focused new h1 and announcement.

## Job, audience, and first action

Fresh phone (390×844) and desktop (1440×960) contexts both loaded at scroll position zero with no console errors. Before scrolling, they stated:

- Job: **Find what makes a drawn stroke lag**.
- Audience: **digital artists and drawing-tool maintainers** separating input, smoothing, render, and undo delays.
- First action: **Try it with sample data**; it loads three strokes and a diagnosis.

The three visible facts are free under MIT, offline after first visit, and no uploads or accounts. The primary action measured 358×50.8 CSS px on phone. There was no horizontal overflow.

## Declared claims

All exact commands in `.factory/claims.json` were run from a fresh GitHub clone at `275bb32`; each passed with one matching tagged test. The documentation commits after `9460633` change only `.factory/` reports, so the built product reviewed is the implementation candidate.

| Claim ID | Result | Observable evidence |
| --- | --- | --- |
| `cause-classification` | PASS | Fixed summaries produce input, smoothing, render, and history diagnoses. |
| `json-bundle-download` | PASS | A fresh demo downloads and parses a three-stroke JSON issue bundle. |
| `local-only` | PASS | Demo requests stay same-origin; no cookies or browser storage are created. |
| `default-private-export` | PASS | Default demo export has no coordinates or pen details. |
| `bundle-fields` | PASS | Export includes aggregates, capabilities, findings, title, and notes. |
| `offline-reload` | PASS | A separate, worker-controlled demo context reloads while offline. |
| `zero-runtime-dependencies` | PASS | Packed artifact installs offline with no production transitive packages and runs. |
| `package-formats` | PASS | Clean consumer exercises ESM and CommonJS and compiles strict TypeScript. |
| `pointer-coalescing` | PASS | A supplied coalesced pointer stream is recorded as coalesced samples. |
| `detail-opt-ins` | PASS | Only a later stroke after both opt-ins contains coordinates and pen values. |
| `invalid-number-safety` | PASS | Invalid values produce finite, JSON-safe report values. |
| `timestamp-precision` | PASS | Exported environment reports browser timestamp clamping or rounding. |
| `demo-sandbox` | PASS | `/demo` is populated, labeled, resettable, sticky-bannered, and leaves a real-data sentinel untouched. |
| `keyboard-operation` | PASS | Arrow plus Space on the pad creates a stroke and enables export. |
| `mit-license` | PASS | The packed consumer contains MIT metadata and license terms. |

## Other verification evidence

| Area | Result |
| --- | --- |
| Clean setup | Fresh remote clone at `275bb32`; `npm ci` installed 21 packages. `npm audit --omit=dev --audit-level=high` found 0 vulnerabilities. |
| Library and build | `npm test` passed 6/6; `npm run typecheck`, `npm run build`, and `npm run pack:check` passed. Build produced `dist/index.{js,cjs,d.ts}` and `dist/site/`. |
| Package | `npm pack --json` produced the 7-file package, 10,191 B packed and 28,919 B unpacked. The declared clean-consumer claims exercise its installed ESM, CJS, and declarations. |
| Local browser | `npm run test:browser` passed: 0 serious/critical axe issues, no console/page errors, keyboard and pointer drawing, invalid/boundary and recovery paths, reduced motion, routes, and offline reload. |
| Live browser | `STROKE_LAB_URL=https://pen-latency-lab.sociobot.in npm run test:browser` passed: 0 serious/critical axe issues, no application console/page errors, same-origin runtime requests only, demo/reset/isolation, legal routes, offline reload, CSP, Permissions-Policy, immutable assets, and designed 404. |
| Accessibility checks | Axe found 0 serious/critical issues on Home at phone and desktop widths, Demo, Privacy, Terms, and 404. The skip link, landmark structure, one h1 per route, heading titles, labels, pad focus ring, 44 px primary target, and reduced-motion path passed. The route-focus finding above remains. |
| Privacy | Fresh demo export used only product-origin requests and created no cookies, localStorage, sessionStorage, or third-party runtime requests. It excludes coordinates and pen data by default. |
| Normal, boundary, recovery | Keyboard and pointer strokes work; smoothing values 0 and 40 render correctly; cancelled Clear keeps data; confirmed Clear returns `NO DATA`; denied clipboard access directs the user to Export JSON. |
| 404 and links | `/a-route-that-does-not-exist` returns deliberate HTTP 404 with title `Page not found — Stroke Lab`, one h1, main landmark, and a Home link. Root, Demo, Privacy, Terms, sitemap, robots, and the external source link returned 200. The browser's expected failed-resource log for the deliberate 404 response is not an application error. |
| Live identity | SHA-256 matched fresh-candidate and live root HTML, main JS, CSS, service worker, manifest, hero, social card, 404, Privacy, and Terms files. |
| Policies and caching | Live CSP contains `frame-ancestors 'none'`; Permissions-Policy disables camera and other unused features. Hashed JS and the versioned hero return `Cache-Control: public, max-age=31536000, immutable`. |
| Backend checks | Not applicable: this is a static browser library/site with no backend, tenant state, health endpoint, or rate limit. |

## Earlier finding disposition

| Earlier item | Current disposition |
| --- | --- |
| Missing sample sandbox | Resolved: `/demo` gives an immediate realistic three-stroke result, persistent sample label, reset, leave action, and no browser persistence. |
| Untested public claims | Resolved: 15 declared claims have passing exact tagged commands; untested count is zero. |
| Routes, metadata, discovery, and 404 | Resolved: route-specific titles, sitemap, robots, canonical/social metadata, legal pages, and a real 404 are live. |
| First-screen plain words | Resolved: both fresh viewports state job, audience, sample-first action, and three facts before scrolling. |
| Missing CSP, Permissions-Policy, and immutable caching | Resolved live: all headers are present and hashed assets are immutable for one year. |
| Non-finite numeric report values | Resolved: unit and declared invalid-number claim tests pass; exported numeric fields are finite. |

## Reproduction

```sh
git clone https://github.com/B-Divyesh/sf-pen-latency-lab.git
cd sf-pen-latency-lab
npm ci
npm test
npm run typecheck
npm run build
npm run pack:check
npm pack --json
npm run test:claims -- --grep @claim:<each-id-in-.factory/claims.json>
npm run test:browser
STROKE_LAB_URL=https://pen-latency-lab.sociobot.in npm run test:browser
```

## Required next step

Repair and test route focus and route announcements, then repeat the independent verification. Do not publish the package as a factory PASS until this finding is closed.
