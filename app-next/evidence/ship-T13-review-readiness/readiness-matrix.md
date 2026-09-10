# T13 concrete review-readiness result — 2026-09-10

This audit is local-only. **The app is not demonstrated ready to submit.** A source/config check is not evidence of App Store Connect state, distribution approval, a signed archive, device behavior, or URL availability.

| Checklist area | Verified evidence | Missing / blocking evidence |
|---|---|---|
| A capabilities | Root's authoritative portal audit records Family Controls distribution approval for all five bundle IDs. Existing guardrail specifies exact entitlement subsets. | Exported release IPA and codesign/provision dumps; archive warning/private-API report. Portal approval does not prove the binary was signed correctly. |
| B purchases | Root's web audit records agreements, banking, W-9 and DSA active. Live ASC API recheck found all six intended products, localized versions and exact US prices. | All six remain `MISSING_METADATA` because every review-image relationship is empty; attachment to version; fresh-install physical-device sandbox purchase/restore; final paywall/legal-link capture. |
| C privacy | Manifest semantic audit passes; PostHog is opt-in, identified, GeoIP-off and property-scrubbed; Sentry removes user/request/free text. Draft label mapping is in `privacy/README.md`. | Verify final ASC nutrition labels; physical account deletion/export for anonymous and signed-in users. Server deletion docs explicitly say live downstream erasure credentials/evidence are unavailable. Permission-copy and ≤3-tap evidence need release captures. |
| D reviewer path | Exact draft Notes are in `docs/asc/review-notes.md`; `supportsTablet:false` is configured. | Runtime evidence that exact `App Review` name creates today's 20-step preset in the **release** build; denied/no-selection/offline captures; dev-route/test-button scan and physical-device completion. Draft Notes explicitly cannot substitute for implementation. |
| E metadata | `excerlock.com/privacy`, `/terms`, `/support` return HTML 200; live API `/v1/health` and `/v1/ready` return 200. | ASC still points privacy/support/marketing at the old GitHub Pages site; description falsely says “No account. No server”; zero App Store screenshots; fresh-install support-mail action still needs device proof. AASA returns 200 but `paths: []`, which authorizes no routes. |
| F stability | Sentry is configured crash-only with release/dist metadata. | T14 device pass, zero-crash evidence, release-build Sentry receipt, T15 cold-start/TTI evidence. |
| G submission | Existing binary verifier covers signed manifests when supplied a Payload. | App Store build/version/channel evidence; public-build post-approval verification. No submission action was authorized. |

## Corrections made

The former manifest said Product Interaction was unlinked while PostHog calls `identify(canonical Supabase user ID)`. It is now linked. User ID now includes Analytics purpose as well as App Functionality. Local-only coordinates, HealthKit/motion samples and steps remain outside collected-data declarations because no outgoing flow was found; the coarse `walk_places` preference is documented separately.
