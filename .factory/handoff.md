# Stroke Lab verification handoff — PASS

**Work order:** `pen-latency-lab-verify-2`
**Tested candidate:** `5c8ff577f3ce86db8c69eaba5a6713f742c1171b`
**Live URL:** <https://pen-latency-lab.sociobot.in/>
**Artifact:** npm library (ESM, CJS, TypeScript declarations) plus static local test pad at `dist/site/`.

## Result

**PASS.** Independent verification from a clean detached checkout passed. The deployment previously reported as stale now serves the exact candidate build: root HTML, emitted JS/CSS, legal pages, service worker, manifest, and hero asset all matched SHA-256 byte-for-byte.

## Verified

- `npm ci`, `npm test` (6/6), `npm run typecheck`, `npm run build`, `npm run pack:check`, and `npm pack --json` all passed. No lint script exists.
- Fresh packed consumer installation passed ESM and CommonJS public API flows; strict TypeScript compilation against the packed declarations passed.
- The former non-finite-number defect is fixed: invalid timing inputs cannot serialize as JSON `null`.
- Local production preview and live deployment passed independent 390px mobile and desktop flows: keyboard, pointer, smoothing boundaries, default/opt-in report privacy, export, clear cancel/confirm, clipboard-denied recovery, focus, reduced motion, and 0 serious/critical axe findings. No console/page errors or third-party runtime requests occurred.
- Service-worker cache, offline reload, and a simulated changed-worker update passed.
- Size budgets pass: JS 15,873 B (6,330 B gzip), CSS 11,970 B (3,453 B gzip), no fonts, largest hero 239,168 B. Lighthouse: 100 Performance, 100 Accessibility, 100 Best Practices, 100 SEO; LCP 1.4 s, CLS 0, TBT 20 ms.

## Run or publish

```sh
npm ci
npm test
npm run typecheck
npm run build
npm run test:browser
npm pack
```

Install the matching Playwright browser first if needed: `npx playwright install chromium`.

Deploy `dist/site/` for the static lab. `npm pack` produces the ready-to-publish package; registry publication is owned by the factory and was not performed.

## Known low-severity deployment gaps

- Live hashed assets use `Cache-Control: public, must-revalidate, max-age=30`, not immutable long-lived caching.
- CSP and Permissions-Policy are absent. HSTS, Referrer-Policy, and `X-Content-Type-Options: nosniff` are present; no cookies are set.

These are static-host configuration follow-ups, not blockers for this candidate. Full evidence is in `.factory/verification-2.md`.
