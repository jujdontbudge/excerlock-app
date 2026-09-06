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
| B14 | **Notifications: only two**, both local: the trial-ending reminder (part of the approved trial sequence) and the walk-lease warning that state mode needs. No engagement notifications (no nudge, recap, streak call). No push infrastructure. Codex decides the implementation in Phase 2. | Locked |
| B15 | Analytics tab keeps a **usage monitor on the locked apps** so it can chart locked-app minutes per day and compute "time reclaimed" against the onboarding scrolling estimate. This is the one native risk in Analytics (Phase 2). | Locked |
| B16 | **Badges and share cards are cut** for v1. Streaks and the weekly recap card stay. | Locked |
| B17 | **Support form only.** Feature-request voting is cut. | Locked |
| B18 | **Sign-in methods: Apple, Google, email.** Anonymous session from the first onboarding screen; sign-in is offered after purchase and later in Settings, never required to use the app (local-first law stays). | Locked |
| B19 | The **unlock moment is a simple placeholder** in v1 (lock icon state change + one success haptic). Johan designs the real one later. | Locked |

## C. Visual and motion

| # | Decision | Status |
| --- | --- | --- |
| C1 | Visual direction per the handoff: white canvas, faint pale-orange top wash only, orange primary buttons with white text, dark headings, simple multicolor graphic icons with no backplates, no dimensional renders. Tokens in `03-design-system.md`. | Locked (handoff) |
| C2 | Tabs: **Home, Conditions, Analytics, Settings.** | Locked (handoff) |
| C3 | **OtterLife is the layout and motion reference for everything.** Every screen maps to where OtterLife would put it and in what order (Settings included). AppBlock is used only for blocking-specific screens OtterLife has no equivalent for: app picker, schedule editor, blocking status. | Locked |
| C4 | **Gemini** studies the OtterLife, AppBlock and Unrot recordings and writes the motion-and-layout bible (`design/motion/`). Codex builds every animation from that bible. Gemini then **grades Codex's screen recordings** against the bible before a flow is accepted. | Locked |
| C5 | Motion stack: **Reanimated 4 + Gesture Handler + react-native-svg + expo-haptics.** No Skia, Rive or Lottie unless the bible documents an effect the floor cannot produce, and then only with Johan's OK. | Locked |
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
| E1 | **Gemini CLI auth is broken.** The installed CLI (0.35.1) uses "Code Assist for individuals" OAuth, which Google has retired for this client. Johan must either set `GEMINI_API_KEY` (AI Studio key) in `~/.gemini/.env` or switch the CLI's auth type. Until then, Phase 1 task T00 cannot run. | Phase 1 T00, T15 |
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
