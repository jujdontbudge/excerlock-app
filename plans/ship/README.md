# Ship

## Current scope — user revision, 2026-09-10

The active completion gates are signing/build upload, real-iPhone functional verification,
and backend functionality per the existing product/identity/detection specifications.
The rest of this document preserves the historical task map; it does not override this revision.
Submission metadata, formal startup/battery measurements, and the optional local StoreKit harness
are explicitly **deferred, not completed** to [the follow-up spec](../post-ship/README.md).
The 4 MB Hermes cap is **removed**, not deferred or implicitly replaced by another cap.

No App Review submission, public app release, or production OTA is authorized.
Completing this engineering scope does **not** mean Apple submission metadata is complete.

### Active acceptance
- [ ] Correct distribution signing and all five bundle IDs/extension entitlements; signed artifact
      uploaded and processed by App Store Connect. Distribution is not required; this scope does not
      authorize external tester invitations or notifications.
- [ ] Build-identified physical-iPhone evidence for sign-in, purchase/restore, exercise detection,
      Screen Time blocking/unlocking, and recovery paths from T04/T05/T11/T14. No simulator substitutes.
- [ ] Required backend credentials/configuration, forward-only migrations and current deployment;
      verified authentication, subscription resync/webhook and account/data deletion behavior.

All other implemented product/OTA/identity safeguards remain required; this revision does not
remove core app functionality, privacy obligations, or fixes for crashes and severe battery problems.
Engineering review safeguards (no exposed developer/test routes or controls and valid native API/
entitlement use) remain active. Family Controls distribution approval and any paid-app agreements or
IAP configuration that Apple actually requires for signing or real sandbox purchases remain active
prerequisites; deferring administrative submission preparation does not bypass those dependencies.


**Johan, 2026-09-09.** The app running on the simulator is the app. This is what's left to ship it. Decisions
B38–B54 in `../rebuild/00-decisions.md` §G. Interview record in `00-grill.md`. Evidence base (file:line for
everything) in `research/`.

Every native capability the product will ever need goes into this binary, so that everything after ships
over-the-air. Running and biking are cut; walking and treadmill are one condition; there is no lease;
detection runs in the background.

The older task files under `../rebuild/phase-2-backend/` are reference material only. Where a task here cites
one, use that section's detail. Never run them on their own.

## Non-negotiables (from the Recovi post-mortem, `research/recovery-postmortem.md`)

Every one of these was a real production incident or a real rejection. Each is owned by a task below.

1. Identity is one spine and is attached to the purchase **before** the purchase (B48).
2. `runtimeVersion` is manual; one update coordinator; bounded first-session gate (B49).
3. IAP products carry metadata and ride with the first submission; the Paid Apps Agreement is confirmed.
4. Family Controls distribution **approval** is confirmed for all five bundle IDs before the first upload.
5. Native Sign in with Apple is registered on the provider side and a failed sign-in is never silent.
6. `CANCELLATION` stays entitled to period end; `NON_RENEWING_PURCHASE`/`TRANSFER` handled; sandbox events
   never write production; a vendor error never flips the lock.
7. No background handler holds a duration in a JS timer.
8. Paywall has tappable Terms and Privacy links and the renewal disclosure.
9. In-app account deletion exists.
10. No unused-API surface, no test buttons, no unguarded dev routes in the release bundle.

## Work order

Riskiest first (B54). Tasks on the same row can run in parallel. A row's "done when" must hold before the
next row starts — that is dependency, not ceremony. Every task file states its own tests-first list and
acceptance.

| Order | Tasks | Done when |
| --- | --- | --- |
| 0 | `T00` prerequisites (Johan, dashboard) | Family Controls approval record confirmed · six IAPs `READY_TO_SUBMIT` · agreement active · capabilities added · Supabase native app registered · device named |
| 1 | `T01` native manifest and engine port · `T02` `app.config.ts`, secrets, EAS · `T03` OTA | A dev-client build signs with every entitlement in `02-native-manifest.md`; `codesign` matches for main + 4 appex; an OTA to `preview` reaches a device and `expo-v11.db` records it |
| 2 | `T04` Supabase auth · `T05` Adapty + custom paywall · `T06` PostHog + Sentry | Anonymous sandbox purchase shares a PostHog person with its exposure; restore never downgrades; lapse unshields; flags-ready gate proven |
| 3 (parallel with 1–2) | `T07` remove running/biking · `T08` walking merge, onboarding, place multi-select · `T09` picker, History, Settings, manage subscription, export | Typecheck + suite green with `Activity = 'walking' \| 'gym'`; every Settings sub-tree reachable |
| 4 | `T10` enforcement domain, watchdog, root · `T11` motion, placement, gym, camera adapters, awake session · `T12` notifications | Device: shields block a real app; walking unlocks backgrounded within 10 s; propped ends on pickup; gym unlocks on entry; force-quit → watchdog re-locks |
| 5 | `T13` review readiness · `T14` verification pass · `T15` performance | `05-review-readiness.md` fully green; simulator screenshot run + device pass in `evidence/`; budgets met on a release build |
| 6 | `T16` TestFlight, submit, first OTA | Build in review with IAPs attached; post-publish OTA ritual passes on the TestFlight install |

## Documents

| File | What it fixes |
| --- | --- |
| `01-detection-model.md` | The three-state model, the watchdog, signals, thresholds, the new `LockDecision` and precedence |
| `02-native-manifest.md` | Everything in binary #1, with the verification commands |
| `03-ota-and-release.md` | Update policy, coordinator, gates, release ritual |
| `04-identity-and-money.md` | Identity spine, Adapty adapter, entitlement mapping, paywall, IAP prerequisites |
| `05-review-readiness.md` | The pre-submission checklist derived from four real rejections |
| `research/` | The four audits: conditions, infra, native inventory, Recovi post-mortem |

## How to work a task

Read the task file, then the document(s) it cites, then the `research/` sections it names. Write the first
failing test named in the task before any code. Port, don't rewrite (B12): native modules, plugins, extension
targets and signal code move from `app/` with their tests; only wiring and policy change. When a task edits a
plan document, that edit is part of the task. Evidence goes in `app-next/evidence/Tnn/` — screenshots plus
a written pass/fail per acceptance line, and the bundle/update id the screenshot was taken on (a screenshot
proves nothing until the bundle is proven). Log any diagnosed cross-app pitfall with the `log-pitfall` skill.
