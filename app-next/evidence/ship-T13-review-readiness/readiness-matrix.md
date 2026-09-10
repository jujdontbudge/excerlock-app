# T13 concrete review-readiness result — 2026-09-10

This audit is local-only. **The app is not demonstrated ready to submit.** A source/config check is not evidence of App Store Connect state, distribution approval, a signed archive, device behavior, or URL availability.

| Checklist area | Verified evidence | Missing / blocking evidence |
|---|---|---|
| A capabilities | Existing generated-project guardrail specifies main + four extensions and exact entitlement subsets; `verify-binary.sh` checks signed payloads. | Family Controls **distribution approval** record for all five bundle IDs; exported release IPA and codesign/provision dumps; archive warning/private-API report. Assigned entitlements do not prove approval. |
| B purchases | Source has Adapty purchase/restore integration and privacy disclosure maps purchase history. | Paid Apps Agreement/banking/tax; all six products' state/localizations/review screenshots; attachment to version; fresh-install physical-device sandbox purchase/restore evidence; final paywall/legal-link capture. |
| C privacy | Manifest semantic audit passes; PostHog is opt-in, identified, GeoIP-off and property-scrubbed; Sentry removes user/request/free text. Draft label mapping is in `privacy/README.md`. | Verify final ASC nutrition labels; physical account deletion/export for anonymous and signed-in users. Server deletion docs explicitly say live downstream erasure credentials/evidence are unavailable. Permission-copy and ≤3-tap evidence need release captures. |
| D reviewer path | Exact draft Notes are in `docs/asc/review-notes.md`; `supportsTablet:false` is configured. | Runtime evidence that exact `App Review` name creates today's 20-step preset in the **release** build; denied/no-selection/offline captures; dev-route/test-button scan and physical-device completion. Draft Notes explicitly cannot substitute for implementation. |
| E metadata | Local privacy policy exists at `site/privacy.html`. | Live support/privacy URL HTTP checks, working fresh-install support form, final description/keywords, and screenshots captured from release build. |
| F stability | Sentry is configured crash-only with release/dist metadata. | T14 device pass, zero-crash evidence, release-build Sentry receipt, T15 cold-start/TTI evidence. |
| G submission | Existing binary verifier covers signed manifests when supplied a Payload. | App Store build/version/channel evidence; public-build post-approval verification. No submission action was authorized. |

## Corrections made

The former manifest said Product Interaction was unlinked while PostHog calls `identify(canonical Supabase user ID)`. It is now linked. User ID now includes Analytics purpose as well as App Functionality. Local-only coordinates, HealthKit/motion samples and steps remain outside collected-data declarations because no outgoing flow was found; the coarse `walk_places` preference is documented separately.
