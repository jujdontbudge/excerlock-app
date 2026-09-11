# 05 — Review readiness (T13 checklist; gate for M5)

Derived from Recovi's four rejection rounds (`research/recovery-postmortem.md` §2), the MVP gap audit, and
this app's specifics. Every line is checked with evidence, not assumed. Guideline numbers are Apple's.

## A. Entitlements and capabilities (2.5.1)

- [ ] Family Controls **distribution approval record** confirmed for all five bundle IDs — email from Apple or
      the Capability Requests page showing *approved*, not merely *assigned*. (Recovi build 10 was byte-correct
      and still auto-rejected.)
- [ ] `codesign` dump of the exported IPA matches `02-native-manifest.md` §3 for main + every appex.
- [ ] No private API use; no unused-API warnings in the archive log.
- [ ] Every entitlement present is either used or explicitly justified in Review Notes (HealthKit, push,
      associated domains: "provisioned for a planned feature; not active in this version").

## B. Purchases (2.1(b), 3.1.2)

- [ ] Paid Apps Agreement active; banking and tax complete (`asc web agreements status`).
- [ ] The six rendered subscription products are `READY_TO_SUBMIT`/approved with localized metadata and review
      screenshots, and are **attached to the version submission** (first-time IAPs ride with the binary).
- [ ] Paywall shows price, renewal terms, tappable Terms of Use (EULA) and Privacy Policy; both also in the App
      Store metadata fields.
- [ ] "Free trial" button performs a real StoreKit purchase in sandbox on a fresh install; restore works.
- [ ] Subscription lapse never traps the user (B21) — Settings, support, deletion reachable.

## C. Accounts and privacy (5.1.1, 5.1.2)

- [ ] In-app account deletion, reachable in ≤ 3 taps from Settings, works for anonymous and signed-in users.
- [ ] Sign in with Apple offered wherever Google/email are.
- [ ] Privacy nutrition labels filled honestly (analytics, crash, purchase history, identifiers, location,
      health & fitness/motion). `PrivacyInfo.xcprivacy` matches.
- [ ] Every permission string states the real purpose; Always-location copy per `01-detection-model.md` §3.
- [ ] Analytics opt-out and "Export my data" exist (B52).
- [ ] No free-text user input forwarded to analytics.

## D. Completeness and reviewer path (2.1(a))

- [ ] Review Notes (App Review Information) explain: what Screen Time is used for, how to grant it, how to pick
      apps, how to satisfy a condition at a desk (the preset, B51), that walking detection needs a real device,
      and the Always-location rationale.
- [ ] Preset condition available in the release build via a documented Review Notes path, not a dev route.
- [ ] No "Test gym unlock"/"Test treadmill unlock" buttons; `/dev` route and runtime-mutating deep-link params
      gated behind `__DEV__`; dev menu behind `__DEV__` only.
- [ ] Screen Time denied, no apps selected, and offline all render honest states, never a rest-day.
- [ ] iPad: `supportsTablet: false` and the reviewer's iPad still launches the iPhone layout without crash.

## E. Metadata (1.1, 2.3)

- [ ] Keywords, screenshots and description contain nothing objectionable and nothing the app doesn't do.
- [ ] Screenshots are from the release build.
- [ ] Support URL and Privacy Policy URL live; support form works from a fresh install.

## F. Stability

- [ ] Zero crashes across the T14 simulator run and device pass; Sentry receives a test event from the
      release build with the right release/dist.
- [ ] Cold start and TTI within T15 budgets on the release build.

## G. Submission mechanics

- [ ] Build number > last uploaded; `runtimeVersion` = `1`; `updates.enabled` true; channel `production`.
- [ ] If Apple asks for the Family Controls entitlement again: reply in Resolution Center naming all five
      bundle IDs and **resubmit the same build unchanged** — do not rebuild.
- [ ] Post-approval: run `03-ota-and-release.md` §5 against the public build before any OTA is published.
