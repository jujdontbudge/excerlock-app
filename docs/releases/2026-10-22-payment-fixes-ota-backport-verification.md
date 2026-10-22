# Payment fixes OTA backport verification — 2026-10-22

Prepared for the lead to review the older-runtime backport and reuse the verified simulator binaries. This worker did not push, publish an OTA, merge, deploy, or change production data or dashboards.

`ota/pay-backport` starts at `ota/review-on-create` commit `4df952901b0b841344c8dbef5992e5c830031fc2`. Only the nine commits in `269885cc..0207e96d` were brought from main. Product source is `a7a25adc6ee61db06b292f98e1d61f0450d8277c`; subsequent commits change proof definitions and this verification record only.

The fixes cover Close returning to the prior onboarding step, the three-second best-effort Adapty integration identifier in checkout and the identity spine, client payment event delivery, purchase preflight and durable recovery, admission retries and Enforcement deadlines, saved onboarding step and frozen offer across cold relaunch, and client checkout-attempt diagnostics. No requested payment fix was omitted.

## Commit provenance

| Main source | Backport | Method and adaptation |
| --- | --- | --- |
| `5f976b13` | `db73c1e0` | Clean cherry-pick. |
| `a4a354d3` | `b6797b5e` | Clean cherry-pick. |
| `78f97787` | `15d526c0` | Cherry-pick with manual port: Port retry and durable recovery changes around the older adapter without importing runtime 7 ad attribution, purchase intents, or JWS conversion helpers. Preserve profile-based transaction recovery; confirm before asserting the live identity. |
| `b94c0404` | `1c7cf660` | Cherry-pick with manual port: Resolve Scenario model context without importing the runtime 7 ads field. Admission and Enforcement code applied unchanged. |
| `fd903189` | `1636f791` | Clean cherry-pick. |
| `27e1c54a` | `d7bfbcd3` | Clean cherry-pick. |
| `23918b35` | `5f545111` | Cherry-pick with manual port: Save the step and frozen offer while retaining the older Paywall transition without runtime 7 ATT/onboarding attribution. |
| `58b60b0e` | `b3e3d9e9` | Clean cherry-pick. |
| `0207e96d` | `a7a25adc` | Cherry-pick with manual port: Wire client checkout diagnostics to the existing adapter and analytics boundary, omitting absent runtime 7 attribution ports, purchase-intent handling and JWS conversion. |

Proof-only follow-ups:

- `65178362`: Wait for plan and sign-in readiness before the email proof taps Continue.
- `89bad1aa`: Focus the email field, pace idb input one character at a time, and assert the complete email before sending.
- `68873515`: Add offer-b-no-trial-with-rating for runtimes 4 and 5, retaining their existing S5 rating screen; correct the feature Gotcha.

## Compatibility and scope

The older adapter retains its existing profile-based purchase recovery. Runtime 7 ad attribution, ATT, purchase-intent conversion plumbing and JWS helpers were not imported. Native sources, native dependencies, dependency manifests, app/runtime configuration and UI tokens are unchanged. Existing optional native module lookups remain in place (ADR 0076). No pill redesign, View plans row, or other unapproved visible UI change was included.

The source-file audit is [scope-audit.json](../../.excer/backport/scope-audit.json). The original implementation audit found all 100 changed files within the approved range and no native or dependency changes; this verification record is the sole additional file. The diff of `app-next/` and `packages/` from product source `a7a25adc` to the handoff is empty.

## Verification

`npm ci` completed. `./excer check` passed all 22 checks, including typecheck, lint, no-comments, detached-methods, import rules and the feature map: [check-final.log](../../.excer/backport/check-final.log). No test suite was added.

Each focused proof ran individually with a 300-second outer deadline, on its own runtime binary. The installed `Expo.plist` runtime was asserted before and after every run. Worker simulators used the hidden worker set, Metro ports 8099/8100/8101, location `37.3349,-122.0090`, and the dev menu Tools button disabled. ExcerLock-Next and port 8091 were not used.

Every selected check passed: runtime 6 **13/13**, runtime 5 **13/13**, runtime 4 **13/13**. Each Pass links to official `result.json`; the same directory contains screenshots and accessibility labels. [proofs.jsonl](../../.excer/backport/proofs.jsonl) records proof names, runtime assertions, elapsed time, source SHA and logs. [table-data.json](../../.excer/backport/table-data.json) validates the matrix against the official outcomes.

| Focused proof | Runtime 6 / build 21 | Runtime 5 / build 18 | Runtime 4 / build 17 |
| --- | --- | --- | --- |
| `launch/first-launch-welcome` | [Pass](../../.excer/proof/launch/2026-10-22_05-48-28/result.json) | [Pass](../../.excer/proof/launch/2026-10-22_06-09-29/result.json) | [Pass](../../.excer/proof/launch/2026-10-22_06-26-07/result.json) |
| `launch/subscriber-opens-home` | [Pass](../../.excer/proof/launch/2026-10-22_05-49-08/result.json) | [Pass](../../.excer/proof/launch/2026-10-22_06-10-20/result.json) | [Pass](../../.excer/proof/launch/2026-10-22_06-26-36/result.json) |
| `launch/every-tab-opens` | [Pass](../../.excer/proof/launch/2026-10-22_05-49-55/result.json) | [Pass](../../.excer/proof/launch/2026-10-22_06-11-40/result.json) | [Pass](../../.excer/proof/launch/2026-10-22_06-27-15/result.json) |
| `paywall/billing-disclosures` | [Pass](../../.excer/proof/paywall/2026-10-22_05-51-00/result.json) | [Pass](../../.excer/proof/paywall/2026-10-22_06-12-48/result.json) | [Pass](../../.excer/proof/paywall/2026-10-22_06-29-43/result.json) |
| `onboarding/offer-a-paywall-close-returns-reminder` | [Pass](../../.excer/proof/onboarding/2026-10-22_05-51-40/result.json) | [Pass](../../.excer/proof/onboarding/2026-10-22_06-13-42/result.json) | [Pass](../../.excer/proof/onboarding/2026-10-22_06-30-12/result.json) |
| `onboarding/offer-b-paywall-close-returns-before-after` | [Pass](../../.excer/proof/onboarding/2026-10-22_05-52-29/result.json) | [Pass](../../.excer/proof/onboarding/2026-10-22_06-14-51/result.json) | [Pass](../../.excer/proof/onboarding/2026-10-22_06-30-57/result.json) |
| `onboarding/paywall-relaunch-returns-to-checkout` | [Pass](../../.excer/proof/onboarding/2026-10-22_05-53-15/result.json) | [Pass](../../.excer/proof/onboarding/2026-10-22_06-15-58/result.json) | [Pass](../../.excer/proof/onboarding/2026-10-22_06-31-44/result.json) |
| `onboarding/offer-b-paywall-relaunch-returns-to-checkout` | [Pass](../../.excer/proof/onboarding/2026-10-22_05-53-55/result.json) | [Pass](../../.excer/proof/onboarding/2026-10-22_06-16-41/result.json) | [Pass](../../.excer/proof/onboarding/2026-10-22_06-32-23/result.json) |
| `onboarding/offer-b-no-trial` | [Pass](../../.excer/proof/onboarding/2026-10-22_05-54-43/result.json) | [Pass](../../.excer/proof/onboarding/2026-10-22_06-19-19/result.json) | [Pass](../../.excer/proof/onboarding/2026-10-22_06-33-07/result.json) |
| `paywall/identity-purchase-survives-integration-failure` | [Pass](../../.excer/proof/paywall/2026-10-22_05-55-55/result.json) | [Pass](../../.excer/proof/paywall/2026-10-22_06-20-33/result.json) | [Pass](../../.excer/proof/paywall/2026-10-22_06-34-09/result.json) |
| `paywall/identity-purchase-survives-integration-hang` | [Pass](../../.excer/proof/paywall/2026-10-22_05-56-47/result.json) | [Pass](../../.excer/proof/paywall/2026-10-22_06-21-17/result.json) | [Pass](../../.excer/proof/paywall/2026-10-22_06-34-54/result.json) |
| `account/checkout-existing-email-connects-purchase` | [Pass](../../.excer/proof/account/2026-10-22_06-03-20/result.json) | [Pass](../../.excer/proof/account/2026-10-22_06-22-04/result.json) | [Pass](../../.excer/proof/account/2026-10-22_06-35-39/result.json) |
| `paywall/purchase-events-use-production-analytics` | [Pass](../../.excer/proof/paywall/2026-10-22_06-04-58/result.json) | [Pass](../../.excer/proof/paywall/2026-10-22_06-23-25/result.json) | [Pass](../../.excer/proof/paywall/2026-10-22_06-37-02/result.json) |

For runtimes 4 and 5, the no-trial row uses `offer-b-no-trial-with-rating`, which follows their existing S5 rating step. Its offer, placement, plan and no-trial assertions match `offer-b-no-trial`. The product flow was not changed to fit a runtime 6 proof.

Earlier failed runs are retained:

- Runtime 6 email checkout first tapped Continue at `(0,0)` while layout was settling: [failure evidence](../../.excer/proof/account/2026-10-22_05-59-26/result.json). The proof now waits for plans and sign-in readiness.
- Runtime 6 email checkout then showed `e@b.` although idb reported typing six characters: [failure evidence](../../.excer/proof/account/2026-10-22_06-00-57/result.json). The proof now focuses the field, types one character at a time, and asserts the complete address before sending. It passed on all three runtimes.
- Runtime 5 `offer-b-no-trial` stopped at its retained S5 rating step: [failure evidence](../../.excer/proof/onboarding/2026-10-22_06-17-26/result.json). The legacy path variant then passed on runtimes 5 and 4.

## Simulator binaries for the lead

These independent copies remain available after deleting the worker simulators. Each was verified through `EXUpdatesRuntimeVersion` in its own `Expo.plist`, its build in `Info.plist`, and its `iphonesimulator` platform. Full executable hashes and inventory are in [binaries.json](../../.excer/backport/binaries.json).

- Runtime **6**, version **1.0.1**, build **21**: `/Users/johansardar/.t3/worktrees/ExcerLock/t3-b34887e0/.excer/backport/binaries/runtime6/ExcerLock.app`
  Source: `/Users/johansardar/ExcerLock-worktrees/build20/app-next/build/dd/Build/Products/Debug-iphonesimulator/ExcerLock.app`.
  Executable SHA-256: `58327c1801fc3981efe363577f2c45f5ecaa3624d812ab3987a8093f270bb094`.
- Runtime **5**, version **1.0.1**, build **18**: `/Users/johansardar/.t3/worktrees/ExcerLock/t3-b34887e0/.excer/backport/binaries/runtime5/ExcerLock.app`
  Source: `/Users/johansardar/ExcerLock-worktrees/ota-backport/app-next/build/ExcerLock.app`.
  Executable SHA-256: `31648fbc3a0db7b3213bd45cf915389571e6a03c7fec0e5c48d8493653a75a00`.
- Runtime **4**, version **1.0.0**, build **17**: `/Users/johansardar/.t3/worktrees/ExcerLock/t3-b34887e0/.excer/backport/binaries/runtime4/ExcerLock.app`
  Source: `/Users/johansardar/ExcerLock-worktrees/treadmill-loop/app-next/build/DerivedData/Build/Products/Debug-iphonesimulator/ExcerLock.app`.
  Executable SHA-256: `367f9bd3c6781d9c26c9da01945e01aa22307b4ed1f6f932e5a55be86f0d2ab8`.

Runtime 6 was found under the build20 checkout, but its `Info.plist` is build 21. The runtime 4 artifact used for all reported proofs is build 17; an earlier discovered build 10 copy was replaced before runtime 4 verification.

The two earlier OTA entries were read from `0207e96d:docs/releases/2026-10-21-appstore-1.0.2-build23-resubmission.md` because that record is absent from the older OTA branch. The `ota-backport` checkout was read only to locate artifacts and was not modified.

## Dry-run OTA gates and limits

The following commands were attempted at product source `a7a25adc`, each without `--publish`:

```sh
./excer ota --runtime 6 --message "Payment fixes backport verification only"
./excer ota --runtime 5 --message "Payment fixes backport verification only"
./excer ota --runtime 4 --message "Payment fixes backport verification only"
```

All three gates are **blocked** by the branch-source guard: `HEAD a7a25adc is not origin/main 0207e96d; ship only what is on main`. The guard was not bypassed. Evidence: [runtime 6](../../.excer/backport/ota-runtime6.log), [runtime 5](../../.excer/backport/ota-runtime5.log), [runtime 4](../../.excer/backport/ota-runtime4.log), and [command records](../../.excer/backport/ota-gates.json). This is not a passed release gate.

The proofs use simulator development binaries and the identity/Adapty lab. They verify the JavaScript paths and analytics boundary, not a real StoreKit charge, physical-device Apple sign-in, native Screen Time enforcement, production analytics ingestion, or App Store/TestFlight OTA delivery. No requested fix was unsafe to backport; runtime 7 facilities outside the approved range remain excluded.

All three owned worker simulators were deleted, their Metro instances and owned idb companions stopped, and ports 8099–8101 checked closed. Binaries and proof evidence were preserved. [Cleanup records](../../.excer/backport/cleanup.jsonl).
