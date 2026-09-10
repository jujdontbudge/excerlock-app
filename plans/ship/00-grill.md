# Ship — the grill

**Purpose.** You asked for a spec. This is the interview that has to happen first. Every question below is a
decision that changes what gets built. Nothing is being implemented until this comes back answered.

## How to use this

Type your answer on the `**A:**` line under each question. Leave it blank to accept my recommendation.

**Fastest path:** if you agree with most of it, write `ACCEPT ALL` on the line below and then only fill in the
handful you disagree with. Anything you leave blank becomes a locked decision with my recommendation as the
answer, recorded in `00-decisions.md`.

**ACCEPT ALL?** → 

Questions marked **[BLOCKING]** stop the whole plan until answered. Questions marked **[$]** cost money or
require a dashboard action only you can do. Questions marked **[REVIEW]** affect App Store approval odds.

---

## 0. What I understood you to ask for

1. Cut running and biking from the MVP.
2. Merge treadmill and walking into one thing. Any detected walking counts, treadmill or outdoor, no matter which.
3. Keep a button for "my phone is propped on the treadmill".
4. Ask "where do you walk?" in onboarding (treadmill / outside, multi-select) and again in settings — cosmetic, no backend meaning.
5. Kill the "Detecting walking… 0% / Keep walking. Checking your pace…" card. Detect for 3 seconds, then stop saying that.
6. Walking and gym detection must work in the background. The in-app check is a backup, not the mechanism.
7. Delete the "choose apps" screen, the app-count display, and the History row. Tapping the lock list opens Apple's native picker directly. Nothing else.
8. Make everything in Settings actually work.
9. Make onboarding and the paywall good enough to pass review.
10. Get approved on the **first** submission.
11. Put **every** native capability in the first binary so all later work ships over-the-air — including the ML walking detector and the camera treadmill detector.
12. Adapty for payments only, not its paywall builder. A/B testing wired properly across PostHog + Adapty.
13. Login must be perfect, with a real login screen.
14. Fix "Manage subscription". Minimise new UI — keep what exists.
15. Learn from what went wrong on the Reform/Regen/Recovi app: payments, login, A/B, OTA.
16. Test it like a real user, end to end, with screenshots.
17. Make it fast.
18. Verify lock/unlock state is correct at every moment, in every edge case.

**Is anything in that list wrong or missing?**

**A:** 

---

## 0b. SETTLED — the detection model (agreed 2026-09-09, supersedes B3/B29)

**There is no lease anywhere.** Three states, each with its own live exit condition, plus one watchdog.

| State | Turns on when | Turns off when |
|---|---|---|
| **Walking active** — phone on the body, outdoors *or* treadmill in hand (identical signal) | motion detection says walking | motion detection says walking stopped |
| **Propped** — phone stationary on the treadmill console, verified by camera | user starts propped mode in-app and the camera scan passes | **the phone moves.** Pickup is detected from returning micro-tremor + a changing gravity vector in ~1 s, and hands off to walking-active; no cadence there → locked |
| **At gym** | geofence entry (confirmed) | geofence exit |

**Watchdog (not a lease, never user-facing).** All three detectors only run while the app process is alive. If
iOS kills the app, it crashes, or the user force-quits, every detector stops at once and nothing would ever
re-lock. So the app registers an OS-scheduled fail-closed re-lock and keeps pushing it forward while it is
running. Invisible in normal use; fires only if the app stops running.

**Why no lease is safe:** the phone is the thing the user wants. It cannot leave the treadmill without being
picked up, and pickup is detected. The only residual is someone standing beside the treadmill using the phone
while it stays propped and untouched — narrow, self-defeating, not designed around.

**Consequence, accepted:** this requires the app to stay awake in the background, which requires the always-on
location session and "Always" location permission (see Q4.1). Without it none of the three exits work while
backgrounded.

---

## 1. Facts you should have before answering

These are established from the repo, not assumptions.

- **`app-next` has no infrastructure at all.** No Adapty, Supabase, Sentry, PostHog, expo-updates, notifications, location, camera, HealthKit or Screen Time. `createRuntime.ts:9` throws `'Real runtime is unavailable in Phase 1'`. The app runs entirely on in-memory fakes.
- **There is no walking detection.** No pedometer, no CoreMotion, no HealthKit in `app-next`. The "Detecting walking… 0%" card is a fixture script counting on a wall clock. Real detection exists in the old `app/modules/excerlock-motion` and must be ported.
- **There is no geofence.** Gym presence is a foreground `setInterval` polling location every 3 seconds (`ForegroundGym.ts:33`). It cannot work with the app closed.
- **`app-next` has 22 Tier-1 native capabilities missing** — things that can never be added by an OTA update. Zero of them are present. See §11.
- **OTA is unowned.** `app-next/app.json` has `"updates": { "enabled": false }` and no `runtimeVersion` key. Neither app has a single `checkForUpdateAsync`/`reloadAsync` call site. No Phase 2 task covers OTA.
- **The old app's `runtimeVersion` policy is `appVersion`** — the exact configuration behind the Recovi incident where published updates never reached App Store installs.
- **`subscription.identify()` and `analytics.identify()` have zero call sites.** Nothing links a signed-in user to their Adapty customer or PostHog person. This is the documented root cause of Recovi's orphaned purchases.
- **Three settings sub-trees are unreachable.** `/settings/preferences`, `/settings/units` and `/settings/permission/*` have no navigation entry point, so all six permission rows, stop-grace, gym auto-detect, haptics and units are shipped but offline.
- **The "Auto-detect arrivals" toggle promises background behaviour the native layer cannot deliver** — the location module requests When-In-Use only.
- **`app-next` has no `app.config.ts`,** so it has no way to get vendor keys into a build. Two existing Phase 2 tasks assume it exists.
- **The old app never used Adapty's Paywall Builder.** It calls `getFlow()` + `getPaywallProducts()` and renders its own screen. What you asked for is already the proven path.
- **Recovi's OTA failures, concretely:** a production update was published to runtime `6e70341f…` while the live App Store build was pinned to `b0ac8e7c…`, so every fresh download kept getting stale onboarding (issue #195). `runtimeVersion` started as `appVersion` (3 live runtimes needing separate publishes), then moved to `fingerprint` (**7 runtimes across the last 25 production update groups**). `checkAutomatically: "ON_ERROR_RECOVERY"` meant the native check never ran on a healthy launch. Two competing update coordinators once `SIGSEGV`'d during reload.
- **Two of Apple's three rejection items on one Recovi round were not code at all** — the Paid Apps Agreement was unsigned, so RevenueCat returned 0 offerings and the "free trial" button silently did nothing.
- **The Family Controls rejection (2.5.1) was about a server-side approval record, not the IPA** — and app extensions do **not** automatically inherit the parent app's entitlement approval.
- **Reform/Regen/Recovi ran ~3 months, not 9** — 7 App Store versions, ~20 retained builds, **4 rejection rounds**, one 7-day review stall, ~25 P0/P1 production incidents. Your instinct is right: the incidents, not the rejections, were the cost.
- **You already wrote the post-mortem.** `~/ios-app-pitfalls/PITFALLS.md` (673 lines) has dedicated sections on OTA, purchases, A/B and auth, plus a portable playbook at `/Users/johansardar/reform/docs/AB-TESTING-ANALYTICS-PLAYBOOK.md`.

---

## 2. Scope cuts — running and biking

**Q2.1 [BLOCKING] How thoroughly do running and biking go?**
"Don't completely scrap" was ambiguous. Options: (a) delete every trace — types, copy, screens, tests;
(b) keep the code, hide it behind a flag; (c) delete the JS surface but keep HealthKit compiled into the
binary so run/bike can return later as a pure OTA update.

➡️ **(c).** HealthKit needs an entitlement and Info.plist strings — it can never be added over-the-air. Deleting
the JS keeps the MVP clean; keeping the native capability keeps your OTA promise honest. Cost: an unused
entitlement can draw a review question, and you must answer it truthfully ("planned feature, not yet enabled").

**A:** 

**Q2.2 Reduce the type union?**
Today `Activity = 'walking' | 'gym' | 'running' | 'biking'` with 8 rule modes, referenced across ~30 files.
Cutting to `'walking' | 'gym'` deletes 4 modes and touches validation bounds, copy registries, the builder,
onboarding branch screens R1/R2/B1/B2/D, analytics, and their tests.

➡️ Yes, cut the union. A dead branch in a type union is a bug that hasn't happened yet. The onboarding activity
picker O20 drops from a 2×2 grid to two cards.

**A:** 

**Q2.3 Persisted data migration?**
No live users, so in principle nothing to migrate — but your own TestFlight installs may hold saved run/bike
rules, and the audit found that one malformed persisted row currently wipes every condition silently.

➡️ Write a store migration that drops run/bike rules with a one-line note, and fix the all-or-nothing validator
at the same time. Cheap now, ugly later.

**A:** 

---

## 3. Walking and treadmill — the merge

**Q3.1 [BLOCKING] Does "unlock while walking" survive as a live-state rule?**
Today walking has three shapes: step goal, walk-for-N-minutes, and "unlock while walking" (apps open only while
a verified session runs, then re-lock). Your screenshot is the third. If detection is now "3 seconds and you're
in", does that rule still **re-lock when you stop walking**, or does any detected walking unlock the rest of the
day like every other condition?

➡️ **Keep the re-lock.** It's the strictest rule and the only thing preventing "walk 3 seconds at 9am, scroll all
day". But the theatre goes: 3 seconds to unlock, then a quiet persistent state. If you'd rather it just unlocks
the day, say so — it deletes the entire lease/renewal/grace machinery, which is a large simplification and a
large behaviour change.

**A:** YES — it survives, and it is now the *only* walking behaviour. No lease. Live motion detection turns it on and off. See §0b.

**Q3.2 Which walking rule shapes survive?**
Currently: step goal (default 5,000), walk-for-N-minutes (default 20), unlock-while-walking.

➡️ Keep all three. They're already built and each is one line of domain code. Cutting them saves nothing and
removes the two shapes most users will actually pick.

**A:** 

**Q3.3 [BLOCKING] What does "3 seconds" mean exactly?**
(a) 3 seconds of detected walking → unlocked, full stop.
(b) 3 seconds → unlocked immediately, detection keeps running quietly to decide when to re-lock.
(c) 3 seconds is a hard *ceiling* on how long any "detecting" state may be shown before it must resolve.

please undesrhant that the check wlaking button just makes a maual chekc incase bakcground process arnet working. idk if this is even useful. this mean it they walk during those 3 seconds then the walk state it on

that state being on can do whavter it would do eatehr adding duration or unlock imdiealty




➡️ **(b) plus (c) as a UI law:** never show a percentage or progress bar for detection; after 3 seconds the screen
must resolve to unlocked or to a named, actionable failure. No indefinite spinners anywhere.
file:///Users/johansardar/Library/Group%20Containers/group.com.apple.notes/Accounts/CC3E5269-626D-403C-A3CE-6F94181129F0/Media/07D3ED6C-427E-4FB8-AD3C-8B1B901E3FE5/1_A39CE9C0-7DFB-4C28-BBC8-1D02856773A9/Pasted%20Graphic.png


remove this thing that pops up nothing shoudl op up it shoudl jsut say detetced on the orange thing 

**Q3.4 What does it say when 3 seconds pass and it hasn't detected walking?**
Options: "Start walking to unlock" (passive, waits) · "We couldn't detect walking — hold your phone or tap
'My phone is on the treadmill'" (names the fix) · close the screen.



LETS add afeuture where they can rpoert  bug perefelcy the word op up it also says if on tredmil click tremdil below. but say ddi no dtetced walking 

**Q3.5 Treadmill camera — confirm the shape.**
One merged walking condition, place is cosmetic, and the camera scan survives as an **optional** secondary
button for people whose phone is propped on the console where the pedometer reads nothing.

➡️ Yes. Lead with motion detection; offer one secondary button, "My phone is on the treadmill", which opens the
camera. Never auto-open the camera. This also kills the bug where place `either` opened the camera outdoors.

**A:** Confirmed. "Treadmill" with the phone in hand is the SAME signal as ordinary walking — one merged condition, no place branching. The camera is only for the propped-on-the-console case.

**Q3.6 Is the treadmill camera scan in v1 at all, or does it ship OTA later?**
The native camera + Vision module is already ported into `app-next`. The *product flow* around it is buggy
(a verified scan currently books zero minutes — audit blocker #1).

➡️ Ship the native module in binary #1 (mandatory — it's a Tier-1 capability), but you may ship the *flow* later
over-the-air. I'd still fix it for v1; it's the "aha" moment of the product.

**A:** 

**Q3.7 "Where do you walk" is genuinely cosmetic?**
Multi-select (Treadmill / Outside), in onboarding and settings, read by nothing — no effect on detection,
thresholds, copy, or which button appears.

➡️ Store it and send it to PostHog as a user property so you learn the split, but let nothing branch on it. The
moment it changes even one string it stops being cosmetic and starts being a thing that can be wrong.

**A:** 

**Q3.8 Walking session lease and stop-grace — keep as designed?**
Current design: 15-minute lease renewing indefinitely while cadence stays verified (B29), plus a user-set stop
grace of 30 s–5 min. Both are currently unimplemented; the 15 minutes is hardcoded twice.

➡️ Keep, but only if you answered "keep the re-lock" to Q3.1. Note the ledger's warning: two independent grace
periods compose serially and double the payout — so grace is applied once, in one place.

**A:** NO LEASE. Replaced by the three live exits in §0b plus the fail-closed watchdog. B29 is superseded.

---

## 4. Background detection

**Q4.1 [BLOCKING] How far do you want to push background walking detection?**
iOS will not run a walking classifier continuously with the app closed. The honest ladder:
(a) foreground only — the in-app check is the mechanism;
(b) **backgrounded** app keeps detecting, plus pedometer history backfill when the app next opens;
(c) genuinely closed-app detection, which needs an always-on location background session — an "Always"
location prompt, a visible status indicator, real battery cost, and a justification to App Review.

➡️ **(b) as the promise, with (c)'s machinery compiled in** and enabled only for users who have a gym condition
(who need Always-location for geofencing anyway). Gym arrival genuinely does work closed-app via geofence —
promise that one. Don't promise closed-app walking in copy; backfill it from pedometer history so steps are
never lost even when the unlock lands late.

**A:** Option (c) — keep the app awake with an always-on location session so walking is detected in the background within seconds. This is required for the §0b model to work at all.

**Q4.2 What unlock latency is acceptable in the background?**
Geofence entry typically fires within seconds to a minute. Pedometer backfill lands when the app next runs.

➡️ Gym arrival: under 60 seconds, and the shield lifts on entry (instant relief, B22). Walking: immediate when
the app is open or backgrounded, backfilled otherwise. State this in copy so it can't feel broken.

**A:** 

**Q4.3 Who gets asked for "Always" location?**
Everyone at setup, or only users who create a gym condition?

➡️ Only gym users, at the moment they create their first gym condition, after When-In-Use has been granted.
Asking everyone up front costs conversion and invites a review question. (Today gym users are never asked at
all — a live bug.)

**A:** 

**Q4.4 Gym dwell with the app closed — confirm B31 stands.**
Credit the full geofence enter→exit interval from region timestamps, with the 30-second confirmation still
filtering blips.

➡️ Stands. Today minutes accrue only from foreground ticks, so a phone in a locker earns ~0.

**A:** 

---

## 5. App picking and Screen Time

**Q5.1 Confirm the picker behaviour.**
Tapping the lock list anywhere presents Apple's native `FamilyActivityPicker` directly. No intermediate screen,
no "N apps · M categories" count anywhere in the app.

➡️ Confirmed as asked. One caveat below.

**A:** 

**Q5.2 Do we keep exactly one signal that the selection is empty?**
With counts gone, an accidentally-emptied selection becomes invisible and the product silently does nothing.

➡️ Keep one: the Home lock card says "No apps selected" with a tap that opens the picker. Not a count — a
state. Everything else loses the number as you asked.

**A:** 

**Q5.3 Does the setup step survive?**
The user must pick apps once or nothing works. (a) One setup step that opens Apple's picker immediately;
(b) no step — the first lock attempt opens it.

➡️ (a). One row, one tap, Apple's sheet, no custom UI around it.

**A:** 

**Q5.4 The History row — confirm deletion.**
It is on **Home**, directly below the Analytics row (`HomeScreen.tsx:206-214`). It has no `onPress`, no route
exists, and it renders as inert decoration. The Analytics row above it duplicates the Analytics tab.

➡️ Delete the History row. Keep the Analytics row only if you want a shortcut from Home; otherwise delete both
and let the tab be the way there.

**A:** 

---

## 6. Onboarding

**Q6.1 Confirm the onboarding edits.**
O20 activity picker drops to two cards (Walking, Gym). W1 becomes "Where do you walk?" multi-select, cosmetic.
W2's mode list stops branching on place. R1/R2/B1/B2/D (running and biking screens) are deleted.

➡️ Confirmed.

**A:** 

**Q6.2 [REVIEW] The six rewritten headings.**
Six approved headings were rewritten during the build, including **"You become ADDICTED to exercise"** (O18).
That line conflicts with your own "sells, never scolds" voice rule, and "addicted" in onboarding copy is the
kind of thing a reviewer reads twice on a screen-time app.

➡️ Revert O18 to the approved heading. Leave the other five as shipped. Say if you like the addicted line and
want to keep it — it is your call, I just won't let it through silently.

**A:** 

**Q6.3 Is the missing O19 screen ("Built around small, repeatable habits") back in?**
It is specified, its copy is written, and it never got built.

➡️ Build it. It is three rows with icons and it is the only screen that explains why the product works.

**A:** 

**Q6.4 Onboarding length — leave at ~20 pre-branch screens?**
That is long. It is also the pattern in the reference apps and it is where your profiling data comes from.

➡️ Leave it. Changing onboarding length is a conversion experiment, and per §9 that is exactly the kind of test
that should ship OTA after launch rather than be guessed at now.

**A:** 

---

## 7. Settings

**Q7.1 One screen, per B34?**
The build produced a compact screen plus an undocumented "More settings" page. The inventory says one screen.

➡️ One screen. The compact version hides required rows behind mislabelled taps.

**A:** 

**Q7.2 "Manage subscription" — confirm the fix.**
Today it opens the app's own Settings. It should open Apple's subscription management.

➡️ Native `showManageSubscriptions` sheet, falling back to the App Store subscriptions URL. This is also a review
expectation for auto-renewing subscriptions.

**A:** 

**Q7.3 [BLOCKING] Settings is worse than "some dead rows".**
Three whole sub-trees have **no navigation entry point**: `/settings/preferences`, `/settings/units` and
`/settings/permission/*`. That takes all six permission rows, stop-grace, gym auto-detect, haptics and units
offline — they exist as code and are unreachable in the app. On top of that: every "Open Settings" button is
inert, the gym auto-detect switch discards its result, the support form captures no reply address, and the
auto-detect toggle claims background behaviour the native layer cannot deliver.

➡️ Re-wire the navigation and build them all — they are small and this is what "make sure everything in settings
is working" means in practice. Two exceptions: delete "Touch feedback" unless you actually want a haptics toggle,
and either make auto-detect real (Q4.3) or stop claiming it. An inert switch is worse than no switch, and a
switch that lies is worse than both.

**A:** 

**Q7.4 [REVIEW] "Export my data" and an analytics opt-out?**
The PRD promises export. The App Privacy label needs an opt-out story. Neither exists.

➡️ Build both — a plain JSON export via the share sheet, and one analytics toggle. Small, and they are the
cheapest possible insurance on a privacy-related rejection.

**A:** 

---

## 8. Payments and paywall

**Q8.1 [BLOCKING] Confirm the C6 reversal.**
Decision C6 says the paywall is Adapty's remote Paywall Builder. You want Adapty for payments only and your own
paywall UI. (The old app already did it your way, so this is low-risk.)

➡️ Reversed: custom paywall screen, products and entitlements via the Adapty SDK, one design in binary #1, with
the variant switch built so alternates ship OTA.

**A:** 

**Q8.2 [BLOCKING] [$] Price tests — this contradicts what you told me.**
Your own playbook's rule: **price, trial length and plan mix must be tested in the billing tool** (Adapty A/B),
never in the flag tool, because only the billing tool can vary price store-compliantly and report real revenue
per arm. Flow, copy and layout tests belong in PostHog. You said "Adapty for pay and nothing else".
Options: (a) follow the playbook — PostHog for layout/copy, Adapty A/B for price; (b) your way — PostHog only,
and accept that price tests are off the table for v1; (c) PostHog only and vary price yourself (not advised —
store-compliance risk and no revenue truth).

➡️ **(b) for v1, (a) later.** You don't need a price test at launch, and adding Adapty Experiments now is one more
system to get wrong. But write it down as the *intended* end state so nobody builds a homegrown price test.
Note (a) may be a paid Adapty tier — that's the **[$]**.

**A:** 

**Q8.3 [$] What products, prices and trial length actually exist today?**
Decision E4 says real prices come from the Adapty dashboard; the 7-day trial in the mockups is a design example.
The old app had six product ids across variant groups A/B.

➡️ Tell me the actual products and the trial length, or tell me to go read the Adapty dashboard. The paywall
must render from the remote catalog — never hardcode prices, plan count, or order (that is failure mode F8 and it
silently disarms every future experiment).

**A:** LOOKED UP 2026-09-09 via adapty CLI (app 9b8a6cf2…): one access level `premium`; six App Store products in two groups — A and B — each with monthly, annual and a win-back annual (com.johansardar.excerlock.premium.{a|b}.{monthly|annual|winback.annual}); placements `onboarding`, `in_app`, `winback`; paywalls Premium A, Premium B, Win-back A, Win-back B. ASC LOOKUP (app 6787265352): **51 subscription products, ALL in `MISSING_METADATA`** — none can be submitted. The six Adapty-referenced ids exist, plus a 45-product price/trial grid (annual $29.99–$49.99 × trial 0/3/7 days, monthly $10.99–$17.99 × 0/3/7). This is the exact state behind Recovi's 2.1(b) 'IAP not submitted' rejection. Prerequisite Johan owns: complete metadata (localized name/description, review screenshot) on at least the six products the paywall will render, attach them to the first submission, and decide what to do with the other 45.

**Q8.4 Hard paywall stays?**
B13: no way into the app without starting a trial or restoring.

➡️ Stays — but see Q9.2, because a hard paywall combined with sign-in-later is the exact shape that orphaned
Recovi's purchases.

**A:** 

**Q8.5 No Lifetime plan — confirm B35.**

➡️ Confirmed, remove it from the stand-in.

**A:** 

**Q8.6 Confirm the lapse behaviour (B21).**
On entering `expired`/`billingIssue`: clear every shield, unregister every monitor, and keep Settings, support,
account deletion and the ceremonies reachable behind a paywall modal.

➡️ Stands. A paywall must never hold someone's apps hostage — it is both wrong and a plausible rejection.

**A:** 

**Q8.7 [BLOCKING] [$] Is the Paid Apps Agreement signed, with banking and tax complete?**
This is not a code question and it caused **two of the three rejection items** on one Recovi round: with the
agreement unsigned, RevenueCat returned **zero offerings**, the "free trial" button silently did nothing, and the
IAPs could not even be submitted for review. It looks exactly like a broken paywall and costs a full round trip.

➡️ Verify it in App Store Connect **before** anything else in §8 is built, and re-verify the day before submission.
Also confirm every subscription product is in "Ready to Submit" and attached to the first submission — IAPs are
reviewed with the binary the first time.

**A:** NOT YET VERIFIED — `asc web agreements status` needs an interactive Apple login. Johan runs: `! asc web agreements status --apple-id johansardar77@gmail.com --output table`

**Q8.8 [BLOCKING] Entitlement status mapping — get this table right once.**
Recovi mapped `CANCELLATION` to not-entitled, which hollowed out the app for everyone who turned off auto-renew
mid-period (issue #151). It also dropped `NON_RENEWING_PURCHASE` and `TRANSFER` entirely, and let **sandbox events
write production entitlement**.

➡️ Write the mapping table into the spec and test it: cancellation → **still entitled until period end**; billing
grace → entitled (B-decision maps grace to `active`); non-renewing and transfer → handled explicitly, never
silently ignored; every webhook checks the payload's `environment` field and drops cross-environment events. Also:
a transient vendor error must never flip the lock state — Recovi had one switch the real Screen Time filter **off**
(issue #157).

**A:** 

---

## 9. Identity — the expensive one

**Q9.1 [BLOCKING] Is sign-in required or optional?**
B13/B18: hard paywall, anonymous from screen one, sign-in offered after purchase and in Settings, never
required. You now say login must be perfect with a proper login screen.
(a) keep it optional, build the screen properly; (b) account-first — sign in before anything.

➡️ **(a).** Account-first adds trial friction and review surface. Either way, offering accounts at all makes in-app
**account deletion** mandatory (App Review 5.1.1(v)) — that gets built regardless.

**A:** OPTIONAL at launch, but it must be switchable to MANDATORY over-the-air (a PostHog feature flag gates the requirement; the sign-in screen and its 'Skip for now' path are both in binary #1). All native sign-in capabilities — Apple, Google, email OTP — must fully work in the first binary.

**Q9.2 [BLOCKING] The identity spine — confirm the contract.**
This is the single most expensive thing to get wrong, and it is what broke Recovi. The rule:
one id — the Supabase user id (anonymous from first launch) — is simultaneously the VPS `users.id`, the Adapty
`customer_user_id`, and the PostHog `distinct_id`. Experiments bucket on the stable **device** id, not the user
id. Before **every** purchase call, the PostHog distinct id is attached to the Adapty profile via
`setIntegrationIdentifier`. On sign-in, the anonymous identity is *linked*, never replaced.

➡️ Adopt exactly this, and make it the first task in the plan, not the last. Acceptance is a real sandbox purchase
made **anonymously** whose purchase event shares a person with its experiment exposure.

**A:** 

**Q9.3 Sign-in providers?**
B18 says Apple, Google, email. **The Sign in with Apple entitlement is missing from both apps** — and Apple
requires it if you offer any third-party sign-in.

➡️ All three, and the `applesignin` entitlement goes into binary #1. Also register the Team ID + bundle ID in the
Supabase dashboard's native-app section — omitting that makes native Apple sign-in silently no-op, which is
exactly what happened on Recovi and shipped to production looking fine.

**A:** 

**Q9.4 Token storage.**
Sessions currently persist to AsyncStorage. The Phase 2 plan forbids that for tokens.

➡️ `expo-secure-store` for tokens. It is a Tier-1 native dependency, so it must be in binary #1.

**A:** 

---

## 10. OTA — your central requirement

**Q10.1 [BLOCKING] `runtimeVersion` policy.**
This one decision decides whether your OTA promise holds. `appVersion` (what the old app uses) mints a new
runtime on every version bump and orphans your channel — the documented Recovi failure. `fingerprint` changes
whenever any native-adjacent dependency shifts, silently.

➡️ **Explicit manual `runtimeVersion: "1"`**, decoupled from app version, changed by hand only when native code
actually changes. Version bumps then cost nothing and every JS change reaches every install.

**A:** 

**Q10.2 [BLOCKING] [$] Code signing for updates.**
Your ledger's rule: if `updates.enabled` is true without end-to-end signing, you are trusting the account, the
provider and the CDN with code execution inside your app's native permissions. EAS code signing is a separate,
plan-gated feature.

➡️ Turn it on if your EAS plan includes it — private key off-repo, rehearsed rotation. If it isn't available,
tell me and we will write down the accepted risk explicitly rather than leaving it undocumented.

**A:** 

**Q10.3 First-session update gate.**
A fresh install that waits on an update check can hang its first launch on a bad network.

➡️ Bounded gate: check on load with a hard time budget (~3 s), then proceed on the embedded bundle on any
timeout, offline state or fetch failure, with a reload-loop guard. Three specific anti-patterns from Recovi, all
of which shipped: **(i)** `checkAutomatically: "ON_ERROR_RECOVERY"` means the native check never runs on a healthy
launch, so delivery depends entirely on JS that starts too late — use `ON_LOAD`; **(ii)** never share one budget
between check *and* download; **(iii)** exactly **one** update coordinator, and its gate must not depend on any
state that lives behind the paywall (Recovi gated on `onboardingComplete`, which sits behind the hard paywall, so
returning users were never offered updates).

**A:** 

**Q10.4 Reload safety.**
An OTA reload firing mid-purchase loses the flow or double-charges trust.

➡️ Define safe reload boundaries: never while a payment sheet, a permission prompt, a camera scan or an active
walking session is in flight. Persist a resume envelope before any reload.

**A:** 

**Q10.5 The release verification ritual.**
The Recovi incident was only caught by reading which runtime the *installed App Store binary* actually selected.
Fingerprints and build-profile output were not substitutes.

➡️ Make it a required release step: after publishing, install the public App Store build on a real phone, pull
`Library/Application Support/.expo-internal/expo-v11.db`, and assert the intended update id is recorded with
`successful_launch_count > 0`. Fail the release if not. TestFlight verified separately.

**A:** 

**Q10.6 Who is allowed to publish an update, and to which channel?**

➡️ Channels `production` and `preview`. `preview` from any branch; `production` only from a tagged release commit
after the §10.5 ritual passes. Say if you want it looser.

**A:** 

---

## 11. The first binary — native capability manifest

**[BLOCKING]** This is the checklist that makes or breaks your OTA-forever strategy. Everything below is
**impossible to add over-the-air**. `app-next` currently has **none** of it.

Tick what goes into binary #1. Items marked ✅ are non-negotiable for the product to function.

| # | Capability | Needed for | Rec. | Ship in binary #1? |
|---|---|---|---|---|
| 1 | Family Controls entitlement | blocking apps at all | ✅ | |
| 2 | ManagedSettings (shields) | the actual lock | ✅ | |
| 3 | DeviceActivity monitors | OS wakeups, usage stats | ✅ | |
| 4 | DeviceActivityMonitor `.appex` | background schedule | ✅ | |
| 5 | ShieldConfiguration `.appex` | the blocked-app screen | ✅ | |
| 6 | ShieldAction `.appex` | shield buttons | ✅ | |
| 7 | App Groups | app ↔ extension data | ✅ | |
| 8 | CoreMotion + `NSMotionUsageDescription` | walking detection (**crashes without the string**) | ✅ | |
| 9 | Camera + Vision | treadmill scan | ✅ | |
| 10 | Location When-In-Use | gym picker | ✅ | |
| 11 | Location **Always** + geofencing | closed-app gym arrival | ✅ | |
| 12 | Background modes (`fetch`, `location`) | any background work | ✅ | |
| 13 | Local notifications | trial reminder, walk-lease warning | ✅ | |
| 14 | `expo-secure-store` (+ Face ID string) | auth tokens | ✅ | |
| 15 | Sign in with Apple entitlement | login (**missing from both apps**) | ✅ | |
| 16 | Adapty SDK | purchases | ✅ | |
| 17 | Sentry native | crash reports | ✅ | |
| 18 | PostHog | analytics, flags | ✅ | |
| 19 | `expo-updates` + signing | OTA itself | ✅ | |
| 20 | `app.config.ts` | any vendor key reaching the binary | ✅ | |
| 21 | HealthKit + background delivery | running/biking **later**, OTA-enabled | yes | |
| 22 | Push notifications (`aps-environment`) | any future push; currently forbidden by B14 | **decide** | |
| 23 | App Tracking Transparency string | any future paid acquisition / attribution | yes | |
| 24 | Associated Domains | universal links, web→app | yes | |
| 25 | Photo library | future share cards / avatars | optional | |
| 26 | App Intents / Siri `.appex` | future shortcuts | optional | |
| 27 | Alternate app icons | future cosmetic feature | optional | |
| 28 | `CFBundleLocalizations` | future localization | optional | |
| 29 | Complete `PrivacyInfo.xcprivacy` | required; currently empty | ✅ | |

**Q11.1 [BLOCKING] [REVIEW] Push notifications (#22).**
B14 forbids push and a config plugin actively strips the entitlement. But adding push later means a new binary
and a new review — the exact thing you are trying to avoid. Including it means Apple sees a push capability an
app that sends no pushes.

Context you need: the old app's `withNoPush.js` plugin exists **specifically to strip `aps-environment`**, because
`expo-notifications`' own config plugin injects it automatically. The stated reason was a signing mismatch and "an
unused push entitlement question" at review — a precaution. To be clear about the evidence: **there is no recorded
rejection for an unused push entitlement.** Recovi's 2.5.1 rejection was Family Controls, not push.

➡️ **Include the entitlement deliberately, send nothing.** Needing a new binary and a new review in month two to
send one re-engagement push is a guaranteed cost; an unused entitlement is a hypothetical one. But include it
*properly* — provisioned in the App ID and the profile, not merely injected by a plugin, because an entitlement in
the binary that the profile does not authorize is a real signing failure. If you would rather not carry the risk,
keep `withNoPush` and accept that push costs a rebuild later. This reverses B14's implementation either way.

**A:** 

**Q11.2 Which optional rows (#25–28) do you want?**

➡️ Take #23 and #24 (both free, both otherwise force a rebuild). Skip #25–28 — each adds review surface for a
feature you have no plan for. But this is your call and it is cheap to say yes now.

**A:** All of them. Everything native goes into binary #1.

**Q11.3 Anything you know you want in the next 6 months that isn't listed?**
Widgets, Live Activities, Apple Watch, iPad, Android, Shortcuts, Focus filters, StoreKit external purchase — all
need a new binary.

➡️ Name them now. This is the last cheap moment.

**A:** Everything goes in. 100% of native capabilities compiled into binary #1, nothing skipped, nothing deferred — items #22-#28 included.

---

## 12. App Review

**Q12.1 [BLOCKING] [REVIEW] Do you already hold the Family Controls *distribution* entitlement?**
Development and distribution are separate approvals. Apple grants distribution by request and rejects apps it
doesn't think warrant it. If you don't have it, **nothing else in this plan matters** until you do — it is the
long pole and the request can take weeks.

➡️ Confirm the status for **all four bundle IDs** (main app + the three extensions). Read Recovi's Round 1
rejection before answering — it is the single most instructive thing in the whole post-mortem:

> "An automated analysis indicates the app uses one or more Screen Time APIs but the app has not been submitted
> with the Family Controls entitlement."

The binary was **already correct**. `codesign -d --entitlements` showed `com.apple.developer.family-controls` on
all four targets; all four embedded distribution profiles carried it; the portal showed "Assigned" for all four
bundle IDs; and the entitlement had been in place for four days before review, so it wasn't propagation lag.
Apple's automated analyzer checks a **server-side distribution approval record, not the bytes in your IPA** —
portal "Assigned" is not the same thing as an approved request, and **each extension needs its own approval and
does not inherit the main app's**.

Two operational lessons that go straight into the release runbook: the fix was to wait for the approval, reply in
Resolution Center **naming all four bundle IDs**, and then **resubmit the same build unchanged** — rebuilding
would have produced byte-identical entitlements and re-tripped the analyzer. And an earlier diagnosis on that
incident ("profiles are missing the entitlement, it's an EAS bug, rebuild with manual profiles") was **wrong** and
had to be retracted, after real time was spent on it. Verify the approval record, not the binary.

**A:** VERIFIED 2026-09-09 via `asc bundle-ids capabilities list`: FAMILY_CONTROLS **and FAMILY_CONTROLS_DISTRIBUTION** are present on all five bundle IDs (main, .monitor, .shield, .shieldaction, .report), along with APP_GROUPS on all five and HEALTHKIT on the main app. Caveat: this is the same portal state Recovi had when it was auto-rejected — the server-side approval record is not visible via this API and must be confirmed separately.

**Q12.2 [REVIEW] How does the reviewer test the app?**
The reviewer must grant Screen Time, pick apps, and then somehow satisfy an exercise condition — indoors, at a
desk, in an unknown timezone, in under ten minutes. If they cannot unlock, they will report the app as
non-functional. This is a *very* likely rejection path and I don't see it addressed anywhere.

➡️ Ship a documented reviewer path: notes in App Review Information explaining the flow, plus a build-safe way to
satisfy a condition without walking (a demo account flag, or a condition preset with a trivially reachable goal).
Not a hidden dev backdoor — a documented, deliberate reviewer affordance. Tell me which you prefer.

**A:** DECIDED BY DEFAULT (Johan skipped it): a documented reviewer path — App Review Information notes plus a preset condition with a trivially reachable goal, not a hidden dev backdoor and not a demo account. Johan can override.

**Q12.3 [REVIEW] Paywall compliance.**
The audit found no tappable Terms of Use or Privacy Policy links on the paywall (guideline 3.1.2 — a
straightforward rejection), and price/renewal disclosure must be visible.

➡️ Both links tappable on the paywall itself, plus the renewal disclosure line. Acceptance-tested.

**A:** 

**Q12.4 [REVIEW] Privacy nutrition labels and the privacy manifest.**
`PrivacyInfo.xcprivacy` declares no collected data types while the app ships PostHog, Sentry and Adapty.

➡️ Fill both out honestly before submission — and note the manifest is compiled, so getting it wrong costs a
rebuild.

**A:** 

**Q12.5 What did the 4 Recovi rejections actually cite?**
The verbatim Apple text is on disk. I'll fold every one into a pre-submission checklist.

➡️ No decision needed — flagging that this becomes a hard gate in the plan.

**A:** 

---

## 13. Observability and A/B

**Q13.1 Sentry wiring.**
Sourcemaps uploaded per build, release and dist tied to the **OTA update id** (not just the binary), so a crash
in an OTA'd bundle is traceable.

➡️ Yes. Without this, every OTA'd crash is unreadable — which is the whole point of shipping OTA.

**A:** 

**Q13.2 PostHog wiring — the five rules from your own playbook.**
`environment` super-property on every event (dev/preview/prod, re-registered after reset) · flags read with the
exposure-sending API · exposure fired where the tested surface mounts, not at app root · first flagged screen
gated on flags-ready with a control fallback · device id primed before the first flags call.

➡️ Adopt all five verbatim. Each maps to a named failure mode that already cost you an experiment.

**A:** 

**Q13.3 Event taxonomy source of truth.**
`packages/analytics-events` exists from the old app. Today `analytics.track` is called from two places and the
trial funnel is uninstrumented.

➡️ Reuse the registry, typed union, no interpolated names, enums at the seam (never free text — PII leak), and
outcome events fire on the outcome, never on tap.

**A:** 

**Q13.4 What is the one metric v1 must be able to answer?**

➡️ Trial start → paid conversion, split by onboarding variant, with revenue attributable per arm. If the plan
can't answer that on day one, the A/B work isn't done. Say if it's something else.

**A:** 

---

## 14. Testing and verification

**Q14.1 [BLOCKING] Do you have a physical iPhone and a sandbox Apple ID ready?**
Two of your four risk areas cannot be tested in the Simulator: **Family Controls does not work on Simulator at
all**, and purchases need either a StoreKit config file or a device with a sandbox account. Camera and geofence
also need a device.

➡️ Tell me the device and iOS version, and whether a sandbox Apple ID exists. If not, creating one is a
prerequisite. Without a device, "tested like a real user" cannot be delivered and I would rather say so now.

**A:** Johan: 'Screen Time works in the simulator, this can be figured out.' Repo research (docs/research/familycontrols-on-simulator.md) agrees in part: FamilyControls authorization and the picker DO complete on a fresh iOS 26.4.1 simulator. Whether a shield actually blocks an app, background wakes, real motion and camera remain device-only truth. Device + sandbox Apple ID still needed for those; details not yet given.

**Q14.2 StoreKit configuration file for Simulator purchases?**

➡️ Yes — it makes the purchase flow testable in the Simulator and in CI without Apple's sandbox, which is the
only way the payment path gets exercised often enough to stay working.

**A:** 

**Q14.3 What counts as "tested like a real user"?**
(a) scripted Simulator run with screenshots at every step; (b) that plus a physical-device pass over the native
surfaces; (c) that plus automated E2E in CI.

➡️ **(b)** for v1, with the Simulator run scripted and screenshotted as you asked. (c) is a large investment and
your ledger notes UI-driver E2E tools run 60–100× slower than direct simulator CLIs. Note the repo has a Maestro
ban, which I will respect.

**A:** Simulator for everything it can prove (auth, picker, purchases via StoreKit config, all UI flows, screenshotted); a physical-device pass for shields-actually-block, background detection, geofence and camera.

**Q14.4 Evidence format?**
The repo already has an `evidence/` convention per task.

➡️ Keep it: screenshots plus a written pass/fail per acceptance criterion, in-repo. And per your ledger — a
screenshot proves nothing until the bundle is proven, so evidence records the bundle/update id too.

**A:** 

---

## 15. Performance

**Q15.1 What are we actually optimizing, and to what number?**
"As fast as possible" isn't testable. Candidates: cold start to first frame · time to interactive Home · JS
bundle size · Home re-render cost (the audit found the rule set re-sorted every second while Home is mounted).

➡️ Budgets: **cold start to first frame < 1.5 s** and **time to interactive < 2.5 s** on an iPhone 12 running a
release build, measured and recorded per release; fix the once-a-second sort; lazy-load the camera and map
modules. Tell me if you have a different target or a specific slowness you've felt.

**A:** 

---

## 16. Plan mechanics

**Q16.1 Where does the spec live and what does it supersede?**
`plans/rebuild/phase-2-backend/` has 25 task files; `00-decisions.md` has 37 locked decisions. Your request
invalidates B4, B10, B11, B14, B27, B28, C6, C7 and reshapes others.

➡️ Don't fork. Amend `00-decisions.md` with a B38+ block that supersedes affected entries **by number**, preserving
the old text per your ADR rule, then write the spec as `plans/ship/` absorbing and reordering the
phase-2 tasks. One plan, one truth.

**A:** 

**Q16.2 Who implements it?**
Codex, this session, parallel agents, or a mix?

➡️ Tell me. It changes how the tasks are written — task files for another agent look very different from a plan I
execute myself.

**A:** Handed to the Astra Codex agent, which orchestrates the work across Sol (high) and Muse Spark agents. The spec is therefore written as executable task files in the existing plans/rebuild/phase-2-backend/P2-T*.md format, not as a plan this session executes.

**Q16.3 Sequencing preference.**
Two shapes: **(a) risk-first** — Family Controls entitlement, native manifest, identity spine and OTA before any
product work, so the scary things fail early; **(b) product-first** — finish the walking/gym changes you asked
for, then infrastructure.

➡️ **(a).** Every one of the 25 Recovi incidents lived in the infrastructure half, and the entitlement request may
have a multi-week lead time. The product cuts in §2–§7 are small and can run in parallel.

**A:** (a) risk-first. Accepted.

**Q16.4 Is there a date?**
Submission target, or "when it's right"?

➡️ Tell me if there's a real date. It changes what gets cut, and I would rather cut deliberately than discover the
deadline late.

**A:** No date. Work is done as fast as it can be done well. Nothing is cut for schedule reasons; sequencing is risk-first (Q16.3).

**Q16.5 Anything you want that I have not asked about?**

**A:** 

---

*Generated 2026-09-09. Answers become decisions B38+ in `plans/rebuild/00-decisions.md`.*
