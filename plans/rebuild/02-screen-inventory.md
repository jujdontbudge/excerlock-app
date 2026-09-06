# 02 — Screen, state and transition inventory

Every screen the new app has, in flow order, with its states and where it goes. Screen ids (`O01`, `W2`,
`H`, `S-...`) are used by the task files, the Gemini bible and the dev menu. Copy in quotes is the approved
heading from the board generator; body copy is Codex's to draft within `03-design-system.md` §4 unless quoted.

Layout mapping law (decision C3): for each screen, the bible names the OtterLife screen it maps to and the
placement/order of its components. Where the table below says "AppBlock", OtterLife has no equivalent.

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
| O01 | "Block apps. Exercise more." | `ScheduleWidget` hero: blocked 12 PM–8 PM until arrival at the gym, gym icon, blocked-time line. One-line body. | Animated widget entrance (bible). | OtterLife intro card 1 |
| O02 | "See your progress" | Trend hero: screen time down, exercise up. | | intro 2 |
| O03 | "Stay in control" | Lock + rule tiles hero; short copy. | | intro 3 |
| O04 | "What should we call you?" | `TextField`, keyboard up on enter, CTA rides keyboard. | empty (CTA disabled) · valid · >30 chars error | name screen |
| O05 | "How did you hear about us?" | `ChoiceRow` list: TikTok, Instagram, YouTube, App Store, Friend, Other. | none selected (CTA disabled) · selected | referral |
| O06 | "How old are you?" | Age bands: Under 18, 18–24, 25–34, 35–44, 45–54, 55+. | | age |
| O07 | "What do you do?" | Student, Employed, Self-employed, Parent at home, Between jobs, Retired, Other. | | occupation |
| O08 | "What do you want to improve first?" | More exercise · Less screen time · Overall wellness. "Pick one. You can change it later." | | goal-style single choice |
| O09 | "What's the main reason you want to make a change?" | Options adapted from DAWG 017 (`fitness/01-dawg/017-*.png`): reword into ExcerLock voice, 5–6 options. | | motivation |
| O10 | "How many hours do you currently spend scrolling each day?" | `Slider` 1–12 h in 30-min steps, big live number. Persists `estimatedDailyMinutes`. | value changes with haptic ticks | Unrot 023 structure, OtterLife visual |
| O11 | "Here's some quick math" | hours/day → hours/month → days/year, numbers tick up in sequence (bible). | | reveal |
| O12 | "This is a year in your life" | `DotGrid` 365 dots, all neutral. | | reveal |
| O13 | "This is the free time left" | Same grid; the free-time subset fills (animation: bible). Unit labeled ("after sleep and work, roughly N hours a day"). | | reveal |
| O14 | "This is how much time you spend scrolling" | Same grid; scrolling subset in orange, with the number from O10. | | reveal |
| O15 | "Less scrolling. More moving." | `LineChart` trend: screen time down, exercise up, labeled "illustrative". | | outcome chart |
| O16 | "Stuck in the scroll loop?" | `LoopDiagram` state 1: urge → scroll → reward → repeat. | Continue → O17 animates in place | explainer |
| O17 | "Let's break the loop." | State 2: ExcerLock logo enters the gap, reward nodes fade. | | explainer |
| O18 | "Make moving the habit." | State 3: want to scroll → move → unlock → enjoy. | | explainer |
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
| W2 | "How should walking unlock apps?" | Reach a step goal (Recommended) · Unlock while walking. Each row has one support line. ("Earn time per step" removed.) | | step goal → W3 · while walking → S1 |
| W3 | "Set your walking goal" | `NumberField` steps, default 5,000, ±500 steppers, helper "About N minutes of walking". | invalid range error | S1 |

**Gym**

| Id | Screen | Content | States | Next |
| --- | --- | --- | --- | --- |
| G1 | "What counts at the gym?" | Spend time at the gym (Recommended) · Arrive at the gym. Support: "You'll pick your gym after setup." | | time → G2 · arrival → S1 |
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
| S2 | "Setting up your plan…" | `Checklist` animating: Exercise ✓ · Unlock rule ✓ · Days and times ✓. Auto-advances when done (≈1.5 s, bible). No fake countdown. | | S3 |
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
| X2 | "Pick the apps to block" | Button opens the app picker. Phase 1: `FakeAppPicker` sheet with a fake list of app/category rows and multi-select. Phase 2: system `FamilyActivityPicker`. Shows "N apps · M categories" after selection. Cannot continue with zero selected (hard requirement) but can "Skip for now" (Home then nags). | empty · selected | X3 |
| X3 | Branch permission | Walking: "Let ExcerLock count your steps" (Motion). Gym: "Find your gym" — map search + pin (`GymPicker`), then Location permission (When in use first; Always offered as the auto-detect upgrade toggle with explanation). Running/Biking: "Read your workouts from Apple Health" (Health). | per permission: notDetermined · granted · denied | X4 |
| X4 | "Save your progress" | Sign in with Apple · Continue with Google · Continue with email (email → OTP code screen). Secondary "Skip for now". | idle · submitting · error · code entry | X5 |
| X5 | "You're all set" | Checklist of what is on: Blocking ✓ · Apps ✓ · Steps ✓ (branch) · Reminder (if granted). CTA "Go to Home". | | Home |

## 6. Main app — tabs

Tab bar: Home · Conditions · Analytics · Settings (labels + line icons). Tab switch animates in place
(no cross-fade through black; bible defines the indicator motion).

### H — Home

Component order is decided by the bible's OtterLife mapping; required content:

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

States to build and test: locked · unlockedMet · unlockedWalking · beforeWindow · afterWindow · noRules ·
permissionNeeded · noAppsSelected · paused-only (all rules paused).

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
4. Exercise chart: per day, bars per activity in `chart.exercise`, or steps line for walking-only users.
5. Days met "5 of 5 scheduled", current and longest streak (`StatTile` × 3).
6. Weekly recap card (Week only): rows per `01-product-model.md` §7.
7. Empty states: day zero ("Your first week starts today"), no measurement yet (usage monitor not available), no rules.

Charts are SVG, animate on period change (bars grow, bible), and never show placeholder data outside the dev
menu scenarios.

### S — Settings

Grouping and order follow the bible's OtterLife settings mapping. Required rows:

- Profile header: name, sign-in state (Signed in with Apple · Not signed in → Sign in).
- Subscription: plan and renewal (from Entitlement), Manage subscription (App Store), Restore purchases.
- Permissions: `PermissionRow` × Screen Time, Motion, Location, Health, Camera, Notifications, each with Fix / Open Settings.
- Preferences: Units (km/mi), Walk & Scroll stop grace (30 s–5 min), Gym auto-detect (Always location) with explanation, Haptics on/off.
- Locked apps (shortcut).
- Support: Contact support (composer: category, message, send state), Rate ExcerLock, Share ExcerLock.
- Legal: Terms of Use, Privacy Policy (in-app document screens).
- Account: Sign in / Sign out, Delete account (confirmation with the five-point explanation carried over from the old `AccountSettingsCard`).
- Footer: version + build; 7 taps opens `DevMenu` (Phase 1 always; Phase 2 only in dev builds).

Sub-screens: `settings/support`, `settings/legal/[doc]`, `settings/permission/[name]` (detail with status and instructions), `settings/account`, `settings/gyms` (saved gyms list, max 5, add via `GymPicker`).

## 7. Overlays and sheets

| Id | Sheet | Opened from | Content |
| --- | --- | --- | --- |
| SH-apps | App picker | X2, Home, Conditions, Settings | Phase 1 fake list; Phase 2 system picker (unstyleable) |
| SH-gym | `GymPicker` | X3, Settings › Gyms, gym rule progress card | Map search field, results list, map with pin, radius fixed 100 m, name field, Save. Phase 1: fake results + static map image; Phase 2: MapKit search |
| SH-checkin | Manual gym check-in | Home progress card | "You're at Gold's Gym?" confirm, distance hint, result |
| SH-walk | Walking session | Home progress card (state rule) | Start → verifying (cadence) → walking (lease countdown) → grace → ended. Treadmill: propped-phone framing view placeholder (Phase 2 mounts the camera preview). |
| SH-time | Time wheel | S1, builder | Native `DateTimePicker` in a `BottomSheet` |
| SH-delete | Confirm delete | Conditions | |
| SH-permission-fake | Fake system permission sheet | X1, X3, T3 (Phase 1 only) | Looks like an iOS alert; result chosen by the dev-menu scenario |

## 8. Lock / shield surfaces (Phase 2 native, Phase 1 preview only)

- `ShieldConfiguration` extension renders the blocked-app screen: white blur, lock icon, "Blocked by ExcerLock",
  subtitle = unlock hint, primary "Open ExcerLock", secondary "Keep walking" (state rule) or "OK". Phase 1
  builds a `ShieldPreview` screen in the dev menu that renders the same content model so the copy and layout
  are approved before Phase 2 ports the Swift.

## 9. Transitions (defaults; the bible overrides per screen)

- Onboarding: horizontal push (native stack), 320 ms `standard`; Back pops. In-place state screens (O16–O18) animate content, not the route.
- Sheets: `sheet` spring from bottom, backdrop fade 180 ms, drag to dismiss.
- Tabs: content stays mounted; indicator slides with `control` spring.
- Builder: modal presentation from bottom, 360 ms.
- Paywall: full-screen modal; hard paywall means no swipe-to-dismiss.

## 10. Counting

Onboarding pre-branch 20 · branches 11 (D shared) · tail 5 + trial 4 + paywall 1 · setup 5 · tabs 4 ·
sub-screens ~8 · sheets 7 · preview 1 = **~66 screens/sheets**, of which ~40 are distinct layouts.
