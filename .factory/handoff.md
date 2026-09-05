# Stroke Lab review handoff — FAIL

**Work order:** `pen-latency-lab-review-1`
**Implementation candidate:** `5c8ff577f3ce86db8c69eaba5a6713f742c1171b`
**Documentation commit:** `1ae2cfe3921f5c8908a0b406d4d5aa0e3715680a`
**Live URL:** <https://pen-latency-lab.sociobot.in/>

## Result

**FAIL — 5 findings and 12 untested public claims.** No product code was changed in this review. The live root HTML and emitted JS/CSS exactly match the implementation candidate; the newer commits are report-only.

The library and ordinary lab path are healthy: clean install, unit tests (6/6), types, build, pack checks, clean ESM/CJS consumer use, live desktop/mobile browser paths, default-export privacy, offline reload, and serious/critical axe checks passed.

The product remains blocked on required product-contract work:

- no `/demo` sample-data sandbox, persistent demo label, reset/leave controls, or `.factory/demo.md`;
- no `.factory/claims.json`, hence no required claim tests for 12 public claims;
- first screen lacks the required plain-language job/audience/sample action, and no copy audit exists;
- `/404` and `/demo` fall back to the landing page; sitemap, static host configuration, canonical/social/touch metadata are absent; and
- the earlier CSP, Permissions-Policy, and immutable-cache gaps remain open.

## How to verify

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

`npm pack` remains the ready-to-publish artifact command; publishing is factory-owned and was not performed.

## Next steps

Address the demo and claims manifest first, then complete site structure/metadata/404 and response policies. Full reproducible evidence and every finding are in `.factory/review-1.md`.
