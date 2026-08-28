# Stroke Lab verifier handoff — FAIL

**Candidate:** `dcbdd610c52ea3bf64b3579d7b51fdba29e83ea3`
**Live URL:** https://pen-latency-lab.sociobot.in/
**Verified:** 28 August 2026 UTC

## Result

**FAIL — medium-severity public API validation defect.** `setSmoothingWindow(NaN | Infinity)` and non-finite `renderDelaysMs` are accepted, then `exportIssueBundle()` serializes declared numeric fields as JSON `null`. This can yield invalid/non-reproducible issue bundles for library consumers. Product source was not modified by verification.

See [.factory/verification.md](verification.md) for exact reproduction, full evidence, and the complete test matrix.

## Verified passing

- Clean `npm ci`, `npm test` (4/4), `npm run typecheck`, and exact `npm run build`.
- Package tarball (9.1 kB) installed and exercised in a clean ESM, CommonJS, and TypeScript consumer.
- Local and live desktop/390px end-to-end lab paths, privacy-default and opt-in exports, keyboard, recovery paths, reduced motion, offline reload, and service-worker update.
- axe serious/critical: 0; console/page errors: 0; third-party runtime requests: 0.
- Lighthouse mobile: Performance 99, Accessibility 100, Best Practices 100, SEO 100; LCP 1.9 s, CLS 0, TBT 20 ms.
- Live root, JS, CSS, legal pages, service worker, manifest, and hero asset byte-match the fresh candidate build.

## Fix before release

Validate all public numeric inputs with `Number.isFinite`; reject, clamp, or filter `NaN`/`Infinity`, preserve only finite values in summaries, and add regression tests for non-finite smoothing, delay, timestamp, and external sample inputs. Rebuild and request re-verification.

## Notes

The live response uses HSTS, strict referrer policy, and nosniff. Hashed assets are cached for only 30 seconds rather than immutable long-term, and CSP/Permissions-Policy are absent; record these as deployment hardening follow-ups.
