# StoreKit cancellation investigation — 21 October 2026

Seven `user_cancelled` events do not identify why Apple closed checkout. The native reproduction proves that a real dismissal, cancellation of Ask Permission, and an injected StoreKit cancellation all produce that same Adapty result. It also proves a client defect: a cancelled checkout loses its recovery association, so an independently delivered later transaction updates Entitlement but leaves Buy on the Paywall. It does not prove any of the three incident users was charged or experienced that late-success defect.

## Environment and exact code

All work used branch `t3/reproduce-storekit-cancellations`, starting main `a4a354d3e97a351b0a8034ea0be006901af49f59`. Headless worker `ExcerLock-storekit-repro`, hidden simulator set `~/.local/share/excer/worker-simulators`, UDID `FABEE6F4-A025-4E1D-9C9C-5696A6C604BD`, Metro 8096. Simulator.app stayed closed. The Device panel did not discover this hidden simulator; no lead device or port was used.

Available runtime: iOS 26.4, Xcode 26.4.1. Neither incident iOS 26.6.2 nor 27.0.1 was installed. The reused native app was `/Users/johansardar/ExcerLock-worktrees/pay-integration/app-next/build/ExcerLock.app`, native app 1.0.1 build 21/runtime 7 (the dev manifest reports current app 1.0.2), with Adapty iOS 4.0.2. This is not the incident's build 17/runtime 4 binary.

A small Xcode-built development launcher loads the cached app's `ExcerLock.debug.dylib`. It supplies simulator development and Octane entitlements. An injected native Swift dylib creates `SKTestSession(contentsOf:)` from an ignored fixture copied into Documents. It records native `Product.purchase(confirmIn:)` results and `Transaction.updates`. This runs Apple's real Xcode StoreKit purchase sheet; no purchase result in these runs was supplied by a JavaScript fake. Earlier Apple Account prompts from experiments without valid Octane entitlements are excluded from the findings. Slimming disabled required StoreKit services, so this worker was returned to stock before valid runs.

The local fixture is based on `app-next/ios/storekit/ExcerLock.storekit`: annual $59.99/year and monthly $9.99/month, each with a one-week trial. The original fixture lacked `.a.annual.notrial`; a no-trial annual clone was added only to `.excer/storekit/ExcerLock.storekit`. Local fixture prices are not evidence of incident storefront prices or eligibility.

The dev harness uses the real native Adapty SDK with a synthetic customer ID. Auth, analytics and API admission stay local fakes; no real Supabase account is created. Current Adapty flow metadata serves `premium.annual.3999.t3`, so the ignored harness overrides product metadata/IDs and remote offer metadata to select the requested historical SKUs. `makePurchase` and restore still call real Adapty and StoreKit. This establishes SDK result handling against Xcode products, not live placement correctness or production product configuration.

Two checkout lanes were run:

- **Main baseline:** main subscription adapter and Paywall result handler at `a4a354d3`; the added attempt-storage class is present but unused by the baseline adapter.
- **Historical equivalent:** exact `purchase()` method and Paywall `purchase` handler from `48084fec`, inside the current UI/identity/admission shell and native binary. The adapter's old `attachIntegration` call is renamed to the current `attachIntegrationBestEffort` method. That integration succeeded in the runs. Restore and profile publishing retain current main interfaces; their existing late-profile journal-confirm behavior matches the old cancellation behavior. This is not the full historical bundle or its trial-toggle UI. Screenshots show the current visual shell; the incident handler source independently confirms the same silent cancellation and existing pending/error feedback.

Exact source snapshots, historical patches and served bundles are under `.excer/storekit/`. Main v2 bundle SHA-256: `4944f232dd313f830395f28c8a64f2eb38569c884525295f2dd9ad588c29fc6d`. Historical equivalent v2 (adds sanitized SDK lifecycle logging): `a574c59d3181fd371cdeb78d42c546ef71cf14f3439e5a92d6ed48884eb227d9`. Both lack `recoverLateStorePurchase`. Metadata: `main-v2-bundle.json`, `historical-equivalent-v2-bundle.json`. Native binding: `octane-host-storekitd.log`.

## Observed native and JS results

Raw native calls use the same binary, simulator and fixture independently of the JS checkout lane. The full ledger is `.excer/storekit/matrix.ndjson`; screenshots are `/tmp/excer-media/storekit/`. A screenshot prefix below names `-sheet.png` and `-after.png` files unless otherwise stated.

| Condition | Raw StoreKit | Adapty JS | Main and historical handler feedback |
| --- | --- | --- | --- |
| Dismiss sheet, all three products | `.userCancelled` | `user_cancelled` | Silent; Buy becomes available again |
| Buy immediately after cancel, all three products | Real sheet opens again | `user_cancelled` on next dismissal | Silent; no recovery journal blocks retry |
| `interruptedPurchasesEnabled` then Subscribe | `.pending` | `pending` | Existing “Waiting for approval” notice |
| Resolve interrupted transaction | Verified `Transaction.updates`, environment `Xcode` | Paid profile callback | Existing “Sign in to continue”; no automatic admission |
| Ask to Buy → Ask | `.pending` | `pending` | Existing “Waiting for approval” notice |
| Approve deferred Ask to Buy | Verified `Transaction.updates`, environment `Xcode` | Paid profile callback | Existing “Sign in to continue”; no automatic admission |
| Ask Permission → Cancel | `.userCancelled` | `user_cancelled` | Silent return to Paywall |
| Cancel, then inject a later successful transaction with `SKTestSession.buyProduct` | Initial `.userCancelled`, later verified transaction update | Initial `user_cancelled`, later paid profile | Buy remains; recovery action absent |

The last row deliberately injects an independent later native transaction after a genuine cancellation. It reproduces the client response to that sequence, not an Apple billing-remediation flow or an iOS bug that spontaneously succeeds after cancellation. Xcode's interrupted-purchase mode returned pending here, not cancelled. No real card, Apple Account remediation or biometric authorization was involved.

All supported `SKTestFailures.Purchase` cases were exercised through a real sheet on the trial annual product. Product comparison covers real dismissal and retry on trial annual, no-trial annual and monthly; this is not a full Cartesian matrix of every error and product:

| Injected failure | Observed raw StoreKit result/error | Observed Adapty JS |
| --- | --- | --- |
| generic `userCancelled` | `.userCancelled` | `user_cancelled` |
| generic `notAvailableInStorefront` | `StoreKitError.notAvailableInStorefront`, code 4 | throws 1006 `productPurchaseFailed` |
| generic `notEntitled` | `StoreKitError.notEntitled`, code 5 | throws 1006 |
| generic `networkError` | `StoreKitError.networkError`, code 0 | throws 1006 |
| generic `systemError` | `StoreKitError.systemError`, code 1 | throws 1006 |
| generic `unknown` | `StoreKitError.unknown`, code 2 | throws 1006 |
| purchase `purchaseNotAllowed` | `Product.PurchaseError.purchaseNotAllowed`, code 2 | throws 1006 |
| purchase `productUnavailable` | `Product.PurchaseError.productUnavailable`, code 1 | throws 1006 |
| purchase `ineligibleForOffer` | `StoreKitError.unknown`, code 2 | throws 1006 |
| purchase `invalidOfferIdentifier` | `StoreKitError.unknown`, code 2 | throws 1006 |
| purchase `invalidOfferSignature` | `StoreKitError.unknown`, code 2 | throws 1006 |
| purchase `missingOfferParameters` | `StoreKitError.unknown`, code 2 | throws 1006 |
| purchase `invalidOfferPrice` | `StoreKitError.unknown`, code 2 | throws 1006 |
| purchase `invalidQuantity` | `StoreKitError.unknown`, code 2 | throws 1006 |

For non-cancellation failures the app shows its existing “That didn't go through. Please try again.” notice. Evidence prefixes: `main-failure-<error>`, `raw-failure-<error>`, and `historical-failure-<error>`. Offer injections returning unknown are recorded as observed, not renamed to the requested error. Legacy `failTransactionsEnabled` and `failureError` are deprecated as “No longer supported” since iOS 17; they cannot establish real payment-invalid/declined behavior on this runtime.

Clean Ask to Buy evidence is `main-clean-ask-*` and `main-v2-ask-cancel-*`. Exclude the earlier `main-ask` sequence: approval was issued before tapping Ask. Main interruption evidence is `main-interrupt-*`. Cancellation/product/retry evidence is `main-v2-cancel-<suffix>` and `main-v2-rapid-retry-<suffix>`. Direct native evidence is `raw-*`. The initial no-trial attempts that timed out before checkout were harness setup failures, not StoreKit failures; the completed v2 runs supersede them.

## Incident interpretation

| User | Recreated condition matching the event pattern | Evidence | Strength |
| --- | --- | --- | --- |
| `a69f42dc…` | Trial annual dismissal, then a second Buy shortly after cancellation; longer human dwell also permits a 13-second dismissal | `main-v2-cancel-annual-*`, `main-v2-rapid-retry-annual-*`, historical annual equivalents | **Consistent only.** Dismissal was reproduced; their intent and initiating StoreKit condition were not observed |
| `292f3ba9…` | No-trial annual dismissal/retry and monthly dismissal/retry, each with silent return to the Paywall | `main-v2-cancel-annual.notrial-*`, `main-v2-rapid-retry-annual.notrial-*`, `main-v2-cancel-monthly-*`, historical equivalents | **Consistent only.** Changing price/plan does not prove a declined card, product failure or deliberate cancellation |
| `7e4fe984…` | Trial annual dismissal (the incident subsequently left the Paywall); Ask Permission cancellation is another observed source of the same result | `main-v2-cancel-annual-*`, `main-v2-ask-cancel-*`, historical equivalents | **Consistent only.** Empty Restore and backwards navigation do not reveal why the Apple sheet ended |

Automated sheet dismissals completed in about 2.2–2.3 seconds on main; immediate retry purchase starts were roughly 1.2–1.3 seconds after cancellation. Timing includes our chosen tap delay and is not a classifier. Ask Permission cancellation took about 4.1 seconds. Failed native/Adapty purchases took roughly 3.2 seconds. Human authentication, deliberation and remediation can add arbitrary dwell time.

The supplied current $0/empty profiles contain no evidence of eventual purchase. Approval of the products today does not prove their incident-time storefront state. Face ID failures, unresolved billing/terms interruptions and OS-specific cancelled-then-success behavior remain hypotheses; the simulator did not establish any for these users. The Welcome reset is excluded as requested.

## Recovery proposal and verification

See ADR 0088. Keep a bounded, nonblocking account/product checkout hint after cancellation and pending. Match a later active App Store product for the currently identified account, reconstruct the existing recovery journal under the identity barrier, and continue through existing authentication and independently verified admission. Keep cancellation silent and permit a new checkout. Unrelated products and foreign accounts must not create recovery. Persist hints across relaunch, allow a retry of a different plan, and handle duplicate callbacks. An Xcode profile may contain active access-level product metadata with an empty subscription list; missing transaction metadata never authorizes cross-account transfer.

No cancellation help copy or new UI component is proposed. The existing recovery action becomes visible when a cancelled checkout completes later. Per the user's explicit visible-change rule, that adapter integration will remain an uncommitted, screenshotted proposal for owner approval; nonvisual storage support and proof scaffolding can be committed. The worktree contains the complete candidate for verification. It targets current runtime 7; runtime 4 requires a compatible backport.

Focused proof results, check logs, native candidate evidence and commit/cleanup status follow below.

## Limits and blocked work

- Exact build 17/runtime 4 native artifact and complete historical Paywall were not run. Historical checkout handlers were run inside the stated current shell.
- Incident iOS 26.6.2/27.0.1, physical Face ID failures, real missing/expired/declined payment methods, terms acceptance and the reported iOS 18 cancelled-then-success defect cannot be established with this Xcode simulator.
- Xcode interruption returned pending, so interrupted → cancelled → later success was not reproduced as one natural StoreKit flow.
- Production Adapty delivery/ownership, Sandbox Apple Account billing and independent production admission remain unverified. The task forbids dashboard/tester/config changes; none were made.
- Local fixture success establishes only local product purchase mechanics. No production StoreKit availability conclusion follows from it.

## Native candidate result

A clean app installation first returned an Adapty restore profile with no paid access and showed **No purchase found**: `/tmp/excer-media/storekit/candidate-empty-restore.png`. Exclude `historical-empty-restore.png`: that earlier attempt returned cached paid access from preceding Xcode purchases and did not recreate an empty subscriber.

The complete candidate then ran a real sheet cancellation from an unpaid profile. Adapty returned `user_cancelled` in 2.343 seconds and the settled Paywall still showed Continue. An independently injected native transaction subsequently appeared in `Transaction.updates`, environment Xcode. The real Adapty listener supplied `premium=true`, `accessStore=app_store`, `accessProduct=com.johansardar.excerlock.premium.a.annual`, and an empty subscription list. The candidate restored **Sign in to continue** without another Buy or Restore. Main and the historical equivalent remained on Continue for the same sequence.

Evidence:

- `/tmp/excer-media/storekit/candidate-real-cancel-sheet.png`
- `/tmp/excer-media/storekit/candidate-real-cancel-after.png`
- `/tmp/excer-media/storekit/candidate-real-late-success.png`
- `/tmp/excer-media/storekit/main-cancel-after-native-late-success.png`
- `/tmp/excer-media/storekit/historical-cancel-after-native-late-success.png`
- `.excer/storekit/candidate-native-evidence/native.ndjson` and `js.ndjson`
- `.excer/storekit/candidate-native-bundle.json`, SHA-256 `4776460453494e7c3de6f40b9b7e04c52f550c5b221ad11bf48254517d547214`

The SDK injection and metadata overrides were removed from tracked source before the final static check and scripted client proofs. Sanitized native and JS evidence from the two earlier app containers was saved to `before-isolated-app-reset/` and `before-candidate-reset/`. `evidence-index.json` names all logs and served bundles; `retry-gaps.json` records main's measured immediate retry gaps. Historical trial annual's properly immediate pair is `historical-annual-immediate-first-*` / `historical-annual-immediate-retry-*`.

## Harness notes for repeating a native case

The ignored `StoreKitDevelopmentHost.xcodeproj`, `host-project.yml`, `HostMain.m` and `host.entitlements` build the small launcher; `development-host/ExcerLock.app` combines it with the cached native app. `Repro.swift` / `Load.m` implement the temporary StoreKitTest controller; `compile.py` builds its injected dylib. Valid StoreKit sessions require the launcher’s embedded `get-task-allow` and `com.apple.appstored.octane` entitlements. The unentitled cached launcher alone showed an Apple Account prompt and was not a valid local test.

`IdentityLab.native-complete.ts` preserves the temporary real-SDK wiring for review. It is not the final tracked proof harness. `reload-native.py <evidence-name>` starts the isolated Metro with the dev SDK key supplied by the repository environment loader, captures a served bundle, then runs `launch.py`. No key value is written into this report. `launch.py` copies the fixture into the current app container, removes a stale command file, and launches with the injected dylib and XCTest framework paths. A normal demo cold relaunch drops that injection; rerun the native launcher before another StoreKitTest command.

`matrix.py` drives the sheet and records results, screenshots and accessibility labels. `control.py` sends `reset`, `interrupt`, `ask`, `failure`, `resolve`, `approve` and direct native `purchase` commands. `lateSuccess` uses `SKTestSession.buyProduct` to deliberately create the post-cancellation transaction. After loading a scenario, allow offer prefetch to finish before opening the Paywall. Each idb UI command must include the explicit worker UDID as well as its companion socket. These scripts have bounded command/result waits; focused client proofs additionally use a 300-second outer deadline.


## Focused client proof results

All eight changed proofs passed through the production subscription adapter, existing sign-in and independent admission interfaces with scripted vendor/auth/API adapters. They do not establish production server admission or vendor ownership transfer. Each command ran independently with a 300-second outer timeout; no full feature suite or cross-feature sweep was run.

| Proof | Result | Evidence directory |
| --- | --- | --- |
| `cancelled-late-store-success` | PASS | `.excer/proof/paywall/2026-10-22_03-27-26` |
| `pending-late-store-success` | PASS | `.excer/proof/paywall/2026-10-22_03-28-30` |
| `cancelled-retry-late-store-success` | PASS | `.excer/proof/paywall/2026-10-22_03-29-27` |
| `foreign-late-store-success-is-ignored` | PASS | `.excer/proof/paywall/2026-10-22_03-30-31` |
| `unrelated-late-store-success-is-ignored` | PASS | `.excer/proof/paywall/2026-10-22_03-31-22` |
| `cancelled-store-success-after-relaunch` | PASS | `.excer/proof/paywall/2026-10-22_03-32-11` |
| `offline-profile-late-store-success` | PASS | `.excer/proof/paywall/2026-10-22_03-33-00` |
| `pending-unrelated-store-success-is-ignored` | PASS | `.excer/proof/paywall/2026-10-22_03-35-03` |

The cancellation regression failed against the original adapter before the fix: `.excer/proof/paywall/2026-10-22_02-28-22/`. The captured old bundle lacks the recovery method and includes the new scenario: `regression-old-bundle.json`, SHA-256 `1ebc10d28d7429162dfb1b8de4481e75f814e0caaee216eaa28b4b76b9c91a30`. The final scripted proof bundle is `candidate-client-bundle.json`, SHA-256 `1d044039f969ace03966a5de2e3d949fb0de6a4dd423473030877cb1fd698427`; it contains the new recovery method and no temporary native harness wiring. Source hashes are recorded there.

Superseded proof attempts are retained: the first corrected implementation run expected one restore, but same-UID authentication correctly used zero; the initial final run hit a simulator location error before checkout (`2026-10-22_03-26-26`), corrected by supplying a simulator coordinate; the pending/unrelated proof initially expected Journey `paywall`, corrected to the intended `pendingPurchase` (`2026-10-22_03-33-46`). Only those failed proofs were rerun after their assertion/environment corrections.


## Static checks and commit boundary

`./excer check` passed all 23 checks with the full candidate (`check-complete.log`). It also passed all 23 checks with only the nonvisual adapter/storage support (`check-nonvisual.log`), and again after restoring the full candidate (`check-final-candidate.log`). The restored source hashes exactly match the files used by the eight passing client proofs. The working candidate lowers the detached-method ratchet from 55 to 54; that ratchet change stays with the uncommitted callback proposal.

Commit `235deffc4c102dfce99ec701e01b9ea6ebaafbb0` adds nonblocking account/product attempt persistence, purchase/error/admission cleanup wiring, the active-product helper, and proposed ADR 0088. It preserves existing visible checkout feedback. The full late-success fix is implemented in the worktree, but its profile-callback integration is deliberately uncommitted because it reveals the existing recovery action. Its remaining adapter and ratchet diff is `.excer/storekit/recovery-visible-candidate.patch`, based on that support commit. Owner approval is required before committing this visible proposal. No cancellation help text, new screen or automatic navigation was added.

The native and scripted evidence validate the complete uncommitted candidate, not a claim that the support commit alone fixes late-success admission. All commits stay on `t3/reproduce-storekit-cancellations`; nothing is pushed, merged, published, deployed or changed in a dashboard.


## Cleanup

The worker simulator was shut down and deleted, and its absence was independently confirmed in the hidden simulator set. Metro port 8096 is closed and no companion for this worker remains. The cleanup wrapper exited 143 after its process filter also matched its own shell; the subsequent independent device, companion and port checks all passed. Evidence is preserved in `.excer/storekit/` and `/tmp/excer-media/storekit/`, including `cleanup.json`. Other simulators and ports were left alone.
