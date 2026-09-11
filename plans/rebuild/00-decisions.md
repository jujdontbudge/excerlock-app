# 00 — Decision register

Every entry here was decided by Johan on 2026-09-06 during the planning interview, or inherited from the
2026-09-06 handoff. "Locked" means Codex builds it without asking. "Open" means ask Johan before building
anything that depends on it. "Prerequisite" means Johan or Fable must do it before the relevant task can start.

## A. Scope and process

| # | Decision | Status |
| --- | --- | --- |
| A1 | Rebuild the app from scratch in a **new folder in this repo**: `app-next/`. The old app in `app/` is untouched until the new one ships, then archived. | Locked |
| A2 | Two phases. **Phase 1 = UI/UX only** on a fake local data layer. **Phase 2 = engine + backend.** Codex does Phase 1, Johan checks it, then Phase 2 starts. Keep the process simple: no per-task approval ceremony; Johan reviews when Phase 1 is done. | Locked |
| A3 | Same app identity throughout: bundle id `com.johansardar.excerlock`, Apple team `AX3C2B78YD`, EAS project `9a358379-d939-4c56-bcea-de3ac5699be2`, app group `group.com.johansardar.excerlock`, same App Store record, same Adapty app and access level `premium`, same product ids. Nothing new is created in App Store Connect or Adapty. | Locked |
| A4 | The current app is treated as **not live with paying users** (TestFlight/dev only). No user-data migration. If this is wrong, Johan says so before Phase 2. | Locked (assumption Johan confirmed) |
| A5 | Before Phase 1 starts, the dirty working tree (97 modified, 76 untracked paths) is snapshotted to branch `wip/pre-rebuild-snapshot-2026-09-06`: tracked modifications plus real project content are committed; agent worktrees, scratch (`work/`, `excer-ui-mock/work/`, `plans/sessions/`) and regenerable multi-megabyte boards are gitignored and stay on disk untracked. The design overrides in `design/STYLE.md` and all of `design/research/` and `design/mockups/onboarding-orange/` exist **only** on this branch and on disk, not on `main`. | Done 2026-09-06 (Fable) |
| A6 | Codex creates `rebuild/phase-1` **from `wip/pre-rebuild-snapshot-2026-09-06`** (not from `main`) and commits one commit per task file. Johan merges. | Locked |

## B. Product model (see `01-product-model.md` for the full semantics)

| # | Decision | Status |
| --- | --- | --- |
| B1 | **The time bank is removed.** No allowance, no earned minutes, no drain ladder, no rollover, no reward amount, no per-step rate. `packages/ledger` is not used by the new app. | Locked |
| B2 | **A met rule unlocks the apps for the rest of the blocking window and the rest of the day, no matter what.** Apps re-lock at the start of the next day's blocking window. | Locked |
| B3 | **State mode ("unlocked only while walking") stays** as the one exception to B2. Apps are open while a verified walking session is active and re-lock when it lapses. | Locked |
| B4 | Rule kinds that exist: **target** (step goal, minutes at gym, run/bike minutes or distance), **event** (arrive at gym), **state** (while walking). The **rate** kind is gone. | Locked |
| B5 | **Multiple rules can exist at once and may overlap** in days, times and activities. No conflict validation beyond completeness. | Locked |
| B6 | **One global set of locked apps**, not per rule. Any met rule overrules any unmet rule: if any rule is met today, the apps are open. | Locked |
| B7 | **No free minutes before the lock.** Inside a rule's window the apps are locked until a rule is met. | Locked |
| B8 | **Activity done before the window counts.** Progress is measured from the start of the local day, so 5,000 steps at 8 AM satisfy a 9 AM–9 PM rule and the apps never lock that day. | Locked |
| B9 | Each rule carries its own days and time window (or all day). **The global schedule layer (rest days, holidays, one-day overrides, global lock windows) is cut.** A rule can be paused with a toggle. | Locked |
| B10 | Activities: **Walking, Gym, Running, Biking.** Swimming, calories, active minutes, "any workout", and all vendor conditions (Strava, Oura, WHOOP, Polar, Hevy, Concept2) are gone. | Locked |
| B11 | Walking step goals read the **phone pedometer (Core Motion)**, not HealthKit. Running and biking read **HealthKit workouts** only (no in-app GPS tracker). Gym uses **geofence auto-detect promoted, manual check-in kept** as built, plus **map search and pin** for saving a gym. | Locked |
| B12 | **Treadmill and camera (gait vision) verification stays**, together with placement classification, walking session/lease logic, and the on-device test harness. All of it is **ported from the old app, not rewritten** (Phase 2). | Locked |
| B13 | **Hard paywall.** No way into the main app without starting the trial (or restoring). Restore purchases works on the paywall. | Locked |
| B14 | **Notifications: two user-facing**, both local: the trial-ending reminder (part of the approved trial sequence) and the walk-lease warning that state mode needs, plus the shield tap-through id that B30 adds (enqueued only by the ShieldAction extension, never user-facing). No engagement notifications (no nudge, recap, streak call). No push infrastructure. Codex decides the implementation in Phase 2. | Amended 2026-09-07 (B30) |
| B15 | Analytics tab keeps a **usage monitor on the locked apps** so it can chart locked-app minutes per day and compute "time reclaimed" against the onboarding scrolling estimate. This is the one native risk in Analytics (Phase 2). | Locked |
| B16 | **Badges and share cards are cut** for v1. Streaks and the weekly recap card stay. | Locked |
| B17 | **Support form only.** Feature-request voting is cut. | Locked |
| B18 | **Sign-in methods: Apple, Google, email.** Anonymous session from the first onboarding screen; sign-in is offered after purchase and later in Settings, never required to use the app (local-first law stays). | Locked |
| B19 | The **unlock moment is a simple placeholder** in v1 (lock icon state change + one success haptic) for background/auto-detect unlocks. The entry-driven unlocks (treadmill scan, gym arrival) get the full ceremony in `docs/specs/aha-unlock-screens.md`. | Revised 2026-09-07 |
| B20 | **Aha unlock screens.** Two full-screen unlocks entered from white pills inside the Home lock ("I'm using a treadmill", "I'm at the gym"): lock-shaped frame with camera or map as the body, progress ring on the border, shackle lift, **confetti**, detected message. This deliberately reverses the PRD's "no takeover, no confetti" earn-moment rule for these two screens only. Treadmill applies solely to `state` walking rules with a treadmill place; scan auto-starts on first stride. Spec: `docs/specs/aha-unlock-screens.md`. | Locked 2026-09-07 |
| B21 | **Subscription lapse unshields.** On the transition into `expired` or `billingIssue` every shield is cleared and every DeviceActivity monitor unregistered. Settings, support, account deletion and the two ceremonies stay reachable behind an in-app paywall modal; a paywall never holds someone's apps hostage. | Locked 2026-09-07 |
| B22 | **Gym minutes rule gives instant relief.** A confirmed arrival inside the window unlocks while presence holds; the day's credit books when N minutes accrue. The ceremony says "Unlocked while you're here, N minutes counts the day". | Locked 2026-09-07 |
| B23 | **An earned unlock survives edits.** Pausing, deleting or editing a condition that already unlocked today keeps today's unlock (B2 "no matter what"). The earned unlock is snapshotted on the met row so schedule edits cannot revoke it. | Locked 2026-09-07 |
| B24 | **Gym conditions bind to any saved gym**, not one; stated in the product model, gym list reachable from the condition summary. | Locked 2026-09-07 |
| B25 | **Deleting a gym a condition depends on auto-pauses that condition** with a note on its row. | Locked 2026-09-07 |
| B26 | **Arrival radius stays a 50–200 m slider** (PRD and shipped). Screen inventory corrected; trade-off copy on the picker. | Locked 2026-09-07 |
| B27 | **Walking place `either` gets a choice on Home**: two pills, "I'm using a treadmill" and "I'm walking with my phone". No camera surprise outdoors. | Locked 2026-09-07 |
| B28 | **Walking builder keeps place first and filters modes by place.** Treadmill → only "Walk for N minutes" (new duration target; minutes come from the verified walking session, camera when propped, cadence in hand) and "Unlock while walking". Outside or Either → step goal, walk-for-minutes and unlock-while-walking. Johan 2026-09-07; replaces the audit's flip-the-order recommendation. | Locked 2026-09-07 |
| B29 | **The walking lease renews indefinitely** while cadence stays verified. No session cap. | Locked 2026-09-07 |
| B30 | **A third notification id exists for the shield's "Open ExcerLock" button** (deep link to Home / the relevant ceremony). | Locked 2026-09-07 |
| B31 | **Gym dwell with the app closed credits the full geofence enter-to-exit interval** from the region timestamps; the 30-second confirmation still filters blips. | Locked 2026-09-07 |
| B32 | **Minimum lock window is 30 minutes** (was 15, Apple's DeviceActivity floor). | Locked 2026-09-07 |
| B33 | **Onboarding copy: the screen inventory wins** for the missing O19 screen, the illustrative label and the duplicate O01 heading. O10 reverts to the inventory version; the "never editable" rule stands, so the five shipped bands go. | Locked 2026-09-07 |
| B34 | **Settings is one screen** as the inventory specifies; the compact two-tier "More settings" shape is removed. | Locked 2026-09-07 |
| B35 | **No Lifetime plan** in v1; removed from the paywall stand-in. | Locked 2026-09-07 |
| B36 | **The `lockWindow` shield cause gets its own subtitle** naming the cheapest unlock, published per rule to the app group whenever the app runs. | Locked 2026-09-07 |
| B37 | **Notifications are OS-level only in v1**; no per-notification toggles; the preference row is renamed accordingly. | Locked 2026-09-07 |

## C. Visual and motion

| # | Decision | Status |
| --- | --- | --- |
| C1 | Visual direction per the handoff: white canvas, faint pale-orange top wash only, orange primary buttons with white text, dark headings, simple multicolor graphic icons with no backplates, no dimensional renders. Tokens in `03-design-system.md`. | Locked (handoff) |
| C2 | Tabs: **Home, Conditions, Analytics, Settings.** | Locked (handoff) |
| C3 | **OtterLife is the layout and motion reference for everything.** Every screen maps to where OtterLife would put it and in what order (Settings included). AppBlock is used only for blocking-specific screens OtterLife has no equivalent for: app picker, schedule editor, blocking status. | Locked |
| C4 | **Gemini observes, Codex designs.** Gemini (via `agy`) watches the OtterLife, AppBlock and Unrot recordings and writes only raw observations: per-app screen inventories with layout regions, and per-app motion measurements (elements, properties, ms, easing, stagger). Output: `design/motion/reference/`. **Codex** decides how every ExcerLock screen maps to OtterLife and how it animates, using those observations and its own judgment; no per-screen spec is written for it and there is no Gemini self-check step. Gemini then **grades Codex's screen recordings** against the reference apps before a flow is accepted (T15). | Locked (revised 2026-09-06) |
| C5 | Motion stack: **Reanimated 4 + Gesture Handler + react-native-svg + expo-haptics.** No Skia, Rive or Lottie unless Codex hits an effect the floor cannot produce, and then only with Johan's OK. | Locked |
| C6 | Paywall: **Adapty remote Paywall Builder.** Johan designs the paywall in the Adapty dashboard. Phase 1 renders a stand-in screen in the paywall slot. The trial-offer, reminder, notification and "how the trial works" screens before it are custom-built. | Locked |
| C7 | Onboarding structure per the handoff and the board generator, **minus** the time-bank screens: "How much screen time?" (reward minutes) and the walking "earn time per step" option are removed. The "unlock while walking" option stays. | Locked |
| C8 | App picking and permissions happen **after the paywall**, as a short setup sequence: Screen Time permission → pick apps → the permission the chosen branch needs → optional sign-in → Home. | Locked |

## D. Backend and services (Phase 2)

| # | Decision | Status |
| --- | --- | --- |
| D1 | **Supabase is used for auth only.** New Supabase project for ExcerLock. Clerk is removed entirely. | Locked |
| D2 | **The VPS keeps its own Postgres and the API** (Fastify + Drizzle on the Azure VM, `api.excerlock.com`). The server verifies Supabase JWTs instead of Clerk JWTs. | Locked |
| D3 | **Adapty stays** (same app, same `premium` access level, same product ids, same webhook to the VPS). Customer id becomes the Supabase user id. | Locked |
| D4 | **PostHog stays** as product analytics, inheriting the existing `packages/analytics-events` registry and its laws. **Sentry stays** for crashes. | Locked |
| D5 | **Rules and daily results sync to the VPS database** so they come back on a new phone and are visible server-side. App selections cannot sync (Apple ties Screen Time tokens to the device). | Locked |
| D6 | Vendor integrations and their server routes and tables are deleted from the new stack. | Locked |

## E. Open items (ask Johan before building anything that depends on them)

| # | Item | Blocks |
| --- | --- | --- |
| E1 | ~~Gemini CLI auth is broken.~~ **Resolved 2026-09-06.** The old `gemini` binary (0.35.1, `/usr/local/bin/gemini`) is retired by Google and fails with `IneligibleTierError`. Johan's subscription runs through the **Antigravity CLI `agy`** (1.1.27, `~/.local/bin/agy`), which other agents already use for video analysis. Every "Gemini" step in this plan means `agy -p "<prompt>" --model gemini-3.7-flash-high --dangerously-skip-permissions --add-dir <dir>` with absolute file paths written in the prompt; verified on a 20-second clip (frame-accurate output). Never call `gemini`. | none |
| E2 | **AppBlock and Unrot replay videos** are not on disk. Only OtterLife's full 25-minute replay is (`design/research/otter-replay/replay.mp4`). Codex fetches the others through the ScreensDesign MCP (`https://api.screensdesign.com/v1/mcp`, currently configured for another project) or Johan screen-records them. | Phase 1 T00 |
| E3 | The exact **OtterLife main-app layout** (tabs, Home, Settings order) has not been extracted yet; only the trial/paywall segment was reviewed. T00 produces it. | Phase 1 T09–T12 |
| E4 | Real **prices, trial length and offer** come from the Adapty dashboard. The 7-day trial in mockups is a design example. | Phase 2 |
| E5 | Whether the current app has any real Adapty-linked customers (the identify call was never wired in production code, so probably none). Check the Adapty dashboard before Phase 2 T06. | Phase 2 |
| E6 | Expo MCP is not authenticated in this environment (`/mcp` → expo → Authenticate). Codex must confirm its own Expo MCP is connected before T01. | Phase 1 T01 |

## F. Explicitly out of v1

Time bank and everything downstream of it · rate conditions · per-rule app sets · global schedules and lock
windows · badges and share cards · feature voting · engagement notifications · push notifications · vendor
integrations · swimming/calorie/active-minute conditions · in-app GPS run tracker · widgets · Live
Activities · Siri/App Intents · iPad · Android · localization (English only) · the old Pillow, blue-violet and
orange-gradient visual systems · the old "Manage"/"Analysis" tab names · the old 98-state prototype matrix ·
the old dashboard build spec.

## G. Ship amendments (Johan, 2026-09-09; interview record in `../ship/00-grill.md`)

Entries below supersede earlier entries **by number**. Superseded text above is preserved unchanged, per the
ADR rule. Where an entry is silent, the earlier decision stands.

| # | Decision | Supersedes |
| --- | --- | --- |
| B38 | **Activities are Walking and Gym.** Running and biking are removed from the product surface — types, copy, screens, tests. The HealthKit entitlement, usage strings, pod and background-delivery bridge stay compiled into the binary so run/bike can return as an OTA update. | B10, B11 (run/bike) |
| B39 | **Rule kinds:** target (walking steps, walking minutes, gym minutes), event (gym arrival), state (while walking). No run/bike modes. `Activity = 'walking' \| 'gym'`. | B4 |
| B40 | **Walking is one condition.** Treadmill walking with the phone in hand is the same accelerometer signal as outdoor walking and is never branched on. "Where do you walk?" is a multi-select (Treadmill / Outside) asked in onboarding and Settings, stored, sent to PostHog as a user property, and read by nothing else. | B11 (walking place), B27, B28 |
| B41 | **There is no lease.** Detection is live: walking-active ends when motion says walking stopped (after the single stop-grace setting); propped ends when the phone moves; gym ends on geofence exit. Underneath all three sits one OS-scheduled fail-closed re-lock the app pushes forward while alive (the watchdog), never user-facing. Spec: `../ship/01-detection-model.md`. | B3 (lease part), B29, `docs/specs/treadmill-mode.md` lease timings |
| B42 | **The app stays awake with an always-on, coarsest-accuracy location session** so walking is detected in the background within seconds. "Always" location is requested from every user at setup with honest copy; it is the price of background unlocking and is accepted. | P2-T05 "only auto-detect requests Always" |
| B43 | **Propped mode** (phone on the console) is entered from the in-app button, verified by a foreground camera scan, and exits on pickup (micro-tremor + gravity-vector change, ~1 s) into walking-active, or on put-down into a 60 s re-scan window. No 15-minute lease. The residual "stand beside the treadmill using the propped phone untouched" case is accepted. | treadmill-mode.md `PROPPED` lease |
| B44 | **The in-app "check walking" button is a manual fallback only.** It observes for 3 seconds; walking during those 3 seconds turns the state on. No percentage, no progress bar, no popup — the orange button itself reads "Detected". Detection UI may never show an indefinite spinner; after 3 s it resolves to on or to a named cause. | Home/Conditions "Detecting walking…" UI |
| B45 | **Tapping any lock-list row presents Apple's `FamilyActivityPicker` directly.** No intermediate screen, no "N apps · M categories" anywhere. The one emptiness signal is the Home lock card's "No apps selected" state. The Home History row is deleted; the Home Analytics row stays as a shortcut. | X2 count, C-tab count, Home row |
| B46 | **The paywall is a custom in-app screen.** Adapty supplies products, prices and entitlements (`getPaywall` + `getPaywallProducts`, rendered from the remote catalog, never hardcoded) and processes purchases and restores. Adapty's Paywall Builder is not used. Paywall layout/copy variants are chosen by a PostHog feature flag and ship OTA. Price, trial-length and plan-mix tests are **deferred**; when run, they run in Adapty A/B, never in PostHog. | C6 |
| B47 | **Sign-in is optional at launch and can be made mandatory over-the-air** by a PostHog flag. Apple, Google and email OTP all fully work in binary #1 (Sign in with Apple entitlement added). In-app account deletion is built. Tokens in `expo-secure-store`. | B18 (mechanism) |
| B48 | **One identity spine.** Supabase user id (anonymous from first launch) = VPS `users.id` = Adapty `customer_user_id` = PostHog `distinct_id`. Before every purchase call the PostHog distinct id is attached to the Adapty profile (`setIntegrationIdentifier`). Sign-in links, never replaces. Experiments bucket on the stable device id. Spec: `../ship/04-identity-and-money.md`. | — (new; previously unwired) |
| B49 | **OTA:** explicit manual `runtimeVersion: "1"`, decoupled from app version and bumped by hand only when native code changes; channels `production` and `preview`; `checkAutomatically: ON_LOAD` with a bounded first-session gate and embedded-bundle fallback; exactly one update coordinator, never gated on state behind the paywall; no reload while a purchase, permission prompt, camera scan or walking session is in flight; EAS code signing on when the plan allows; a post-publish device verification ritual is a release gate. Spec: `../ship/03-ota-and-release.md`. | `app/` `appVersion` policy; `app-next` `enabled:false` |
| B50 | **Binary #1 contains every native capability, exhaustively.** Family Controls + 4 extension targets (monitor, shield, shield action, report), App Groups, CoreMotion, camera/Vision, location When-In-Use + Always + background modes + geofencing, local notifications, **push entitlement (present, provisioned, no pushes sent)**, Sign in with Apple, Associated Domains, App Tracking Transparency string, HealthKit + background delivery, `expo-secure-store`, `expo-updates`, Adapty, Sentry, PostHog, photo library, App Intents target, alternate icons, `CFBundleLocalizations`, complete `PrivacyInfo.xcprivacy`, `app.config.ts`. Nothing deferred. Spec: `../ship/02-native-manifest.md`. | B14 (push entitlement stripping), `withNoPush` |
| B51 | **Reviewer path:** App Review Information notes plus a preset condition with a trivially reachable goal so the reviewer can unlock at a desk. Not a hidden dev route, not a demo account. | — |
| B52 | **Settings is one screen with every sub-tree reachable**; "Manage subscription" opens the native subscription sheet; "Export my data" and an analytics opt-out exist; "Touch feedback" is deleted. | B34 (confirmed), inventory |
| B53 | **Implementer:** the Astra Codex agent, orchestrating Sol and Muse agents. Task files in `ship/` are the contract, in the `P2-T*` format. | A2 (process) |
| B54 | **No submission date.** Risk-first sequencing; nothing cut for schedule. | — |

**Prerequisites Johan owns (blocking, dashboard-only):** confirm Apple's Family Controls *distribution approval
record* for all five bundle IDs (portal shows the capability assigned; Recovi was auto-rejected in that same
state) · complete metadata on the six App Store subscription products the paywall renders (all 51 are
`MISSING_METADATA`) and decide the fate of the other 45 · confirm the Paid Apps Agreement, banking and tax
(`asc web agreements status --apple-id …`) · add `SIGN_IN_WITH_APPLE`, `PUSH_NOTIFICATIONS`,
`ASSOCIATED_DOMAINS` capabilities to the App ID · register Team ID + bundle ID under Supabase's native apps for
Sign in with Apple · confirm the EAS plan tier for update code signing · name the physical test iPhone.
