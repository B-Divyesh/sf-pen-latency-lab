# Stroke Lab review 1 — FAIL

**Work order:** `pen-latency-lab-review-1`
**Reviewed implementation candidate:** `5c8ff577f3ce86db8c69eaba5a6713f742c1171b`
**Documentation commit reviewed:** `1ae2cfe3921f5c8908a0b406d4d5aa0e3715680a`
**Live URL:** <https://pen-latency-lab.sociobot.in/>
**Reviewed:** 5 September 2026 UTC

## Verdict

**FAIL — 5 findings; 12 untested public claims.**

The core library and existing lab work, and live output exactly matches the last implementation candidate. The product cannot pass the factory contract because it has no one-click isolated demo, no claims manifest or claim tests, and incomplete required routes, metadata, and response policy.

## Findings

### 1. High — the required sample-data sandbox does not exist

The first screen has `Run a stroke test`, not `Try it with sample data`. In fresh 390×844 phone and 1440×960 desktop contexts there is no sample action, populated sample output, persistent `Demo — sample data, nothing is saved` label, `Reset demo`, or `Start for real` control. `/demo` returns HTTP 200 but renders the normal landing page (`Stroke Lab — find what makes a drawn stroke lag`), not an isolated demo.

This prevents checking the required sandbox path and its guarantee that demo use never reads or writes real data. `.factory/demo.md` is also absent. Add a realistic seeded stroke session at `/demo` (or `?demo=1`) with a separate `demo:` storage namespace, the persistent banner and reset/leave controls, then test it from a fresh context.

### 2. High — claims governance is missing; 12 public claims are untested

`.factory/claims.json` is absent, so there are no declared claim commands to run and no one-to-one sandbox tests. At least these 12 public, user-reliant claims are unlisted and untested:

1. the tool separates input, smoothing, render, and history causes;
2. it exports a reproducible issue bundle;
3. it uploads nothing / is local only;
4. exports exclude drawing content by default;
5. exports contain the described aggregate timing and diagnostic fields;
6. the offline lab still works;
7. it has zero runtime dependencies;
8. it supports ESM, CommonJS, and TypeScript declarations;
9. it has no telemetry, accounts, analytics, or network submission;
10. Pointer Events and coalesced events are handled when available;
11. coordinates and pen data require the stated opt-ins; and
12. invalid numeric input is sanitized into a JSON-safe report.

Some of these behaviors have ordinary tests and manual evidence, but none has the required `@claim:<id>` sandbox test recorded in a manifest. Add the manifest and one observable fresh-demo test per claim; remove any promise that cannot be tested. The untested-claim count is therefore **12**.

### 3. Medium — required routes, 404 handling, and discovery metadata are incomplete

`/sitemap.xml` returns 404. There is no `staticwebapp.config.json`, no canonical URL, Open Graph/Twitter metadata, or Apple touch icon in the built landing page. `/404` returns HTTP 200 and the normal landing page rather than a product-styled not-found page with a way back; its title and h1 are also the landing page’s title and h1. `/demo` has the same fallback problem (finding 1).

Add the routes, sitemap, route-specific title/description, canonical and social image metadata, touch icon, and a static-host configuration that serves a real designed 404 response.

### 4. Medium — the first screen does not state the job, audience, and first action in plain words

Before scrolling, both fresh live viewports show the h1 `Bad stroke. Find the guilty layer.` and the sentence `Separate device sampling, smoothing, paint delay, and undo cost—then send evidence a maintainer can act on.` The h1 is a metaphor rather than the job; the audience is not named; and the first action is neither sample-first nor explained as producing an immediate populated result. The page also uses mood/metaphor labels such as `Four suspects, one trace` and `guilty layer`.

Rewrite the first screen as a ≤9-word job headline, a ≤22-word audience-and-outcome sentence, and a visible sample-data action with the immediate result next to it. Produce the required `.factory/copy-audit.md` (it is currently absent).

### 5. Low — the two earlier response-policy/cache findings remain open

Current live headers still have no `Content-Security-Policy` or `Permissions-Policy`. Content-hashed JS, CSS, and media still use `Cache-Control: public, must-revalidate, max-age=30`, not immutable long-lived caching. These were recorded as low-severity deployment gaps in `.factory/verification-2.md`; the live header check on 5 September confirms neither has changed.

Add a CSP and deliberate Permissions-Policy through the repository static-host configuration, and set immutable caching for hashed assets and versioned media.

## Evidence that passed

| Area | Current evidence |
| --- | --- |
| Clean prerequisites and API checks | `npm ci` completed with 0 vulnerabilities; `npm test` passed 6/6; `npm run typecheck` passed. |
| Build and package | `npm run build`, `npm run pack:check`, and `npm pack --json` passed. The tarball contains 7 intentional files, 10,011 B packed / 28,488 B unpacked. |
| Clean consumer | A fresh temporary consumer installed the tarball. ESM exercised `createStrokeProbe`, record, and export; CommonJS exercised record and export. Both passed. |
| Existing browser suite | `npm run test:browser` passed against a local production preview and the live URL: zero serious/critical axe violations, zero console/page errors, desktop pointer and keyboard paths, legal routes, same-origin requests, service-worker cache, and offline reload. |
| Fresh live phone and desktop | Fresh 390×844 and 1440×960 browser contexts had no console errors or horizontal overflow. The normal lab generated a keyboard stroke and a populated `HEALTHY / 1 STROKE` result. |
| Boundary and recovery | Live smoothing values displayed `0 ms` and `40 ms`. Cancelled Clear preserved the stroke; confirmed Clear restored `NO DATA`. |
| Privacy smoke test | A live default JSON download had one stroke, no `samples`, and `geometryIncluded: false` / `penDetailsIncluded: false`. During that flow requests were only to the product origin. |
| Accessibility | Existing Playwright axe integration passed at its tested mobile size with no serious/critical issues. The live root has `lang=en`, one h1, one main, a skip link, labels, and image alt text. |
| Candidate/live identity | SHA-256 of live root HTML, `assets/main-CGR9Yfcx.js`, and `assets/style-C_wTnkyw.css` exactly matched a fresh local build of `5c8ff57`. Commits after it change only `.factory/handoff.md` and `.factory/verification-2.md`. |
| Links and legal pages | Root, Privacy, Terms, and the linked GitHub repository returned 200. Privacy and Terms have their own titles. |

## Prior review disposition

| Earlier item | Current disposition |
| --- | --- |
| Medium: non-finite numeric inputs serialized as JSON `null` (`verification.md`) | **Resolved.** The current six-test suite includes `numeric public inputs cannot serialize as null`; it passed. The clean packaged consumer also passed. |
| Low: short cache lifetime for hashed assets (`verification-2.md`) | **Open.** Confirmed by current live `Cache-Control: public, must-revalidate, max-age=30`. |
| Low: CSP and Permissions-Policy absent (`verification-2.md`) | **Open.** Confirmed by current live response headers. |

## Commands run

```sh
npm ci
npx playwright install chromium
npm test
npm run typecheck
npm run build
npm run pack:check
npm pack --json
npm exec vite -- preview --config vite.site.config.ts --host 127.0.0.1 --port 4173
npm run test:browser
STROKE_LAB_URL=https://pen-latency-lab.sociobot.in npm run test:browser
```

No `.factory/claims.json` exists, so there were no declared claim commands to run. This is a finding, not a passing zero-claim result.

## Required next steps

Implement and test the demo sandbox and claims manifest first. Then complete the plain-language first screen, copy audit, routing/metadata/404/static-host configuration, and the two response policy/cache repairs. Re-run an independent review only after every public claim has a passing declared sandbox test.
