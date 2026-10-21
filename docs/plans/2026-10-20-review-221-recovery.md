# Build 22 App Review sign-in recovery

Worker: `t3/sign-in-review-dead-end`, based on `02655c7e`. Investigation date: October 20 America/Chicago / October 21 UTC. Submission: `efab67e3-06ff-4950-9aab-fade99ade95f`, ExcerLock 1.0.2 (22), runtime 7.

Implementation and local verification address two reproducible subscription-verification defects. **The initiating failure on Apple's devices remains unproven.** No production write, dashboard edit, release, submission or message was performed. The live review notes were read only; the replacement notes and reply are owner drafts.

## What is proven

Apple's screenshot is the verification-error state of `app-next/app/sign-in.tsx`, rather than a native Apple authorization error. The lead's read-only Supabase evidence establishes successful Apple authentication on both review accounts, linked to their original anonymous UIDs. Neither account has an environment-stamped subscription mirror. Both services were ready when inspected, but that does not establish request arrival or connectivity during review. The old Journey catch omitted Sentry and analytics, and request logs are unavailable.

Two independent paths reproduce this error after successful authentication:

1. At baseline `02655c7e`, `runtime/createClientServices.ts:43` starts one environment read. Lines 88–103 bind `unavailableSubscriptionAdmission()` permanently when that read resolves null. Subsequent checks never call StoreKit or the API again. The minimized diagnostic recorded **one native read, zero requests and unavailable on every retry**, including when its next native response would have been Sandbox. A null result includes timeout, thrown/unverified AppTransaction and Xcode. The native wrapper's eight-second deadline is in `app-next/modules/excerlock-store-environment/index.ts:11`; the Swift module returns nil for unverified/unknown/error outcomes. This is a proven persistent-failure defect; no evidence establishes that Apple's particular read returned null.
2. With a correct Sandbox lane and HTTP 200, an account without a complimentary grant or current subscription observation gets `authorization.status: unknown`. See `server/src/packages/subscriptions/lib/repository.ts:20`, and `resync.ts:61` and `:73` in that directory. Fetching an Adapty profile does not manufacture an environment-stamped subscription observation. The original `ServerSubscriptionAdmission` converts unknown into unavailable; baseline `journey/index.ts:128` throws and its catch at line 138 always enters the same error state. Replaying this exact 200 response through the baseline adapter and Journey produces `phase: verifying`, null admission and the screenshot's error. The local real API reproduces unknown with no subscription row. This is a proven fresh-account policy defect and consistent with both review accounts; request arrival during Apple's session is still unknown.

Ignored evidence: `.excer/review-221/diagnosis-before.json`, `baseline-unknown.json`, and `.excer/proof/account/2026-10-21_02-54-15/`. The latter is the red simulator regression for successful Apple sign-in followed by unavailable verification. The baseline StoreKit-null, StoreKit-timeout, HTTP-timeout and offline captures are respectively `02-56-26`, `02-57-47`, `02-59-26` and `03-00-25` under the same October 21 account proof root. The first server-error simulator attempt (`02-58-54`) omitted the Sign in action and is **invalid evidence**; the baseline adapter diagnostic covers HTTP 503 instead.

## Hypotheses and limits

| Candidate | Finding |
|---|---|
| Null/slow StoreKit environment at launch | Exact dead end reproduced, including permanently ineffective retry. Consistent, not established on review devices. |
| Correct Sandbox lane, fresh account has no subscription row | Real API returns unknown; baseline adapter/Journey reproduces exact error. Independent sufficient cause. Request arrival during review remains unknown. |
| HTTP error, timeout or offline | Each reproduces the original error. Ready services later do not rule out these causes at review time. |
| Identity readiness failure or timeout | Baseline diagnostic reaches the same error without an admission request. Retry formerly waited without restarting the failed identity setup. Review readiness is unknown. |
| Identity generation changes or anonymous identity | Baseline diagnostic reaches the error. The fix still refuses admission for a changed or anonymous account. Successful Apple auth rules out a complete failure to authenticate as the sole explanation, not a later generation race. |
| Incomplete purchase recovery/restore | Baseline diagnostic reaches the error and blocks checkout. No review purchase evidence establishes this path. Conservative recovery is retained. |
| Wrong account or store environment | Never admits. Correct verified Sandbox selects `/testflight`; Production selects the root API. No fallback guesses a lane. No evidence of a wrong-lane request from review. |
| Apple `ERR_REQUEST_UNKNOWN` on iOS 27 | A separate pre-token error from the earlier incident. It cannot explain the successful-authentication verification state by itself. Native cause is unproven; simulator injection verifies recovery only. |
| iPad/iOS 27-specific client layout or code branch | No such causal branch found in admission. iPad layout is verified below on iOS 26.4. No physical iOS 27 environment was available. |

The initial historical hypothesis was incorrect: build 21 already required sign-in. Its signed source is `81a9f623` ([release record](../releases/2026-10-15-appstore-1.0.1-build21-resubmission.md)); `app-next/app/sign-in.tsx:37` already passes `signInRequired={true}`. Build 22's recorded source/OTA `2aae3a1f` retains it at line 46 ([release record](../releases/2026-10-18-appstore-1.0.2-build22-submission.md)). Build 22 adds Welcome sign-in presentation, not the original requirement. Different reviewer paths or external timing could expose a pre-existing defect; approval of build 21 does not distinguish those explanations.

## Implemented policy and boundaries

[ADR 0087](../adr/0087-recoverable-subscription-verification.md) changes unavailable verification navigation and retry, preserving ADR 0086's purchase ownership and account selection.

- `subscription/ResolvingSubscriptionAdmission.ts` warms the backend lookup and shares concurrent resolution. Each check has at most two eight-second attempts with a 250 ms pause; only a verified success is cached. A failed check can resolve again on Try again. The runtime's shared native reader clears unknown results instead of retaining them as its only observation.
- `journey/index.ts:90` waits for recovery hydration and restarts identity readiness. An unavailable check for the same successfully signed-in account with no recovery opens the Paywall with **no admission**. A known empty Entitlement without remembered access may buy; prior/unknown access instead requires verification or restore before checkout. A pending purchase remains recovery and cannot start another purchase. Only independently verified eligible admission clears it.
- The HTTP adapter bounds authentication context, optional Xcode transactions, request and response body together to 15 seconds. Aborting/invalidation fences late responses. Journey also fences a verification abandoned by explicit navigation. Wrong-account/environment responses never admit.
- The sign-in screen stays mounted during verification. Retry remains visible and uses a synchronous submit guard. Paywall retries stay on that screen. Each operation actually repeats the failed readiness, environment or API step rather than returning a permanently unavailable adapter.
- Sentry receives a synthetic bounded reason, without the original provider or HTTP payload. `subscription_verification_failed` contains only `reason_code`, stage, recovery kind and destination. No receipt, credentials, health, location, movement or Screen Time selection is added to diagnostics.
- Protected Keychain failures retry the same storage operation after foregrounding. Active failures have bounded retries and retain startup retry. They never mean an empty session or authorize anonymous replacement/deletion. Storage keys, chunk manifests and accessibility are unchanged.
- Paywall full price and billing period are prominent. The trial line leads with the full amount. Automatic renewal/cancellation terms precede checkout; legal links, Restore purchases, Account and help and Close remain available. Empty plan loading has Try again.

No server source, API contract, native source, dependency, entitlement, grant, persisted schema or sign-in provider policy changed. The CLI also maps iPhone compatibility accessibility coordinates into the iPad touch surface and measures centring within the letterboxed application viewport. Full screenshots are retained and measurement JSON records that viewport. This corrects the automation rather than changing the shipping tablet capability. The server smoke's obsolete vendor-error assertions now accept the existing account-bound unknown response introduced with complimentary-access checking; they continue asserting zero grants.

## App Review risk scan

| Area | Finding and handling |
|---|---|
| Fresh launch and sign-in | Fixed launch-long unavailable adapter, silent catch and blank verification interval. Identity setup is retried; navigation fences stale callbacks. Fresh Apple and email failure proofs continue to the Paywall without Home. |
| Returning subscriber and protected routes | Existing remembered-account admission retained. Paid cold launch and tabs pass. Unknown/mismatched proof now opens a retry-only Paywall rather than the sign-in dead end; checkout remains blocked when access is unknown or previously paid. |
| Paywall load failure | Retry, Account and help and Close remain available. Load failures never admit. Purchase/restore serialization remains in the adapter. |
| Restore or unfinished purchase | Existing transaction-specific recovery retained. Unavailable verification preserves the journal, offers retry/help and records zero new purchases. No target account's unrelated access clears another checkout. |
| Setup | Existing no-admission redirect and staged-plan commit retained. Permission failures expose retry/Not now; denied Screen Time asks again under ADR 0085. Empty render during a completed route transition is transient, not a new unbounded wait. iPad Setup checked below. |
| 5.1.1(v), mandatory account | **Unresolved owner decision.** On-device Conditions/Enforcement do not inherently require login; subscription recovery alone is not an established guideline justification. Making provider sign-in optional safely requires independently verified anonymous paid admission, changes to remembered identity and account isolation, and physical purchase/restore verification. This incident patch does not bypass those controls. Recommend that separate policy change before representing this risk as fixed. |
| Review-note mismatch | Live notes read with `asc review details-get --id 3752d42c-6ee1-40da-ac4c-2d55b2f7d0e7` still say “Skip for now” and anonymous use. Repository owner draft now says sign-in is mandatory for Setup/Home, and distinguishes patched JavaScript from embedded build 22. Owner must update App Store Connect after choosing delivery/policy. |
| Apple unknown error, iOS 27.0.1 | Prior `02655c7e` fix keeps the account and offers email/new manual retry; cancellation stays silent. Replayed unknown → cancel → success with the real auth adapter. No native workaround or automatic provider retry added. Physical AuthenticationServices logs and signed-artifact check remain blocked. |
| Keychain while locked/backgrounded | Sentry `EXCERLOCK-MOBILE-V` / issue `7749344344`, 17 events, latest `2026-10-21T02:05:18Z`, release `1.0.1+21` runtime 6. Added lifecycle-aware protected-storage retries. Diagnostic confirms no anonymous request, storage write or deletion while locked, same UID on unlock, and recoverable foreground failure. |
| iPad Air 11-inch | Separate hidden worker iPad on iOS 26.4 checks sign-in, Paywall disclosures and post-purchase Setup. The shipping binary has `supportsTablet: false` (`app-next/config/native.ts:111`), so this is iOS's iPhone compatibility presentation on iPad, not a new native tablet layout. Screens share the scrolling shell; evidence below. iOS 27 hardware behavior is not inferred from this. |
| 3.1.2 disclosures | Added prominent full price/period, benefit label and renewal/cancellation wording; preserved localized StoreKit prices and trial eligibility, Restore purchases and both legal links. Scroll proof captures the actual disclosures. StoreKit's real localized products/trial eligibility remain physical-device checks. |
| 2.3.1, reviewer preset and Filming mode | Reviewer name is an ordinary editable 20-step Condition, no account/purchase bypass. Fast walking detection already applies to all accounts. Draft notes correct Filming mode's obsolete detector claim and disclose owner-only Showcase displays, sample Points/Bank time and the fact that Shop purchases can add real Bank time. Owner must publish accurate notes; hiding that behavior would be incorrect. |

The scan inspected the launch/runtime fallback, setup/permission transitions, purchase journal, SDK serialization, recovery route, paywall and sign-in paths. It is not proof that all native failures or external services are impossible. Existing startup runtime errors retain the visible retry/restart fallback. Simulator evidence uses scripted providers and StoreKit boundaries, with a separate real local API check.

## Verification

`npm ci` ran before investigation. No repository tests were added (ARCHITECTURE rule 7). The red/green loop uses committed feature proof blocks and ignored diagnostic harnesses around real adapters/Journey.

- Static: `.excer/review-221/check-final.txt`, 23 checks passed.
- Diagnostic matrix: `.excer/review-221/verification-matrix.json`, **63 assertions passed**. Covers the failure matrix, auth-context/body deadlines, lane selection, cached-success/unknown-retry, navigation races locked-Keychain behavior, and matching reason-only Sentry/analytics captures. Deadlines are accelerated only in this ignored harness; simulator StoreKit/HTTP timeout proofs use real production deadlines.
- Baseline unknown replay: `.excer/review-221/baseline-unknown.json`, HTTP 200 unknown → unavailable/verifying with no admission, using `02655c7e` Journey and HTTP adapter.
- Local API/Postgres smoke: `.excer/review-221/server-smoke-final.txt`, passed. Real Fastify/Postgres with stubbed vendors; unknown/paid environment partition, grants, webhooks, deletion and DB effects asserted. The first smoke exposed outdated unknown-response expectations; only those assertions changed.
- Real client/API integration: `.excer/review-221/local-admission.txt`, `local-admission-results.json`, `server-ready.txt`. Explicit `./excer server ready --url http://127.0.0.1:43950` returned 200. A real canonical users row persisted with zero paid mirrors/grants after unknown verification. Unknown with pending checkout preserved recovery. A scripted Sandbox webhook wrote the DB mirror; the real client independently admitted the selected account and cleared its recovery. Wrong environment was refused. JWT is a locally signed fixture and the webhook is scripted, not vendor proof. Owned API/DB were stopped and removed.

The following **23 focused simulator cases passed**, each individually with a five-minute outer deadline. No full feature suite was run. Both worker simulators use Metro 8095 sequentially, the existing runtime 7 binary and seeded simulated location. Simulator.app stays closed. T3's device panel could not open devices in the hidden worker set; headless `./excer` supplies screenshots and accessibility evidence instead. Every evidence directory below is relative to this worktree and includes `result.json`, accessibility labels and screenshots; the three iPad cases also record the measured compatibility viewport.

| Device | Proof | Evidence directory |
|---|---|---|
| iPhone 17 Pro | `account/fresh-apple-unavailable-reaches-paywall` | `.excer/proof/account/2026-10-21_03-33-48` |
| iPhone | `account/fresh-email-unavailable-reaches-paywall` | `.excer/proof/account/2026-10-21_03-09-42` |
| iPhone | `account/fresh-store-null-reaches-paywall` | `.excer/proof/account/2026-10-21_03-11-07` |
| iPhone | `account/fresh-store-timeout-reaches-paywall` | `.excer/proof/account/2026-10-21_03-11-41` |
| iPhone | `account/fresh-server-error-reaches-paywall` | `.excer/proof/account/2026-10-21_03-12-26` |
| iPhone | `account/fresh-server-timeout-reaches-paywall` | `.excer/proof/account/2026-10-21_03-12-56` |
| iPhone | `account/fresh-offline-reaches-paywall` | `.excer/proof/account/2026-10-21_03-13-38` |
| iPhone | `account/store-environment-recovers-on-retry` | `.excer/proof/account/2026-10-21_03-23-00` |
| iPhone | `account/admission-recovers-on-retry` | `.excer/proof/account/2026-10-21_03-18-15` |
| iPhone | `account/pending-unavailable-blocks-checkout` | `.excer/proof/account/2026-10-21_03-21-04` |
| iPhone | `account/apple-unknown-cancel-retry-stays-on-signin` | `.excer/proof/account/2026-10-21_03-14-06` |
| iPhone | `launch/first-launch-welcome` (ship) | `.excer/proof/launch/2026-10-21_03-14-53` |
| iPhone | `launch/subscriber-opens-home` (ship, cold relaunch) | `.excer/proof/launch/2026-10-21_03-15-14` |
| iPhone | `launch/every-tab-opens` (ship) | `.excer/proof/launch/2026-10-21_03-15-45` |
| iPhone | `launch/wrong-account-proof-fails-closed` | `.excer/proof/launch/2026-10-21_03-25-03` |
| iPhone | `launch/wrong-environment-proof-fails-closed` | `.excer/proof/launch/2026-10-21_03-25-40` |
| iPhone | `launch/unavailable-proof-fails-closed` | `.excer/proof/launch/2026-10-21_03-26-12` |
| iPhone | `launch/unavailable-proof-recovery-access` | `.excer/proof/launch/2026-10-21_03-26-43` |
| iPhone | `paywall/billing-disclosures` | `.excer/proof/paywall/2026-10-21_03-23-41` |
| iPhone | `paywall/offer-fallback-outage-keeps-retry` | `.excer/proof/paywall/2026-10-21_03-24-03` |
| iPad Air 11-inch M3 | `account/sign-in-layout` | `.excer/proof/account/2026-10-21_03-32-14` |
| iPad | `paywall/billing-disclosures` | `.excer/proof/paywall/2026-10-21_03-32-40` |
| iPad | `setup/post-purchase-setup-layout` | `.excer/proof/setup/2026-10-21_03-33-07` |

Store retry evidence includes two unsuccessful launch lookups, two unsuccessful verification lookups, then a fifth verified Sandbox lookup on Try again. The eventual request goes to `/testflight/v1/subscription/resync` and only its eligible response admits Home. Pending recovery evidence records an unchanged `accountConnection` journal and **Purchase operations 0** after repeated checks. The email proof uses a scripted six-digit code; the separate local integration uses a real API/DB but fixture JWT and vendor webhook. Neither is real Apple authorization or a StoreKit purchase.

Earlier failed runs are retained rather than presented as passes: partial `idb` email typing (`03-05-45`, corrected to assert the complete address), buttons below the first viewport after moving disclosures before checkout (`03-17-12`, `03-19-31`, corrected to record a scroll), and an unauthorized direct Paywall deep link (`paywall/03-21-46`, correctly returned Welcome; corrected to use the sample onboarding path). Initial iPad starts failed on Expo's off-screen developer introduction; it was expanded, Continue tapped and the menu closed. The CLI now maps compatibility coordinates correctly. The final iPad proofs and a subsequent iPhone control-path proof pass. These are fixture/tooling failures, not hidden successful device checks. No proof hit its five-minute deadline.

Physical iOS 27 authorization and real StoreKit/environment/ownership-transfer checks are **blocked**, not passed. No signed physical device, historical AuthenticationServices logs or real Sandbox purchase was available. iOS 26.4 simulation does not establish those vendor or OS-specific behaviors.

Final evidence audit: `.excer/review-221/proof-index.json` checks all 23 referenced result files; `installed-runtime.json` confirms runtime **7** on both installed apps after the proofs. Owned Metro, API and database services are stopped; both hidden worker simulators are shut down/deleted and their companions stopped. `.excer/review-221/cleanup.txt` records cleanup. Lead and other worker devices/ports were untouched.

## Delivery and owner actions

This patch is JavaScript-only and uses the existing runtime-7 native surface. It can target build 22 by a runtime-7 OTA without a new native build. No OTA was published. Runtime 4/5/6 installations do not receive runtime-7 updates; their related verification/Keychain paths need separately verified compatible backports. This worktree does not contain those backports.

Before claiming the review-device incident fully resolved, use a signed physical iOS 27 device for new/existing Apple authorization, Sandbox AppTransaction environment, purchase → sign-in → restore → independent admission → force-quit/relaunch, and a Production purchase check in the proper lane. The underlying native Apple unknown error remains unproven. A native correction, if later established necessary, would require a new build.

The owner must choose delivery and the 5.1.1(v) policy, update App Store Connect review notes, approve any reply, and decide whether a new review build is preferable to a JavaScript update. [Review notes](../asc/review-notes.md) and the [reply draft](../asc/2026-10-20-review-221-reply-draft.md) are not sent. Their claims must be rechecked against the exact delivered artifact.
