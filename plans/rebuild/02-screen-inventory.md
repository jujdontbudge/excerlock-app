# 02 — Screen, state and transition inventory

Every screen the new app has, in flow order, with its states and where it goes. Screen ids (`O01`, `W2`,
`H`, `S-...`) are used by the task files, the reference study and the dev menu. Copy in quotes is the approved
heading from the board generator; body copy is Codex's to draft within `03-design-system.md` §4 unless quoted.

Layout mapping law (decision C3): for each screen, Codex picks the OtterLife screen it maps to and copies the
placement/order of its components, using Gemini's inventory in `design/motion/reference/`. Where the table below says "AppBlock", OtterLife has no equivalent.

## 1. Launch

| Id | Screen | Content | States | Next |
| --- | --- | --- | --- | --- |
| L0 | System launch | Native splash (`expo-splash-screen`): white, centered running-lock logo. No invented intro. | — | L1 |
| L1 | Boot gate | Same visual as L0 held while state hydrates (Phase 1: fake store; Phase 2: entitlement + session, 3 s budget). | resolving · resolved | Onboarding not complete → O01 · Complete + entitled → Home · Complete + not entitled → P (paywall) with reason |

## 2. Onboarding — pre-branch (single horizontal flow)

All onboarding screens share `OnboardingHeader` (back + progress) except O01–O03 (no back on O01). The
progress fraction counts the user's actual path length (branch-aware). Continue is always the pinned footer
CTA. Answers persist immediately so killing the app resumes at the same step.

| Id | Screen | Content | Interaction / states | OtterLife map |
| --- | --- | --- | --- | --- |
| O01 | "Block apps. Exercise more." | `ScheduleWidget` hero: blocked 12 PM–8 PM until arrival at the gym, gym icon, blocked-time line. One-line body. | Animated widget entrance modeled on OtterLife's intro cards. | OtterLife intro card 1 |
| O02 | "See your progress" | Trend hero: screen time down, exercise up; the `-3h 12m` badge is visibly labeled "Illustrative, not a forecast". | | intro 2 |
| O03 | "Stay in control" | Lock + rule tiles hero for Walking, Gym, Running and Biking; short copy. | | intro 3 |
| O04 | "What should we call you?" | `TextField`, keyboard up on enter, CTA rides keyboard. | empty (CTA disabled) · valid · >30 chars error | name screen |
| O05 | "How did you hear about us?" | `ChoiceRow` list: TikTok, Instagram, YouTube, App Store, Friend, Other. | none selected (CTA disabled) · selected | referral |
| O06 | "How old are you?" | Age bands: Under 18, 18–24, 25–34, 35–44, 45–54, 55–64, 65+ **(option list pending Johan)**. Body: "This helps us understand who ExcerLock is for." | | age |
| O07 | "What do you do?" | Software developer, Founder, Remote worker, Finance or accounting, Architecture, Education, Other **(option list pending Johan)**. Body: "This helps us understand who ExcerLock is for." | | occupation |
| O08 | "What is your goal?" **(pending Johan)** | More exercise · Less screen time · Overall wellness. "Pick one. You can change it later." | | goal-style single choice |
| O09 | "What's the main reason you want to make a change?" | Options adapted from DAWG 017 (`fitness/01-dawg/017-*.png`): reword into ExcerLock voice, 5–6 options. | | motivation |
| O10 | "How many hours do you currently spend scrolling each day?" | `Slider` 1–12 h in 30-min steps, big live number. Persists `estimatedDailyMinutes`. | value changes with haptic ticks | Unrot 023 structure, OtterLife visual |
| O11 | "Here's some quick math" | hours/day → hours/month → days/year, numbers tick up in sequence (timing modeled on Unrot's math screen). | | reveal |
| O12 | "This is a year in your life" | `DotGrid` 365 dots, all neutral. | | reveal |
| O13 | "This is the free time left" | Same grid; the free-time subset fills (timing modeled on Unrot's dot reveals). Unit labeled ("after sleep and work, roughly N hours a day"). | | reveal |
| O14 | "This is how much time you spend scrolling" | Same grid; scrolling subset in orange, with the number from O10. | | reveal |
| O15 | "This is good." **(pending Johan)** | `LineChart` trend: screen time down, exercise up, visibly labeled "Illustrative, not a forecast". | | outcome chart |
| O16 | "You’re stuck in a loop" **(pending Johan)** | `LoopDiagram` state 1: urge → scroll → reward → repeat. | Continue → O17 animates in place | explainer |
| O17 | "We’ll change the loop" **(pending Johan)** | State 2: ExcerLock logo enters the gap, reward nodes fade. | | explainer |
| O18 | "You become ADDICTED to exercise" **(pending Johan)** | State 3: want to scroll → move → unlock → enjoy. | | explainer |
| O19 | "Built around small, repeatable habits" | Three principle rows with icons. No institution logos. | | principles |
| O20 | "What exercise should unlock your apps?" | `ChoiceGrid` 2×2: Walking, Gym, Running, Biking (multicolor icons). "Pick the one you will really do." | none · selected (card lifts) | activity picker |

O16→O17→O18 are one screen component with three states; the heading crossfades and the diagram animates
between states rather than pushing a new screen (the handoff calls these "State 1/2/3").

## 3. Onboarding — branches

Each branch is a sequence inside the same flow machine; Back walks the actual path.

**Walking**

| Id | Screen | Content | States | Next |
| --- | --- | --- | --- | --- |
| W1 | "Where will you walk?" | Outside (Recommended) · Treadmill · Either | | W2 |
| W2 | "How should walking unlock apps?" | Outside/Either: Reach a step goal (Recommended) · Walk for a set time · Unlock while walking. Treadmill (B28): Walk for a set time (Recommended) · Unlock while walking. Each row has one support line. | | step goal → W3 · set time → W4 · while walking → S1 |
| W3 | "Set your walking goal" | `NumberField` steps, default 5,000, ±500 steppers, helper "About N minutes of walking". | invalid range error | S1 |
| W4 | "How long will you walk?" | `NumberField` minutes, default 20, presets 15/20/30, range 10–120. Treadmill note: "You'll be asked to scan again every 15 minutes." | invalid range error | S1 |

**Gym**

| Id | Screen | Content | States | Next |
| --- | --- | --- | --- | --- |
| G1 | "What counts at the gym?" | Spend time at the gym (Recommended) · Arrive at the gym. Support: "Any gym you save counts. You'll pick your gyms after setup." (B24; no gym step inside the builder) | | time → G2 · arrival → S1 |
| G2 | "How long at the gym?" | `NumberField` minutes, default 30, presets 30/45/60. | | S1 |

**Running**

| Id | Screen | Content | States | Next |
| --- | --- | --- | --- | --- |
| R1 | "What counts as a run?" | Run for a set time (Recommended) · Run a set distance | | time → R2 · distance → D |
| R2 | "Set your running goal" | minutes, default 20, presets 15/20/30. | | S1 |
| D | "Choose your distance" | `NumberField` + unit dropdown km/mi, default 2 mi / 3 km. **Shared with biking** (same component, different defaults). | | S1 |

**Biking**

| Id | Screen | Content | States | Next |
| --- | --- | --- | --- | --- |
| B1 | "What counts as a bike ride?" | Bike for a set time (Recommended) · Bike a set distance | | time → B2 · distance → D |
| B2 | "Set your biking goal" | minutes, default 30, presets 20/30/45. | | S1 |

## 4. Onboarding — shared tail

| Id | Screen | Content | States | Next |
| --- | --- | --- | --- | --- |
| S1 | "When should blocking be active?" | `DayPicker` (Mon–Fri pre-selected) + `TimeRangeRow` (9:00 AM–9:00 PM pre-selected) + "All day" switch + live summary line "Mon–Fri · 9 AM–9 PM". (The old "reward" screens are removed.) | no days error · window < 15 min error · all-day | S2 |
| S2 | "Setting up your plan…" | `Checklist` animating: Exercise ✓ · Unlock rule ✓ · Days and times ✓. Auto-advances when done (≈1.5 s, modeled on OtterLife's plan-building screen). No fake countdown. | | S3 |
| S3 | "Your plan is ready" | `PlanSummary` card computed from answers: activity + mode + goal, days, times, "Unlocks your apps for the rest of the day" (or "while you walk"). Each row has Edit → jumps to that screen and returns here. CTA "Use this plan". | | S4 |
| S4 | "Help us make ExcerLock better" | Five star targets, helper, CTA "Continue", secondary "Not now". No fake reviews. Rating request is a warm-up only (real `StoreReview` call happens in Phase 2 policy, not here). | unselected · selected | T1 |
| T1 | "Try ExcerLock free" | Trial offer: benefits list, "7-day free trial" placeholder label (from Adapty in Phase 2), CTA "Continue". | | T2 |
| T2 | "We'll remind you before it ends" | Reminder explainer: bell icon, "2 days before your trial ends". | | T3 |
| T3 | "Want a trial reminder?" | CTA "Enable reminders" → Phase 1: fake permission sheet (dev menu decides result); Phase 2: native prompt. Secondary "Maybe later". | notDetermined · granted · denied (both continue) | T4 |
| T4 | "How your free trial works" | `TrialTimeline`: Today (full access) · Day 5 (reminder) · Day 7 (billing starts). CTA "Continue". | | P |
| P | Paywall | **Adapty Paywall Builder slot.** Phase 1: `PaywallStandIn` screen (plan options, CTA, restore link, terms line, clearly labeled placeholder in dev menu) rendered in the slot so the flow is testable. Phase 2: `AdaptyPaywallView` for placement `onboarding`. | loading · products · purchasing · restored · error · dismissed (hard paywall: dismiss returns to P with the "you need a plan" message) | X1 on entitled |

Re-entry: if `Entitlement.status` becomes `expired`/`billingIssue` later, P is shown with placement `in_app`
and the relevant message, above the tabs.

## 5. Post-purchase setup sequence (decision C8)

| Id | Screen | Content | States | Next |
| --- | --- | --- | --- | --- |
| X1 | "Let ExcerLock block your apps" | Screen Time permission primer: shield icon, three bullets (what it does, what we can't see, how to change later). CTA "Allow Screen Time" → Phase 1 fake sheet · Phase 2 FamilyControls request. | notDetermined · granted · denied (denied shows "Open Settings" + "Continue anyway", the app then shows a permission-needed status on Home) | X2 |
| X2 | "Which apps should wait?" **(pending Johan)** | Button opens the app picker. Phase 1: `FakeAppPicker` sheet with a fake list of app/category rows and multi-select. Phase 2: system `FamilyActivityPicker`. Shows "N apps · M categories" after selection. Cannot continue with zero selected (hard requirement) but can "Skip for now" (Home then nags). | empty · selected | X3 |
| X3 | Branch permission | Walking: "Let ExcerLock count your steps" (Motion). Gym: "Find your gym" — map search + pin (`GymPicker`), then Location permission (When in use first; Always offered as the auto-detect upgrade toggle with explanation). Running/Biking: "Read your workouts from Apple Health" (Health). | per permission: notDetermined · granted · denied | X4 |
| X4 | "Save your progress" | Sign in with Apple · Continue with Google · Continue with email (email → OTP code screen). Secondary "Skip for now". | idle · submitting · error · code entry | X5 |
| X5 | "You're all set" / "Almost set" | Checklist of Screen Time, apps, the branch permission, reminders and account state. Unchecked rows explain what is missing and route to the corresponding fix; checked rows do nothing. CTA "Go to Home". | complete · unfinished | Home |

## 6. Main app — tabs

Tab bar: Home · Conditions · Analytics · Settings (labels + line icons). Tab switch animates in place
(no cross-fade through black; indicator motion modeled on OtterLife's tab bar).

### H — Home

Component order is decided by Codex's OtterLife mapping (from the reference study); required content:

1. `StatusCard` — driven by `LockDecision`:
   - `locked`: lock icon, "Apps are blocked", subtitle = `nextUnlockHint`, "until you …".
   - `unlockedMet`: open lock, "Unlocked for the rest of today", subtitle "Blocking resumes tomorrow at 9:00 AM" (from `relockAt`).
   - `unlockedWalking`: "Unlocked while you walk", lease countdown, Stop button.
   - `beforeWindow`: "Blocking starts at 9:00 AM", subtitle "Get ahead: walk 5,000 steps now".
   - `afterWindow` / `noRulesToday`: "No blocking right now", subtitle next scheduled start or "Add a condition".
   - Permission problems override the subtitle: "Screen Time access needed" with an inline fix action.
   - The simple v1 unlock moment: when the decision transitions into `unlockedMet`, the lock glyph crossfades to the open glyph with a `pop` spring on scale, one success haptic. Nothing else.
2. `ProgressCard` per enabled rule scheduled today: progress bar/ring, "1,240 / 5,000 steps", remaining; gym arrival shows "Check in" (manual) and "Auto-detect on"; state rule shows "Start a walk" / live session.
3. Locked apps row: "N apps · M categories" → opens picker (X2 as a sheet).
4. Streak chip (flame + days) and "Add condition" shortcut.

States to build and test (order of the `statusContent` chain, see P2-T19): lapsed · enforcementFailed ·
permissionNeeded · noAppsSelected · noRules · allPaused · locked (any number of rules, each with its own row;
claim-pending line until the first refresh of the launch) · unlockedMet ("Unlocked by X"; later unmet windows
"Satisfied by X today") · unlockedProvisional ("Unlocked while you're here") · unlockedWalking · beforeWindow
("Get ahead" only for a target rule) · afterWindow · noRulesToday (both "Blocking resumes …").
`permissionNeeded` and `noAppsSelected` use a closed lock and a "Nothing is being blocked" headline, never the
rest-day copy.

### C — Conditions

1. Locked apps section (count + Edit).
2. Rule list: `RuleCard` per rule (icon, "Walk 5,000 steps", "Mon–Fri · 9 AM–9 PM", switch). Tap → edit
   (opens the builder at the summary step). Swipe → delete with confirm.
3. "Add condition" → builder.
4. Empty state: illustration, "No conditions yet", CTA.

**Builder** (`ConditionBuilder`): a full-screen modal reusing the onboarding branch screens (O20 → branch →
S1 → S3-style summary with Save). Same components, same validation, no trial screens. Edit mode opens at the
summary with Edit links. Cancel confirms if dirty.

### A — Analytics

1. `SegmentedControl` Week · Month · Year with date navigation (‹ ›).
2. Time reclaimed hero (`type.metric`), "measured on N of M days" line, delta vs previous period.
3. Locked-app minutes chart (`BarChart`, comparison color) with the estimate line.
4. Exercise totals: one compact row per activity with its period total (walking in steps, the rest in
   minutes); tapping a row opens that activity's per-day chart in a sheet. Resolved this way in the P2-T24
   planner resolution for finding 47, which kept the existing rows in place of a second stacked chart.
5. Days met "5 of 5 scheduled", current and longest streak (`StatTile` × 3). The streak tile is a running
   streak read at `min(today, period end)`, so a paged-back period shows the streak current at its end.
6. Weekly recap card (Week only): rows per `01-product-model.md` §7.
7. Empty states: day zero ("Your first week starts today"), no measurement yet (usage monitor not available), no rules.

Charts are SVG, animate on period change (bars grow, timing modeled on AppBlock/OtterLife insights screens), and never show placeholder data outside the dev
menu scenarios.

### S — Settings

Grouping and order follow OtterLife's settings screen as inventoried in the reference study; Codex places our rows where OtterLife would. Required rows:

- Profile header: name and sign-in state (Signed in with Apple · Not signed in); tapping it opens Account.
- Subscription: plan and renewal (from Entitlement), Manage subscription (App Store), Restore purchases.
- Data & permissions: `PermissionRow` × Screen Time, Motion & Fitness, Location, Health, Camera, Reminders, each with live status and a detail screen for request / Open Settings recovery. Home and the setup ceremonies use the same recovery.
- Preferences: Units (km/mi), Walk & Scroll stop grace (30 s–5 min), Gym auto-detect (Always location) with denial explanation, Touch feedback on/off. There is no separate notification preference.
- Your plan: Locked apps ("N apps · M categories"), Conditions and Saved gyms shortcuts.
- Support: Contact support (composer: category, message, required reply email, privacy-floored diagnostics preview, send state), Rate ExcerLock, Share ExcerLock.
- Legal: Terms of Use, Privacy Policy (in-app document screens).
- Account: exactly one Account row plus Delete my data / Delete account; the Account screen owns sign in, confirmed sign out and the shared deletion confirmation sheet.
- Footer: version + build; 7 taps opens `DevMenu` only when `devMenuEnabled` is true (`__DEV__` or
  `EXPO_PUBLIC_DEV_MENU=1`). The same gate removes `/dev` and makes Home capture parameters inert in release builds.

Sub-screens: `settings/support`, `settings/legal/[doc]`, `settings/permission/[name]` (detail with status and instructions), `settings/account`, `settings/gyms` (saved gyms list, max 5, add via `GymPicker`).

## 7. Overlays and sheets

| Id | Sheet | Opened from | Content |
| --- | --- | --- | --- |
| SH-apps | App picker | X2, Home, Conditions, Settings | Phase 1 fake list; Phase 2 system picker (unstyleable) |
| SH-gym | `GymPicker` | X3, Settings › Gyms, builder summary "Add a gym", condition summary Gyms row | Map search field, results list, map with pin, radius slider 50–200 m (default 100 m) with the line "A wider radius detects arrivals sooner but can trigger next door" (B26), name field, Save. Own header and Cancel. Phase 1: fake results + static map; Phase 2: MapKit search |
| SH-checkin | *(removed 2026-09-07)* | — | Replaced by the gym ceremony (`unlock/gym`, B20/B22) |
| SH-walk | Walking session | Home "I'm walking with my phone" pill (state or minutes rule, place outside/either; B27) | Start → verifying (cadence) → walking (lease countdown) → grace → ended; refuses with "Blocking hasn't started yet" before the window. Treadmill goes to the `unlock/treadmill` ceremony instead. |
| SH-time | Time wheel | S1, builder | Native `DateTimePicker` in a `BottomSheet` |
| SH-delete | Confirm delete | Conditions | |
| SH-permission-fake | Fake system permission sheet | X1, X3, T3 (Phase 1 only) | Looks like an iOS alert; result chosen by the dev-menu scenario |

## 8. Lock / shield surfaces (Phase 2 native, Phase 1 preview only)

- `ShieldConfiguration` extension renders the blocked-app screen: white blur, lock icon, "Blocked by ExcerLock",
  subtitle = unlock hint, primary "Open ExcerLock", secondary "Keep walking" (state rule) or "OK". Phase 1
  builds a `ShieldPreview` screen in the dev menu that renders the same content model so the copy and layout
  are approved before Phase 2 ports the Swift.

## 9. Transitions (defaults; Codex adjusts per screen from the reference study)

- Onboarding: horizontal push (native stack), 320 ms `standard`; Back pops. In-place state screens (O16–O18) animate content, not the route.
- Sheets: `sheet` spring from bottom, backdrop fade 180 ms, drag to dismiss.
- Tabs: content stays mounted; indicator slides with `control` spring.
- Builder: modal presentation from bottom, 360 ms.
- Paywall: full-screen modal; hard paywall means no swipe-to-dismiss.

## 10. Counting

Onboarding pre-branch 20 · branches 11 (D shared) · tail 5 + trial 4 + paywall 1 · setup 5 · tabs 4 ·
sub-screens ~8 · sheets 7 · preview 1 = **~66 screens/sheets**, of which ~40 are distinct layouts.
