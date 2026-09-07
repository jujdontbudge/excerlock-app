# ExcerLock `app-next` — UI inventory of the entry flows

Read-only audit. Every claim below cites `path:line` relative to `/Users/johansardar/ExcerLock/app-next`.
Scope: boot → onboarding (O01–O20 + branch + tail) → paywall → post-purchase setup (X1–X5) → home,
plus the sign-in route, the copy files these screens read, and the four stores named in the brief.

---

## 0. Route map (Expo Router, file-based)

Every file under `app/` is a one-line adapter (`app/README.md:1-3` — "Thin Expo Router adapters. Feature behavior belongs in src/features.").

| Route | File | Delegates to |
|---|---|---|
| `/` | `app/index.tsx:1` | `src/features/launch/BootGate.tsx` |
| root layout | `app/_layout.tsx:6-16` | `src/features/launch/RootNavigator.tsx` |
| `/onboarding/[step]` | `app/onboarding/[step].tsx:1` | `src/features/onboarding/OnboardingRoute.tsx` |
| `/setup/[step]` | `app/setup/[step].tsx:1` | `src/features/setup/SetupRoute.tsx` |
| `/paywall` | `app/paywall.tsx:1` | `src/features/subscription/PaywallSlot.tsx` |
| `/sign-in` | `app/sign-in.tsx:5-14` | `SettingsPage` + `src/features/setup/SignInScreen.tsx` |
| `/dev` | `app/dev.tsx:1` | `src/features/dev/DevRoute.tsx` (deep-link resume of setup steps) |
| `/(tabs)/home` etc. | `app/(tabs)/_layout.tsx:9-37` | tab shell (out of scope, referenced as the exit) |

`app/onboarding/README.md:1-3` and `app/setup/README.md:1-3` are the only READMEs under `app/` for these flows; `app/setup/README.md:3` documents the deep link `excerlock://dev?scenario=runner-distance&setup=X3`, implemented at `src/features/dev/applyDevControls.ts:6-7` (accepts `X1`–`X5` only).

### Root layout / providers
`app/_layout.tsx:8-15` wraps everything in `GestureHandlerRootView` → `SafeAreaProvider` → `AppRuntimeProvider` → `<StatusBar style="dark" />` → `RootNavigator`. `AppRuntimeProvider` (`src/runtime/AppRuntimeProvider.tsx:4-8`) constructs one runtime per mount and disposes it on unmount; `useRuntime` throws if absent (`:12-15`).

### Route guards
`src/features/launch/RootNavigator.tsx:16-42`:
- global `screenOptions`: `headerShown:false`, animation `fade` when reduced motion else `slide_from_right`, duration `t.motion.duration.navigation` = 460 ms (`src/design-system/tokens.ts:111`).
- `index` and `dev` are always mounted (`:22-23`); `gym-picker` is a `fullScreenModal` (`:24`).
- onboarding guard (`:25`): `loading || (!onboarding.complete && onboarding.step !== 'P' && !entitled)`.
- paywall guard (`:28-29`): `loading || !entitled`, with `gestureEnabled:false` (no swipe-back).
- setup guard (`:31-33`): `loading || (entitled && !onboarding.setupComplete)`.
- tabs/settings/sign-in/builder/unlock guard (`:34-41`): `loading || (entitled && onboarding.setupComplete)`.
- `<FakePromptHost />` is rendered as a sibling of the whole `Stack` (`:43`), so the fake system permission dialog can appear above any route.

`entitled` = status `trial` or `active` (`:13`).

---

## 1. Boot

### `/` — BootGate
`src/features/launch/BootGate.tsx:8-15`.
- Reads: `useHydrated()` (all persisted stores hydrated — `src/state/useHydrated.ts:10-13`, over the list in `src/state/stores.ts:9-18`), `useDevSnapshot()` (fake-runtime snapshot, `src/state/selectors.ts:16-19`), `onboardingStore.data` (`complete`, `step`, `setupComplete`, `setupStep`), `entitlementStore.data.entitlement`.
- Computes `bootDestination(complete, step, entitlement.status, setupComplete, setupStep)`.
- Renders `<Redirect href={destination} />` only when `hydrated && runtimeState.hydrated && !runtimeState.loading && destination` — otherwise `<BootScreen />` (`:14`).
- **User can do nothing here.** No buttons, no gestures, no retry, no timeout. If hydration never finishes the app sits on the splash indefinitely (no error state exists in this file).

`src/onboarding/bootDestination.ts:2-14` (pure):
- `entitlement === 'unknown'` → `null` → stay on BootScreen (`:9`).
- `trial`/`active` → `setupComplete ? '/(tabs)/home' : '/setup/' + setupStep` (`:10-11`).
- not complete → `step === 'P' ? '/paywall' : '/onboarding/' + step` (`:12`).
- otherwise → `/paywall` (`:13`).

### BootScreen
`src/features/launch/BootScreen.tsx:5-27`.
- Full-bleed `LinearGradient` using `tokens.surface.orangeGradient`, locations `[0,0.35,1]` (`:8`).
- Centered `assets/running-lock.png` at `tokens.layout.logo`, `accessibilityRole="image"`, label = `common.appName` = `'ExcerLock'` (`src/content/common.ts:1`).
- **States rendered:** exactly one. No spinner, no "loading" text, no offline/error variant.
- Tests: `src/features/launch/__tests__/boot.test.tsx:3-10` (mounts, exposes the image role/name).

---

## 2. Onboarding: the flow machine (pure)

`src/onboarding/flow.ts`:
- `preBranch` (`:2-22`) = `O01 O02 O03 O04 O05 O06 O07 O08 O09 O10 O11 O12 O13 O14 O15 O16 O17 O18 O20` — **19 steps; `O19` does not exist.** The only reference to `O19` in the repo is the test that filters it out (`src/onboarding/__tests__/flow.test.ts:3-4`). No code, copy or comment explains the gap.
- `tail` (`:23`) = `S1 S2 S3 S4 T1 T2 T3 T4 P`.
- `pathFor(answers)` (`:24-40`) picks the branch:
  - `gym` → `['G1']` when `gymMode === 'arrival'`, else `['G1','G2']`
  - `running` → `['R1', runMode === 'distance' ? 'D' : 'R2']`
  - `biking` → `['B1', bikeMode === 'distance' ? 'D' : 'B2']`
  - default (**anything not gym/running/biking, including a missing `activity`**) → `['W1','W2']` when `walkingMode === 'state'` else `['W1','W2','W3']`
- `nextStep`/`prevStep` clamp at the ends (`:41-48`); `progressFraction` = index / (len-1) (`:49-52`); `resumeStep` falls back to `'O01'` for anything not on the current path (`:53-58`).
- Path length is 19 + 1–3 + 9 = **29–31 steps**, so the header progress bar advances ~3.3 % per tap.

`src/onboarding/validation.ts:6-31` — `canContinue(step, answers)`:
- `O04`: trimmed `name` length 1–30 (`:7-8`).
- Any step in `choiceQuestions` (O05–O09): the stored answer must equal one of the option ids (`:9-12`).
- `O20`: `activity` ∈ walking/gym/running/biking (`:13`).
- `O10`: minutes 60–720 and a multiple of 30; default 180 when unset (`:15-17`) — so Continue is enabled on arrival.
- `S1`: `scheduleIssues(scheduleDraft(answers)).length === 0` (`:18`).
- `W3`: `stepGoal` 500–30 000, multiple of 500 (`:19-22`).
- `G2 / R2 / B2 / D`: `validGoal(value, goalRange(draft, isDistance))` (`:23-29`).
- **Everything else returns `true`** (`:30`) — O01–O03, O11–O18, W1, W2, G1, R1, B1, S2–S4, T1–T4 are never blocked.

---

## 3. Onboarding: route + shell

### `OnboardingRoute`
`src/features/onboarding/OnboardingRoute.tsx:19-68`.
- `useIsFocused()`; **returns `null` when unfocused** (`:37-38`) with the comment "A pushed route can retain an earlier summary while this shared draft is incomplete."
- Composes the body by step:
  - default → `<PreBranchScreen {...flow} />` (`:38`)
  - `T1|T2|T3|T4` → `<TrialScreen step onContinue={flow.advance} />` (`:39-40`)
  - `S1` → `<ScheduleScreen ruleDraft={draft} draft={schedule} onAction onChoose={setWheel} />` (`:41-42`)
  - `S2` → `<PlanBuild rule={toRule(draft, toSchedule(schedule))} onComplete={flow.advance} />` (`:43`)
  - `S3` → `<PlanSummary draft schedule onEdit={flow.edit} />` (`:44`)
  - `S4` → `<ReviewWarmup onSkip={flow.advance} />` (`:45`)
- `advance()` (`:32-35`): when `step === 'S3'` it calls `commitPlan(...)` **before** `flow.advance()` — i.e. the rule is persisted on leaving the summary, not on the "Setting up your plan…" screen.
- Overlay is always the `TimeSheet` time-wheel, opened by `wheel` state (`:56-64`).
- `hideContinue` = `S2 || T3 || playback.hideContinue` (`:55`); `continueLabel` = `planCopy.use` (`'Use this plan'`) only on S3 (`:54`).
- Reads unit from `settingsStore.data.units` (`:22`) and derives the rule draft from persisted answers (`:25-27`).

### `useOnboarding`
`src/features/onboarding/useOnboarding.ts:9-74`.
- `step = params.step ?? resumeStep(state)` (`:15`).
- Effect on step change (`:17-27`): patches `onboardingStore.step`; if the step starts with `S` and no `ruleId` exists it mints one (`createDraft('walking')` — note the hard-coded activity, only the id/createdAt are used) and stores `ruleId` + `ruleCreatedAt`; then `runtime.analytics.screen(step)`.
- `move(next, back)` (`:28-34`): dismisses the keyboard, sets slide direction, patches the store step, and either `router.replace('/paywall')` for `'P'` or `router.setParams({step})`.
- `setAnswer(key, value)` (`:40-41`): merges into `onboardingStore.data.answers` on every keystroke/tap — **answers persist immediately, there is no explicit save.**
- `advance()` (`:42-51`): O10 default backfill to 180; honours `returnTo` (edit round-trip) by clearing `returnTo`/`editBackup` and jumping back; else `nextStep`.
- `edit(target)` (`:52-58`): stores `returnTo:'S3'` and `editBackup: JSON.stringify(answers)`, sets direction back, `router.setParams({step: target, returnTo:'S3'})`.
- `back()` (`:59-73`): if a `returnTo` exists it restores the `editBackup` snapshot (guarded `try/catch`, comment at `:67`) and returns there; else `prevStep`.

### `OnboardingShell`
`src/features/onboarding/OnboardingShell.tsx:12-86`. Shared by onboarding **and** setup (`src/features/setup/SetupRoute.tsx:49`).
- Wraps children in `SolidChoices` (`:51`), which switches every `ChoiceRow`/`ActivityCard` to solid-orange selection (`src/design-system/ChoiceAppearance.tsx:4-8`, consumed at `ChoiceRow.tsx:33` and `ActivityCard.tsx:23`).
- Header: **omitted entirely for `O01`, `O02`, `O03`** (`:56`); otherwise `OnboardingHeader progress onBack` with back suppressed when `hideBack` (`:57`).
- Footer:
  - `hideContinue` true → a `t.layout.button`-tall spacer for `O11–O14` only, otherwise nothing (`:61-64`).
  - `O01/O02/O03` → `<WelcomeFooter onContinue />` (`:65-66`).
  - otherwise a `PrimaryButton` inside a `Reveal`, keyed per step for O11–O14 (`:68-75`), `shape="rounded"` for `O04–O07` else pill, label = `continueLabel ?? (step === 'O01' ? 'Get started' : 'Continue')`, `disabled={!valid}`.
    - **Dead branch:** the `step === 'O01' → c.start` ternary at `:71` can never run, because O01 always takes the `WelcomeFooter` path at `:65`.
- Body transition: an animation "family" key groups W/G/R/B/D as `'branch'`, O12–O14 as `'dots'`, O16–O18 as `'loop'` (`:37-43`) so those groups keep identity across steps. Enter/exit are `SlideInRight/Left` + `SlideOutLeft/Right`, replaced by `opacityIn/opacityOut` under reduced motion (`:44-49`).
- Content is inside `ScreenShell` with `scrollResetKey={step}` (`:53`), so every step scrolls back to top (`src/design-system/ScreenShell.tsx:27-32`).

### `ScreenShell` (the surface every entry screen sits on)
`src/design-system/ScreenShell.tsx:38-66`: orange gradient wash, `SafeAreaView` top+bottom, `KeyboardAvoidingView behavior="padding"`, a `ScrollView` with `keyboardShouldPersistTaps="handled"` and no scroll indicator, a footer band, and an `overlay` slot rendered outside the safe area. Content is capped at `t.layout.maxWidth` = 600 (`:82`, `tokens.ts:92`).

---

## 4. Onboarding screens, one by one

Body selection: `src/features/onboarding/PreBranchScreen.tsx:21-30`. Unknown steps fall through to `<Label>{step}</Label>` (`:29`) — a raw step-id string is the "unknown screen" state.

### O01 — Welcome 1/3
- Component `src/features/onboarding/screens/O01.tsx:9-38`.
- Copy `src/content/onboarding.ts:2`: title **"Block apps. Exercise more."** (rendered with the sentence break turned into a newline, `O01.tsx:12`), body **"Less scrolling. More time to move."**
- Artwork: `WelcomeArtwork` (`welcome/WelcomeArtwork.tsx:6-30`) — four floating `AppTile`s (Instagram gradient, YouTube, WhatsApp, TikTok — `design-system/welcomeTokens.ts:66-71`, brand paths from Simple Icons per `welcome/FOUNDRY.md:6-13`), each greyed by a `blockedVeil` and badged with an hourglass (`welcome/AppTile.tsx:46-50`, `welcome/BlockedBadge.tsx:5-31`), plus a `ScheduleCard` (`welcome/ScheduleCard.tsx:6-17`) showing `welcomeCopy.schedule` = "Block from 12 PM to 8 PM\nuntil you arrive\nat the gym" with `introStart`/`introEnd` = 12 PM / 8 PM and a `gym` icon.
- Pagination: three dots, first active, wrapped in `accessible accessibilityLabel={welcomeCopy.pagination}` = "Introduction, page 1 of 3" (`O01.tsx:21-35`, `content/welcome.ts:17`).
- Footer = `WelcomeFooter` (below). No header, no back.
- **Assumes:** the illustration is fiction — a 12 PM–8 PM gym rule the user has not created.

### O02 — Welcome 2/3
- `screens/O02.tsx:9-51`. Same title (`content/onboarding.ts:3`), body "Reduce your screen time and track your progress."
- `ProgressArtwork` (`progress/ProgressArtwork.tsx:10-49`): seven gradient bars (`ProgressBars.tsx`), an SVG trend curve drawn on (`ProgressCurve.tsx:12-15`), a highlighted point, and a floating badge reading `welcomeCopy.progressValue` = **"-3h 12m"** (`progress/ProgressBadge.tsx:57-59`). The whole group carries `accessibilityRole="image"` + label "Illustrative screen-time reduction of 3 hours and 12 minutes" (`ProgressArtwork.tsx:19-21`, `content/welcome.ts:4`).
- **Back is only the pagination dots.** `O02.tsx:38-47` wraps the dot row in a `PressableScale` labelled "Back" when `onBack` is supplied by `PreBranchScreen.tsx:22`. There is no header arrow on O01–O03 (`OnboardingShell.tsx:56`). Discoverability risk: the visible affordance is three 8-px dots.
- Dynamic type: `paddingTop: w.headingTop / Math.max(1, fontScale)` (`:27`) and the artwork grows by `(fontScale-1) * badge.minHeight` (`ProgressArtwork.tsx:17`).

### O03 — Welcome 3/3
- `screens/O03.tsx:9-51`, copy `content/onboarding.ts:4` body "Exercise more each week and stay consistent."
- `ControlArtwork` (`control/ControlArtwork.tsx:5-24`) → four `ActivityTile`s with icon labels from `welcomeCopy.activities` = **`['Walking','Running','Cycling','Strength training']`** (`content/welcome.ts:7`, used at `control/ActivityTile.tsx:43`).
  - **Copy inconsistency:** the product's own activity list is `Walking / Gym / Running / Biking` (`src/content/activities.ts:2-6`). O03 promises "Cycling" and "Strength training"; O20 then offers "Biking" and "Gym".
- Same dot-as-back pattern (`:37-48`), label "Introduction, page 3 of 3".

### `WelcomeFooter` (O01–O03)
`src/features/onboarding/welcome/WelcomeFooter.tsx:12-59`.
- `PrimaryButton` label `onboardingLabels.start` = **"Get started"** on all three intro pages (`:21`).
- "Already have an account? **Sign in**" opens a `BottomSheet` with the full `SignInScreen` (`:23-30`, `:51-57`). `onContinue` merely closes the sheet (`:55`) — **signing in here does not restore an entitlement, does not skip onboarding, and does not identify the user.** A returning subscriber still walks all 29–31 steps and still hits the hard paywall.
- Legal line: "By continuing, you agree to our **Privacy Policy** and **Terms of Use**" (`content/welcome.ts:13-16`), each a `Label` with `accessibilityRole="button"` (`:34-48`) opening `LegalScreen` in the same sheet. `src/content/legal.ts:1` — "Phase 1 placeholder legal text. Replace with counsel-approved documents before release."
- Inconsistency: the legal links call `show()` which fires haptic `feedback()` (`:14-17`), the Sign in link calls `setSheet` directly with no haptic (`:23`).

### O04 — Name
- `screens/O04.tsx:5-13` → `ProfileHeading step="O04"` + `NameField`.
- Copy `content/onboarding.ts:5`: **"What should we call you?"** / "Let's make this personal." The heading inserts a manual line break before "we" (`profile/ProfileHeading.tsx:11`) while exposing the unbroken string as `accessibilityLabel` (`:20`).
- `profile/NameField.tsx:9-55`: single `TextInput`, `accessibilityLabel`/`placeholder` = "First name", `autoFocus={false}`, `autoComplete="given-name"`, `textContentType="givenName"`, `returnKeyType="done"` dismissing the keyboard, orange focus border, red border + `accessibilityRole="alert"` error **"Keep your name to 30 characters or fewer."** when `value.trim().length > 30` (`:11`, `:47-53`, copy `content/onboarding.ts:33`).
- Writes `answers.name` on every keystroke.
- Continue disabled while empty/whitespace/over-30 (`validation.ts:7-8`).

### O05 / O06 / O07 — Referral, age, occupation
- `screens/O05..O07.tsx` each render `<ChoiceQuestion step=... />`, which forwards these three to `ProfileQuestion` (`scenes/ChoiceQuestion.tsx:11-12`).
- `profile/ProfileQuestion.tsx:9-33` → `ProfileHeading` + a `ProfileChoiceRow` per option.
- `profile/ProfileChoiceRow.tsx:8-62`: `accessibilityRole="radio"`, `accessibilityState.checked`, animated solid-orange fill on selection, radio dot **leading** on O06 and **trailing** elsewhere (`:21-34`, `:56-59`), a `leading` icon slot used on O05 (`ProfileQuestion.tsx:22-26` → `profile/ReferralIcon.tsx`).
- Options (`src/content/onboardingChoices.ts`):
  - O05 `referralSource` (`:4-14`): YouTube, Instagram, TikTok, App Store, Friends, Other.
  - O06 `ageBand` (`:15-18`): Under 18, 18–24, 25–34, 35–44, 45–54, 55–64, 65+.
  - O07 `occupation` (`:20-30`): Software developer, Founder, Remote worker, Finance or accounting, Architecture, Education, Other.
- Headings: "How did you hear about us?" (no body), "How old are you?" / "This helps us tailor your plan.", "What do you do?" / "We'll fit your plan around your day." (`content/onboarding.ts:6-8`).
- **"This helps us tailor your plan" is not honoured anywhere:** `ageBand` and `occupation` are written to the profile (`src/features/rules/plan.ts:16-26`) but nothing reads them — no branch, no default, no copy varies by age or occupation.

### O08 — Goal
- `scenes/ChoiceQuestion.tsx:15-38` general path: `Heading` + `ChoiceRow` list, with a `GoalIcon` leading element (`:26-30`, `scenes/GoalIcon.tsx:4-12` → gym / phone / heart glyph, white when selected).
- Copy `content/onboarding.ts:9`: "What is your goal?" / "Pick one. You can change it later."
  - **"You can change it later" is a promise the code does not obviously keep** in these flows: `improveFirst` is written to `profileStore` (`plan.ts:16-26`) and there is no editor for it in the entry flows audited here.
- Options `onboardingChoices.ts:31-38`: More exercise (`exercise`), Less screen time (`screenTime`), Overall wellness (`wellness`).

### O09 — Motivation
- Same general `ChoiceQuestion` path. Copy `content/onboarding.ts:10`: "What's the main reason you want to make a change?" / "Start with what matters to you."
- Options `onboardingChoices.ts:39-49`: Feel more confident, Have more energy, Focus on what matters, Feel stronger and healthier, Be more present, Keep a promise to myself — each with an icon.
- `mainReason` is stored in the profile and never read back.

### O10 — Screen-time estimate
- `screens/O10.tsx:9-28`. Copy `content/onboarding.ts:11-14`: "How many hours do you currently spend scrolling each day?" / "Don't worry about the exact number. Just give your best guess."
- Five `ScreenTimeChoice` rows (`scenes/ScreenTimeChoice.tsx:5-45`, `accessibilityRole="radio"`, orange solid when selected): Less than 2 hours (60), 2 to 4 hours (180), 4 to 6 hours (300), 6 to 8 hours (420), More than 8 hours (540) — `src/content/screenTime.ts:2-8`. The selected row is found by `minutes < range.upper` (`O10.tsx:11`), so a pre-existing numeric answer selects its containing band. Default selection is the 180-minute band.
- Writes `answers.estimatedDailyMinutes` (representative minutes, not the label). `useOnboarding.ts:43-44` backfills 180 on Continue if untouched.
- Quirk: the 6–8 band's `upper` is `481`, not 480 (`screenTime.ts:6`), so exactly 480 minutes lands in that band.

### O11 — "Here's some quick math"
- `screens/O11.tsx:13-73`. Copy `content/onboarding.ts:15`.
- An orange-outlined card with three staggered `TickingNumber` metrics — hours/day (1 decimal), hours/month, days/year — separated by rotated arrow glyphs (`:27-59`). Labels come from `onboardingLabels` (`content/onboarding.ts:37-39`): "hours every day", "hours a month", "days a year".
- Maths in `impact/model.ts:2-7`: `hours = clamp(minutes/60, 0, 24)`, `month = hours*30`, `days = round(hours*365/24)`, `freeDays = round(8*365/24) = 122`, `scrollingDots = min(days, freeDays)`.
- Trailing line `impactCopy.spent` = **"…spent scrolling"** (`src/content/impact.ts:3`), faded in at 2200 ms.
- **Continue is hidden for 3000 ms** (`impact/useImpactPlayback.ts:16-25`, `timing.mathReady`), replaced by a spacer (`OnboardingShell.tsx:62-63`). Under reduced motion the delay is 0 and Continue is immediate (`useImpactPlayback.ts:25,29`).

### O12 / O13 / O14 — Dot-grid story
- One shared component `scenes/DotGridReveal.tsx:14-52` (routed for all three at `PreBranchScreen.tsx:24`), so the 365-dot grid keeps identity across the three beats (`impact/ImpactDots.tsx:19-44`, absolute 20×19 layout, per-dot opacity/colour/translate transitions).
- Copy `content/onboarding.ts:16-21`: O12 "This is a year in your life" / "365 days. Each dot is one of them."; O13 "This is the free time left" / "After sleep and work, roughly 8 hours a day."; O14 "This is how much time you spend scrolling" / "A little less scrolling can make room for something you care about."
- Accessible grid labels (`content/impact.ts:7-9`): "365 days, one dot per day"; "{n} days of free-time equivalent remain"; "{n} of {free} free-time equivalent days spent scrolling".
- O14 overlays a big percentage (`impact/FreeTimePercentage.tsx:8-36`) — `round(hours/8*100)` — over `impactCopy.percentageLabel` "of your free time spent on your phone".
- O14 conclusion switches to the overflow string when scrolling exceeds the 8-hour allowance: "Your scrolling estimate exceeds the illustrated free-time allowance." vs "That's time you could put toward what matters to you." (`DotGridReveal.tsx:42`, `content/impact.ts:4-6`).
- O13/O14 also show the disclosure "Illustration assumes 8 free hours a day after sleep, work, and life admin." (`DotGridReveal.tsx:44-48`).
- **Auto-advance:** with motion on, O12 auto-advances after 1800 ms and O13 after 1600 ms with no user input; O14 only reveals Continue after 3000 ms (`impact/useImpactPlayback.ts:14-27`, `impact/timing.ts:4-8`). Timers are cancelled on unmount/blur (`:27`, and `OnboardingRoute.tsx:24` passes `focused`). Under reduced motion nothing auto-advances and Continue is immediate (`:14`, `:29`).
- Rationale and reference video notes: `src/features/onboarding/impact/README.md:1-20`.

### O15 — Trend
- `screens/O15.tsx:5-14`. Copy `content/onboarding.ts:22`: "This is good." / "We'll use your screen time habits to help you exercise more."
- `scenes/TrendHero.tsx:9-65` → a card containing `TrendCurves` (two illustrative SVG curves, animated left-to-right clip, `scenes/TrendCurves.tsx:7-43`) labelled "Exercise" (orange, running icon) and "Screen time" (grey, phone icon), with "Now"/"Future" axis captions (`src/content/trend.ts:1-5`). The whole card is one accessible element labelled "Illustrative trend: exercise rises as screen time falls."
- Test asserts the string "Illustrative, not a forecast" is deliberately absent (`__tests__/finish-prebranch.test.tsx:10`) — that copy key still exists unused at `content/onboarding.ts:43`.

### O16 / O17 / O18 — Habit-loop story
- One shared component `scenes/LoopStory.tsx:12-43` for all three (`PreBranchScreen.tsx:25`).
- Copy `content/onboarding.ts:23-25`: O16 "You're stuck in a loop" / "An urge. A quick scroll. A little reward. Then, again."; O17 "We'll change the loop" / "Put a little movement between the urge and the app."; O18 rendered specially — "You become **ADDICTED** to exercise" with the middle word in brand orange (`LoopStory.tsx:45-66`, `content/onboarding.ts:28`), body "Want to scroll? Move first. Unlock your apps and enjoy."
- All three headings stay mounted and crossfade, with `accessibilityElementsHidden` / `importantForAccessibility` toggled so only the active layer is exposed (`:22-33`).
- `scenes/HabitLoop.tsx:35-166`: a 360×500 canvas; four persistent stage nodes move from `original` to `expanded` anchors on O17 (`:17-28`), two inserted nodes ("ExcerLock / Pause the scroll", "Exercise first / A little exercise" — `src/content/loopIntervention.ts:2-3`) animate in, and the arrow ring swaps from 4 to 6 connectors (`scenes/LoopArrows.tsx:7-62`). Stage copy for all three phases lives in `src/content/habitLoop.ts:1-29`.
- **Under reduced motion the whole thing snaps to its final state** (`HabitLoop.tsx:59-61,76-78,109`, `LoopStory.tsx:69-75`).
- Fixed pixel geometry: node boxes are `height: 100` (`HabitLoop.tsx:52`), the heading well is `minHeight: 88` (`LoopStory.tsx:18`), the centre label well is `height: 80` (`:141`). With large Dynamic Type these will clip or overlap — nothing scales them by `fontScale`.
- Design record: `scenes/README.md:5-9`.

### O20 — Choose the exercise
- `screens/O20.tsx:5-15`. Copy `content/onboarding.ts:26`: "What exercise should unlock your apps?" / "Pick the one you will really do."
- `design-system/ChoiceGrid.tsx:6-22` renders four `ActivityCard`s from `src/content/activities.ts:2-6`: **Walking** ("Find your daily stride"), **Gym** ("Show up for yourself"), **Running** ("Make every run count"), **Biking** ("Enjoy the ride").
  - The `support` strings in `activities.ts` are **not rendered** — `ChoiceGrid` passes only `title` (`:17`), and `ActivityCard.tsx:46-48` shows only the title. Dead copy.
- `ActivityCard` is `accessibilityRole="radio"`, lifts by `-float` when selected, solid orange + check under `SolidChoices` (`ActivityCard.tsx:26-53`).
- Writes `answers.activity`; Continue blocked until set (`validation.ts:13`).

---

## 5. Onboarding: the rule branch (W / G / R / B / D)

`PreBranchScreen.tsx:26-27` routes `W1 W2 W3 G1 G2 R1 R2 B1 B2 D` to `OnboardingRuleScreen`.

### Draft plumbing
- `src/features/rules/OnboardingRuleScreen.tsx:9-50`: builds a `RuleDraft` from persisted answers (`draftFromAnswers`), mirrors it into the shared `useRuleDraftStore` on every change (`:14-16`), and translates each `DraftAction` back into a **string-or-value answer** (`:17-48`). Numbers are stored as strings (`:20` — `number(v) => Number.isFinite(v) ? String(v) : ''`), and run/bike goals are namespaced by a `run`/`bike` prefix (`:19`, `:38-46`).
- `src/features/rules/answersDraft.ts:4-23` is the inverse parser; `''` maps to `NaN` so a cleared field stays cleared and invalid (`:8`).
- `src/features/rules/draft.ts:26-46` defaults: `place:'outside'`, `walkingMode:'target'`, `stepGoal:5000`, `gymMode:'time'`, `gymMinutes:30`, `runMode:'minutes'`, `minutes: running?20:30`, `distance: biking? (mi?5:8) : (mi?2:3)`, `unit` from settings. Ids are a hand-rolled v4 UUID via `Math.random()` (`:28-31`).
- `reduceDraft` (`:47-66`), `toRule` (`:81-94` — **throws** if `validateRule` finds issues), `fromRule` (`:95-112`).

### `RuleScreen` — the shared branch surface
`src/features/rules/RuleScreen.tsx:13-43`: `Heading` (crossfaded on title change) + the step body + a persistent `RulePreviewLock` at the bottom (`:40`).

| Step | Body component | Controls | Copy source |
|---|---|---|---|
| W1 | `WalkingScreen` places | 3 `ChoiceRow`s: Outside (*Recommended*, "Get some fresh air with your steps."), Treadmill ("Keep moving, whatever the weather."), Either ("A little of both works too.") | `src/content/rules.ts:5-9` |
| W2 | `WalkingScreen` modes | 2 `ChoiceRow`s: "Reach a step goal" (*Recommended*, "Unlocks your apps for the rest of the day"), "Unlock while walking" ("Apps open while you walk, close when you stop") | `content/rules.ts:10-13` |
| W3 | `WalkingScreen` goal | `NumberField` "Daily step goal" (unit "steps", step 500, min 500, max 30 000) + two `SecondaryButton`s "Remove 500 steps"/"Add 500 steps" (each disabled at the bound) + helper "About N minutes of walking" | `content/rules.ts:14-19`, `WalkingScreen.tsx:59-93` |
| G1 | `WorkoutModeScreen` | "Spend time at the gym" (*Recommended*) / "Arrive at the gym" | `src/content/workoutRules.ts:10-13` |
| G2 | `WorkoutGoalScreen` | `NumberField` "Goal" in minutes (range 10–180) + presets 30/45/60 | `workoutRules.ts:23`, `goalRange.ts:3` |
| R1 | `WorkoutModeScreen` | "Run for a set time" (*Recommended*) / "Run a set distance" | `workoutRules.ts:14-17` |
| R2 | `WorkoutGoalScreen` | `NumberField` "Goal" minutes 5–300 + presets 15/20/30 | `workoutRules.ts:23`, `goalRange.ts:3` |
| B1 | `WorkoutModeScreen` | "Bike for a set time" (*Recommended*) / "Bike a set distance" | `workoutRules.ts:18-21` |
| B2 | `WorkoutGoalScreen` | `NumberField` "Goal" minutes 5–300 + presets 20/30/45 | `workoutRules.ts:23` |
| D | `WorkoutGoalScreen` distance | `NumberField` "Distance" with a **unit switcher** (mi/km) and no presets; range 0.25–30 mi / 0.5–50 km running, 1–120 mi / 1–200 km biking | `WorkoutGoalScreen.tsx:18-45`, `goalRange.ts:2-5` |

Headings/bodies for the branch steps: `content/rules.ts:2-4` (W1–W3) and `content/workoutRules.ts:2-8` (G1/G2/R1/R2/B1/B2/D). `WorkoutModeScreen.tsx:34-36` appends the fixed footnote `workoutCopy.support` = "Unlocks your apps for the rest of the day" — **also shown under "Arrive at the gym"**, where the rule is an event, not a target.

Numeric field behaviour (`design-system/NumberField.tsx:10-87`): `accessibilityRole="adjustable"` with increment/decrement actions honouring `step`/`min`/`max` (`:41-53`), `keyboardType="decimal-pad"`, inline error, and the unit picker rendered as a `ChoiceRow` list (`:71-85`). `WorkoutGoalScreen.tsx:43` normalises `,` to `.`. An empty field renders as empty and reports the range hint as an error (`:39,44`).

Selection semantics: `WorkoutModeScreen.tsx:13-14` maps a `walking` draft to `running` copy defensively; the first option is always badged *Recommended* (`:20`).

### `RulePreviewLock`
`src/features/rules/RulePreviewLock.tsx:13-50`.
- Fixed frame `t.layout.ring*3 × t.layout.ring*2.5` (288×240) with the card scaled to 0.78 (`:18,20`) so the preview is the same size on every branch step and on S1 (asserted by `__tests__/schedule-screen.test.tsx:7-13`).
- Renders `BlockingScheduleCard` in `lock` mode — padlock shackle + gradient body + a 24-hour timeline + a `ProgressBar value={0}` and a "0 / goal unit" line (`:36-44`).
- Without a schedule it uses the placeholder window 9 AM–9 PM (`src/content/rulePreview.ts:2-6`); with a schedule it uses real minute labels or "12 AM"/"11:59 PM" for all-day (`:29-32`).
- Pure model `src/features/rules/rulePreviewModel.ts:10-46` produces the sentence and the progress string for **every** rule shape:
  - walking target → "until you walk 5,000 steps" / "0 / 5,000 steps"
  - walking state → "unless you are walking" / "Waiting for your walk"
  - gym arrival → "until you arrive at the gym" / "Waiting for gym arrival"
  - gym time → "until you exercise for 45 minutes" / "0 / 45 minutes"
  - running/biking time → "until you run|bike for N minutes"
  - running/biking distance → "until you run|bike N mi|km"
  (`src/content/rulePreview.ts:9-19`; covered by `__tests__/rule-preview.test.ts:4-17`).
- The block prefix is "Block from X to Y" or "Block all day" (`rulePreview.ts:6-8`); the composed sentence is the card's `accessibilityRole="header"` label (`design-system/BlockingScheduleCard.tsx:63-68`).

---

## 6. Onboarding tail

### S1 — Schedule
`src/features/rules/ScheduleScreen.tsx:11-63`.
- Heading `planCopy.S1` = **"When should blocking be active?"**, body "Choose the days and times you want a little help focusing." (`src/content/plan.ts:2-3`).
- `DayPicker` (`design-system/DayPicker.tsx:8-56`): seven `checkbox` circles Mon→Sun (order `[1..6,0]`), plus text shortcuts **"Weekdays"** and **"Every day"**. Labels/letters from `src/content/controls.ts:31-32`.
- `TimeRangeRow` compact (`design-system/TimeRangeRow.tsx:10-69`): an **"All day"** `Switch` and, when off, two tappable fields "Start time"/"End time" opening the `TimeSheet`.
- `TimeSheet` (`src/features/rules/TimeSheet.tsx:5-33`): a `BottomSheet` containing `@react-native-community/datetimepicker` in `spinner` mode, `minuteInterval={5}`, light `themeVariant`, plus a "Done" button. Titles "Blocking starts"/"Blocking ends" (`content/plan.ts:6-8`).
- Errors: "Choose at least one day." and "Choose a window of at least 15 minutes." (`content/plan.ts:4-5`, rendered at `ScheduleScreen.tsx:34-38,49-53`).
- Live summary line via `scheduleLabel` (`:54-58`), e.g. "Mon–Fri · 8 PM–2 AM, ends next day" (`src/domain/scheduleLabel.ts:8-17`).
- The `RulePreviewLock` below updates live with the edited window (`:60`).
- Draft defaults `days [1..5]`, `allDay false`, `start 540` (9 AM), `end 1260` (9 PM) (`src/features/rules/scheduleDraft.ts:6-13`); validation at `:23-37`.
- Answers written: `days`, `allDay`, `startMinute`, `endMinute` (`scheduleDraft.ts:38-40`, applied in `OnboardingRoute.tsx:28-31`).

### S2 — "Setting up your plan…"
`src/features/rules/PlanBuild.tsx:10-41`. Heading `planCopy.S2`. A `LivingIcon` of the activity and a three-item `Checklist` of **real** facts: activity title, `ruleName(rule)`, `scheduleLabel(rule.schedule)` (`:35-38`). Ticks land at 400/800/1200 ms and the screen auto-advances at 1500 ms; under reduced motion all three tick at 180 ms and it advances at 320 ms (`:18-30`). Continue is hidden (`OnboardingRoute.tsx:55`). Timers are cleared on unmount (`:29`).
- **Naming/behaviour mismatch:** the screen says the plan is being set up, but the rule is only written to `rulesStore` on leaving S3 (`OnboardingRoute.tsx:33`). If the user backs out at S3 nothing was ever saved.

### S3 — Plan summary
`src/features/rules/PlanSummary.tsx:12-72`. Heading "Your plan is ready" / "A little movement. More room for your life." (`content/plan.ts:10-11`).
- Rows: **Activity & goal** (value `ruleName`, edit target from `goalStep(draft)` — `plan.ts:33-37`), **Walking place** (walking only, value from `planCopy.places`), **Days & times** (value `scheduleLabel`, edit → `S1`). Each row has an "Edit" affordance whose accessible label is "Edit goal" / "Edit place" / "Edit schedule" (`:53-60`, `content/plan.ts:15-19`).
- Footnote: "Unlocks your apps for the rest of the day" or, for walking-state rules, "Apps stay open while you walk" (`:66-68`).
- Continue label is overridden to **"Use this plan"** (`OnboardingRoute.tsx:54`, `content/plan.ts:22`); pressing it runs `commitPlan`.
- `PlanSummary` calls `toRule` at render (`:21`) which **throws** on an invalid draft — the guard is `OnboardingRoute.tsx:37-38` (`if (!focused) return null`) plus the edit-snapshot restore. Covered by `__tests__/activity-branches.test.tsx:55-99`.

### `commitPlan`
`src/features/rules/plan.ts:10-32`: writes the validated `Rule` into `rulesStore` replacing by id (`:13-14`); copies `name` (trimmed), `referralSource`, `ageBand`, `occupation`, `improveFirst`, `mainReason`, `estimatedDailyMinutes`, `units` into `profileStore` (`:15-27`); stamps `ruleId`, `ruleCreatedAt`, `ruleCommitted:true` back into onboarding answers (`:28-30`).

### S4 — Review warm-up
`src/features/rules/ReviewWarmup.tsx:10-42`. Heading "Help us make ExcerLock better" / "How does your plan feel so far?" (`content/plan.ts:23-24`). Five star buttons, `accessibilityRole="radio"`, labels "1 star"…"5 stars" (`:17-24`, `content/plan.ts:27`); helper "Your feedback helps us improve the experience."; a tertiary **"Not now"** button that just advances.
- Writes `profileStore.warmupRating` (`:23`). **No native `StoreReview` request exists anywhere** — the screen is purely a local rating capture (`src/features/rules/README.md:7`).
- The rating is never read except by this screen itself (`:11`).

### T1–T4 — Trial story
`src/features/subscription/TrialScreen.tsx:10-76`, copy `src/content/subscription.ts`.
- **T1** "Try ExcerLock free" / "Make space for movement and the things that matter." + the offer label `7-day free trial` read from `runtime.subscription.entitlement().offer` (`:13`, `:33-35`) + three benefit rows: "Exercise to unlock your apps", "Blocking that fits your schedule", "See your progress build" (`subscription.ts:6-10`).
- **T2** "We'll remind you before it ends" / "A heads-up, so you can decide what comes next." + the big line "2 days before your trial ends".
- **T3** "Want a trial reminder?" / "Get a reminder before your free trial ends." + a card repeating the reminder + **"Enable reminders"** (calls `runtime.notifications.request()` then advances, `:14-20`) and tertiary **"Maybe later"**. `hideContinue` is true for T3 (`OnboardingRoute.tsx:55`), so these two buttons are the only exits.
- **T4** "How your free trial works" + `TrialTimeline` (`design-system/TrialTimeline.tsx:6-36`) with "Today · Start your free trial and make your plan.", "Day 5 · Reminder …", "Day 7 · Billing begins — Your subscription starts unless you cancel before the trial ends." (`subscription.ts:19-23`).
- **Nothing is ever scheduled.** `scheduleTrialReminder` exists on the port (`src/ports/NotificationsPort.ts:5`) and in the fake (`src/demo/fakes/NotificationsFake.ts:14`) but has **zero call sites in `src/` or `app/`** (verified by grep). T2/T3/T4 promise a Day-5 reminder that no code creates.
- The whole offer is a fixture: `src/content/subscription.ts:1-2` — "Phase 1 offer fixture only. Phase 2 must read Adapty's real offer and prices."

### `P` — hand-off to the paywall
`useOnboarding.ts:32` — reaching `P` does `router.replace('/paywall')`, and `PaywallSlot` immediately patches `{ step:'P', complete:true }` (`PaywallSlot.tsx:19`), which flips the `RootNavigator` guard and unmounts the whole onboarding stack (`RootNavigator.tsx:25`). Asserted by `__tests__/paywall-router.test.tsx:37-52` (`router.canGoBack()` is false, no Close button).

---

## 7. `/paywall`

`src/features/subscription/PaywallSlot.tsx:8-56` (controller) + `PaywallStandIn.tsx:6-72` (view).

**What the user can do**
- Pick one of three plans (`ChoiceRow`, radio): **Annual** "$–.–– / year · 7-day free trial" (*Recommended*), **Monthly** "$–.–– / month", **Lifetime** "$–.–– once" (`content/subscription.ts:26-30`). Prices are literal em-dashes.
- Press the primary CTA, labelled **"Start free trial"** when annual is selected and **"Continue"** otherwise (`PaywallStandIn.tsx:26`).
- Press tertiary **"Restore purchases"**.
- There is **no close/skip/back** — the route sets `gestureEnabled:false` (`RootNavigator.tsx:29`) and renders no dismiss control.

**States**
- idle; `busy === 'purchase'` (button spinner + alert-role line "Starting your plan…"); `busy === 'restore'` ("Restoring purchases…"); error/banner line with `accessibilityRole="alert"` (`:38-44`).
- Banners by entitlement (`PaywallSlot.tsx:45`): `expired` → "Your trial has ended. Choose a plan to keep going."; `billingIssue` → "There is a billing issue with your subscription. Restore access or choose a plan."
- Error strings: "Something went wrong. Please try again." (throw), "No active purchase was found." (restore miss), "Choose a plan to continue." (cancel) — `content/subscription.ts:36-41`.
- Static footnote: "Subscriptions renew automatically unless canceled. Manage or cancel your subscription in your App Store account."

**Behaviour / assumptions**
- Every action is serialised by a `running` ref and gated behind an artificial `t.motion.duration.purchase` = 800 ms delay (`:25-44`, `tokens.ts:110`).
- Placement is `setupComplete ? 'in_app' : 'onboarding'` (`:35`).
- `presentPaywall` **ignores the selected plan** (`src/demo/fakes/SubscriptionFake.ts:9-18`) and always grants a 7-day `trial`. Selecting **Lifetime** and pressing Continue produces a trial entitlement.
- `mounted` ref guards post-unmount `setState` (`:16-24,32,42`).
- `README` acknowledges the stand-in: `src/features/subscription/README.md:3` ("`PaywallSlot` supplies a local stand-in until Phase 2 mounts Adapty Paywall Builder"). `content/subscription.ts:44` carries a dev-only note "Paywall stand-in. Prices and the 7-day trial are placeholders. No purchase occurs."
- After success the entitlement change re-guards the stack and `BootGate`/`Redirect` sends the user to `/setup/X1` (asserted `__tests__/paywall-router.test.tsx:53-63`).

---

## 8. `/setup/[step]` — post-purchase setup X1–X5

`src/features/setup/SetupRoute.tsx:16-61`.
- Step resolution: `resumeSetup({ setupStep: params.step ?? state.setupStep, setupComplete: false })` (`:23`) — invalid ids fall back to `X1` (`src/onboarding/setupFlow.ts:7-13`).
- `activity` = `answers.activity ?? rules[0]?.activity ?? 'walking'` (`:24`).
- Effect: patches `setupStep`, calls `analytics.screen(step)` (`:25-28`).
- `advance()` (`:29-36`): dismisses keyboard, computes `nextSetup`, patches `{ setupStep, setupComplete: next==='done', complete: true }`, and `router.replace('/(tabs)/home')` at the end.
- `back()` (`:37-41`): moves to the previous `setupSteps` entry; `hideBack` on X1 (`:54`).
- Shell: `OnboardingShell` with progress `(index+1)/5` (`:51`), `hideContinue` on every step except X5 (`:56`), Continue label "Go to Home" (`:57`, `src/content/setup.ts:56`).

### X1 — Screen Time primer
`PermissionPrimer name="screenTime"` (`SetupRoute.tsx:42`, `PermissionPrimer.tsx:28-89`).
- Heading "Let ExcerLock block your apps" / "Your choices stay private. You stay in control." (`content/setup.ts:2-3`).
- Three fact rows: "Blocks the apps you choose", "Cannot see what you do in them", "Change your choices any time in Settings" (`setup.ts:4-8`, only rendered for screenTime, `PermissionPrimer.tsx:52-58`).
- States: **granted** → green "Access is on" + Continue; **denied/restricted** → grey explanation "Screen Time is off. ExcerLock cannot block your apps yet." + primary "Open Settings" + tertiary "Continue anyway"; **notDetermined** → primary "Allow Screen Time" (with spinner) + tertiary "Skip for now".
- "Open Settings" does **not** open Settings — it sets a local `note` flag that renders "You can change this permission in Settings. Your current choice stays as it is for now." (`:32,69-73,80`, `setup.ts:11-12`). Dead button relative to its label; there is no `Linking.openSettings` call anywhere in this file.
- Request path calls `runtime.screenTime.requestAuthorization()` (`:40`) → the fake presents an app-owned dialog (`src/features/permissions/FakePromptHost.tsx:6-18`, `design-system/FakeSystemPrompt.tsx:9-78` — "Allow"/"Don't allow", `content/controls.ts:17-18`).

### X2 — App selection
`src/features/setup/AppsSetup.tsx:10-39`.
- Heading "Which apps should wait?" / "Choose the apps and categories you want to unlock with movement." (`setup.ts:14-15`).
- A count line "N apps · M categories" (`src/content/pickers.ts:19-20`), a secondary **"Choose apps"** button calling `runtime.screenTime.presentAppPicker()` (`:14-22`, fake at `src/demo/fakes/ScreenTimeFake.ts:10-16`), a primary **"Continue"** disabled while nothing is selected, and a tertiary **"Skip for now"** that advances regardless (`:32-37`).
- The picker itself is a fake list of `Social/Games/Video/Messaging` categories and `App A…App F` (`src/content/pickers.ts:7-18`).

### X3 — Branch permission, or the gym picker
- `branchPermission` (`src/onboarding/setupFlow.ts:14-16`): walking → `motion`, gym → `location`, running/biking → `health`.
- `SetupRoute.tsx:44` — **when the activity is `gym`, X3 returns `<GymPickerScreen onSaved={advance} />` and bypasses `OnboardingShell` entirely.** Consequences:
  - no progress bar, no header back arrow, no "Skip for now";
  - `usePicker` starts on stage `'place'` (`src/features/gym-picker/usePicker.ts:10`) whose only header is absent (the header renders only for stage `'find'`, `GymPickerScreen.tsx:22-46`);
  - the only footer control is **"Save gym"**, disabled until a name exists (`:47-55`).
  → A gym user who does not want to save a gym here has **no way forward and no way back**. This is the most serious navigational hole in the entry flows.
  - The map defaults to `{41.884, -87.652}` (Chicago) when location is unavailable (`usePicker.ts:8,16`).
  - The `location` `PermissionPrimer` copy block (`PermissionPrimer.tsx:20-26`, `setup.ts:29-32`) is therefore **unreachable from setup** — `branchPermission` only returns `'location'` for gym, and that case is intercepted one line earlier.
- Non-gym X3 is the normal primer with activity-specific copy:
  - motion: "Let ExcerLock count your steps" / "Use your daily steps to make progress on your walking goals." / "Allow Motion & Fitness" / denied "Step progress cannot update while Motion & Fitness is off." (`setup.ts:18-21`).
  - health: "Read your workouts from Apple Health" / "Use completed running and biking workouts toward your goals." / "Allow Health access" / denied "Workout progress cannot update while Health access is off." (`setup.ts:22-25`).

### X4 — Sign-in (optional)
`src/features/setup/SignInScreen.tsx:11-129`.
- Already signed in → heading "Save your progress", check icon, the email, and Continue (`:54-62`).
- `phase === 'options'`: primary **"Continue with Apple"**, secondary **"Continue with Google"**, secondary **"Continue with email"**, plus a tertiary **"Skip for now"** (`:95-105,126`).
- `phase === 'email'`: `TextField` "Email address" with `autoCapitalize="none"`, `keyboardType="email-address"`, `autoComplete="email"`, `autoFocus`; inline error "Enter a valid email address." while the regex fails; **"Send code"** disabled until valid; a tertiary "Back to sign-in options" (`:81-91,115-125`).
- `phase === 'code'` → `EmailCodeScreen.tsx:6-45`: heading "Check your email" / "Enter the six-digit code to save your progress.", a numeric `TextField` "Verification code" (digits only, max 6, `textContentType="oneTimeCode"`), **"Verify code"** disabled until 6 digits, tertiary **"Resend code"**, success note "A new code is ready." and error text from the parent.
- Errors: "Could not sign in. Please try again.", "That code did not work. Please try again.", "Sign-in was canceled. You can try again or skip for now." (`setup.ts:49-52`).
- Fake auth: any provider succeeds unless the dev outcome is `cancel`; the email code must literally be `123456` (`src/demo/fakes/AuthFake.ts:8-28`, documented at `src/features/setup/README.md:5`).
- **Neither `analytics.identify` nor `subscription.identify` is called after a successful sign-in** — grep finds no call sites outside the fakes/ports. The "Save your progress" promise has no sync behind it in Phase 1 (`SyncFake` is wired into the runtime but not touched here).

### X5 — Completion
`src/features/setup/SetupComplete.tsx:9-36`. Heading "You're all set" / "Your plan is ready. You can finish any skipped steps in Settings." (`setup.ts:54-55`).
- A five-item `Checklist` whose ticks read **actual store state** (`:26-32`): Screen Time access, Apps selected, the branch permission row, Trial reminder (`permissions.notifications === 'granted'`), Progress saved to an account (`session.kind === 'signedIn'`). Labels at `setup.ts:57-65`.
- The only control is the shell's Continue, labelled **"Go to Home"**, which sets `setupComplete: true` and replaces to `/(tabs)/home`.
- **Unchecked rows are informational only** — there is no per-row retry, and nothing links to Settings despite the body copy.

### Dead component
`src/features/setup/GymSetup.tsx:12-88` — a full gym-setup screen (saved-place list, "Choose a gym", location allow/denied handling, an "Auto-detect arrivals" `Switch` calling `runtime.gym.enableAutoDetect()`, and the "Allow location access all the time…" explanation) — **is not imported anywhere** (grep: the only hit is its own definition). Its copy keys (`gymTitle`, `gymBody`, `chooseGym`, `autoDetect`, `autoDetectBody` — `setup.ts:26-34`) are consequently unreachable in the shipped flow. The always-on location upgrade described in `src/features/setup/README.md:3` is therefore not reachable from setup.

---

## 9. `/sign-in`

`app/sign-in.tsx:5-14` — a `fullScreenModal` (`RootNavigator.tsx:37`) rendering `SettingsPage` + `SignInScreen`, where both `onBack` and `onContinue` simply `r.back()`. Guarded behind entitlement **and** `setupComplete`, so it is a post-setup route; the onboarding-time sign-in is the sheet inside `WelcomeFooter`.

---

## 10. Stores written by these flows

### `onboardingStore` — `src/state/onboardingStore.ts:4-26`
Shape `{ step, answers, complete, setupStep, setupComplete }`, defaults `{ 'O01', {}, false, 'X1', false }` (`:18`), persisted to AsyncStorage key `excerlock-next.onboarding.v1` (`src/state/createPersistedStore.ts:25`).
Validators (`:11-25`):
- `step` must match `/^(O(0[1-9]|1[0-9]|20)|W[1-3]|G[12]|[RB][12]|D|S[1-4]|T[1-4]|P)$/` — note this permits `O19`, which the flow graph does not contain.
- `setupStep` matches `/^(X[1-6]|done)$/` — permits `X6`, which `setupSteps` does not contain (`setupFlow.ts:2`); `resumeSetup` would silently reset such a value to `X1`.
- `answers` must be a plain object **every** value of which is a string ≤500 chars, a number in `[0, 30000]`, a boolean, or an array of numbers in `[0,6]` (`:13-15`, `src/state/validation.ts:3-12`).

Keys written into `answers` across the flows: `name` (O04), `referralSource`/`ageBand`/`occupation`/`improveFirst`/`mainReason` (O05–O09), `estimatedDailyMinutes` (O10), `activity` (O20), `walkPlace`/`walkingMode`/`stepGoal` (W1–W3), `gymMode`/`gymMinutes` (G1/G2), `runMode`/`runMinutes`/`runDistance`/`runUnit` or `bikeMode`/`bikeMinutes`/`bikeDistance`/`bikeUnit` (R/B/D — `OnboardingRuleScreen.tsx:19,38-46`), `days`/`allDay`/`startMinute`/`endMinute` (S1), `ruleId`/`ruleCreatedAt` (`useOnboarding.ts:21-24`), `ruleCommitted` (`plan.ts:30`), and `returnTo`/`editBackup` (`useOnboarding.ts:52-58`).

**Suspected bug — the edit snapshot can silently break the store.** `createPersistedStore.patch` validates each top-level key and *keeps the previous value* when a validator fails (`createPersistedStore.ts:8-16,21`). `answers` fails wholesale if any single value fails. `editBackup` is `JSON.stringify(answers)` (`useOnboarding.ts:55`) and `v.text` caps strings at 500 characters (`validation.ts:3`). A realistic completed answer set serialises to **436–589 characters** (measured: a walking set with committed rule = 457; a running/distance set with all branch keys = 589). Once the snapshot crosses 500 chars, pressing **Edit** on the plan summary silently discards the entire `answers` patch, so the backup is never stored and Back from the edit target restores nothing (`useOnboarding.ts:62-69` parses `'null'` and falls through). The existing test (`src/features/rules/__tests__/activity-branches.test.tsx:55-79`) uses a four-key answer object and so never crosses the limit.

### `entitlementStore` — `src/state/entitlementStore.ts:4-13`
`{ entitlement: { status, renewsAt } }`, default `{ status:'none', renewsAt:null }`, statuses `unknown|none|trial|active|expired|billingIssue`. Written only by the subscription fake (`src/demo/fakes/SubscriptionFake.ts:15,26,30`) and by dev controls (`FakeRuntime.ts:112-115`). Read by `BootGate.tsx:12`, `RootNavigator.tsx:11`, `PaywallSlot.tsx:10`.

### `sessionStore` — `src/state/sessionStore.ts:4-8`
`{ session: { kind:'anonymous' } | { kind:'signedIn', provider, email } }`. Written only by `AuthFake` (`src/demo/fakes/AuthFake.ts:11,31,35`). Read by `SignInScreen.tsx:13` and `SetupComplete.tsx:12`.

### `profileStore` — `src/state/profileStore.ts:5-29`
Defaults include `estimatedDailyMinutes: 180`, `improveFirst: 'exercise'`, and `units` derived from the device locale — **`Intl.DateTimeFormat().resolvedOptions().locale.endsWith('-US') ? 'mi' : 'km'`** (`:4`). Written by `commitPlan` (`plan.ts:15-27`) and by `ReviewWarmup` (`warmupRating`, `ReviewWarmup.tsx:23`). Read by `useAnalytics` for the reclaimed-time baseline (`src/state/selectors.ts:77`).

### Others touched incidentally
`rulesStore` (the rule + `lockedApps`), `permissionsStore`, `settingsStore` (`units`, `gymPlaces`), `ruleDaysStore` — all persisted through the same helper and hydrated together (`src/state/stores.ts:9-21`).

---

## 11. Rule shapes onboarding can create, and where each is validated

| Activity | Mode chosen at | Resulting `RuleMode` | Goal field | Range |
|---|---|---|---|---|
| walking | W2 "Reach a step goal" | `{kind:'target', activity:'walking', metric:'steps', goal, place}` | W3 | 500–30 000, ×500 |
| walking | W2 "Unlock while walking" | `{kind:'state', activity:'walking', place}` | — | — |
| gym | G1 "Spend time at the gym" | `{kind:'target', activity:'gym', metric:'minutes', goal}` | G2 | 10–180 |
| gym | G1 "Arrive at the gym" | `{kind:'event', activity:'gym', trigger:'arrival'}` | — | — |
| running | R1 "Run for a set time" | `{kind:'target', activity:'running', metric:'minutes', goal}` | R2 | 5–300 |
| running | R1 "Run a set distance" | `{kind:'target', activity:'running', metric:'distance', goal, unit}` | D | 0.25–30 mi / 0.5–50 km |
| biking | B1 "Bike for a set time" | `{kind:'target', activity:'biking', metric:'minutes', goal}` | B2 | 5–300 |
| biking | B1 "Bike a set distance" | `{kind:'target', activity:'biking', metric:'distance', goal, unit}` | D | 1–120 mi / 1–200 km |

- Place (`outside | treadmill | either`) is only asked for walking (W1) and only appears in walking modes (`draft.ts:69-72`, `domain/types.ts:15-16`).
- Schedule shape: `{ days: Weekday[], window: {kind:'allDay'} | {kind:'range', startMinute, endMinute} }` (`domain/types.ts:28-34`), produced by `toSchedule` (`scheduleDraft.ts:17-22`).
- Three layers of validation:
  1. **Field-level, live** — `goalRange`/`validGoal` (`src/features/rules/goalRange.ts:2-8`) and the hard-coded walking bounds in `WalkingScreen.tsx:19`.
  2. **Step gate** — `canContinue` (`src/onboarding/validation.ts:6-31`) disables the Continue button.
  3. **Domain gate** — `validateRule` (`src/domain/validateRule.ts:5-77`), invoked by `toRule` (`draft.ts:91-93`), which throws. It re-implements the same numeric ranges (`:32-47`) and the same schedule window rules (`:52-76`). **The ranges are duplicated in three places** (`goalRange.ts`, `validation.ts`, `validateRule.ts`) with no shared constant — a drift hazard.
- What onboarding **cannot** create: multiple rules (only one rule is ever committed, `plan.ts:13-14`), a paused rule (`enabled` is always `true`, `draft.ts:33`), a walking rule with a distance goal, a gym rule with both arrival and time, or per-day schedules.

---

## 12. State coverage matrix for the entry flows

| State | Where it exists | Where it is missing |
|---|---|---|
| **Loading** | Boot splash (`BootScreen`); button spinners (`PrimaryButton.tsx:52-56`) on permission request, send code, verify, purchase/restore, save gym; "Starting your plan…"/"Restoring purchases…" alert lines (`PaywallStandIn.tsx:58-64`); `ActivityIndicator` in the gym search (`FindStep.tsx:90`) | No loading state on any onboarding step; no skeletons |
| **Empty** | App-selection count reads "0 apps · 0 categories" and gates Continue (`AppsSetup.tsx:27-35`); gym search "No matches…" (`gymPicker.ts:12`) | No empty state anywhere else — the flows are all fixture-driven |
| **Error** | Name too long; number-field range hints; schedule day/window errors; sign-in/code errors; paywall error + banner; gym search/save errors (`gymPicker.ts:19-26`) | No error state for boot/hydration failure; no error if `toRule` throws (an uncaught render throw); no handling of a failed `presentAppPicker` beyond clearing `busy` |
| **Denied permission** | `PermissionPrimer` denied branch for screenTime/motion/health/location (`PermissionPrimer.tsx:64-68,79-85`); X5 checklist shows unchecked rows | The gym X3 path has no denied state at all (the primer is bypassed); "Open Settings" doesn't open Settings |
| **Offline** | — | **Absent.** No network-state check, no offline copy, no retry-on-reconnect anywhere in `src/features/onboarding`, `setup`, `subscription`, `launch` (checked all four directories). Sign-in and purchase failures collapse into generic "try again" strings |
| **Reduced motion** | Handled pervasively: `useMotion` zeroes distances/scales (`src/motion/useMotion.ts:3-20`); shell transitions become fades (`OnboardingShell.tsx:44-49`); nav animation becomes `fade` (`RootNavigator.tsx:19`); the impact sequence stops auto-advancing and reveals Continue instantly (`useImpactPlayback.ts:14,25,29`); `HabitLoop`/`LoopArrows`/`ImpactDots`/`TrendCurves`/`ProgressCurve`/floating tiles all branch on `m.reduced` | — |
| **Dynamic type** | `Label` sets `maxFontSizeMultiplier` 1.6 (2 for body) (`design-system/Label.tsx:13`, `tokens.ts:97`); text fields cap at 2× (`TextField.tsx:45`, `NameField.tsx:37`); O02/O03 divide the top padding by `fontScale`; `WelcomeArtwork`/`ProgressArtwork` grow with `fontScale` | O01 does **not** divide its `headingTop` by `fontScale` (`O01.tsx:11` vs `O02.tsx:27`); `HabitLoop` node boxes, `LoopStory` heading well, `RulePreviewLock`'s fixed 288×240 frame and 0.78 scale, and the absolutely-positioned `FreeTimePercentage` are fixed-pixel and will clip at large sizes |
| **Landscape / tablet** | `app.json:7` locks portrait, `supportsTablet:false` | — |

---

## 13. Runtime assumptions of the entry flows

- **Everything is fake.** `createRuntime` throws for `EXPO_PUBLIC_RUNTIME==='real'` (`src/runtime/createRuntime.ts:9`) and otherwise returns `FakeRuntime()`; only `ForegroundGym` and native gait are layered on for iOS devices (`:11-14`).
- Permission prompts are app-drawn, not system (`src/features/permissions/FakePromptHost.tsx:6-18`, `src/features/permissions/README.md:1-3`).
- `analytics.screen(step)` is emitted for every onboarding step, every setup step, and `'P'`; nothing else is instrumented in these flows — no `track`, no `identify` (grep-verified).
- Entitlement, session, permissions and locked apps all live in local persisted stores; the entry flows read them synchronously and never reconcile with a server.
- `TimeSheet` depends on `@react-native-community/datetimepicker`'s `onValueChange` and `accentColor`/`themeVariant` props (`TimeSheet.tsx:19-29`) — iOS-shaped.
- The paywall assumes `subscription.entitlement().offer` exists (`TrialScreen.tsx:13`) — Phase 2 must supply an equivalent from Adapty.
- `RulePreviewLock` and `BlockingScheduleCard` assume `react-native-svg` + `expo-linear-gradient`; the loop story loads `assets/running-lock-primary.png` (`scenes/LoopBrandMark.tsx:8`).

---

## 14. Half-built, dead, or over-promising — consolidated

1. **Gym X3 is a trap** — `SetupRoute.tsx:44` renders the gym picker with no back, no skip and no progress; the only exit is "Save gym" (`GymPickerScreen.tsx:47-55`, `usePicker.ts:10`).
2. **`GymSetup.tsx` is dead code** (`src/features/setup/GymSetup.tsx:12`) — no importer; with it, the always-on location upgrade and its copy (`setup.ts:26-34`) are unreachable.
3. **The `location` permission primer is unreachable in setup** — intercepted by the gym branch one line earlier (`SetupRoute.tsx:44-45`).
4. **"Open Settings" doesn't open Settings** — it toggles an explanatory note (`PermissionPrimer.tsx:80` / `GymSetup.tsx:53` / `src/features/settings/PermissionDetail.tsx:26`). The app *does* know how: `src/features/unlock/GymUnlockScreen.tsx:67` calls `Linking.openSettings()` for the same-labelled button. The entry flows just never wired it up.
5. **Trial reminders are never scheduled** — T2/T3/T4 promise a Day-5 reminder; `scheduleTrialReminder` has zero call sites.
6. **Sign-in at the welcome screen does nothing but close a sheet** (`WelcomeFooter.tsx:55`) — no entitlement restore, no onboarding skip, no identify. A returning subscriber repeats the whole flow.
7. **Plan selection is cosmetic on the paywall** — Lifetime/Monthly still yield a 7-day trial (`SubscriptionFake.ts:11-15`); prices are literal `$–.––`.
8. **S2 "Setting up your plan…" precedes the actual save** (`OnboardingRoute.tsx:32-35`).
9. **`O19` is a hole in the step sequence** with no explanation (`flow.ts:2-22`; only `flow.test.ts:3-4` mentions it).
10. **`editBackup` can exceed the 500-char persistence limit** and silently void the whole `answers` patch (see §10).
11. **Legal text is a placeholder** — `src/content/legal.ts:1`.
12. **Back on O02/O03 is only the pagination dots** (`O02.tsx:38-47`, `OnboardingShell.tsx:56`) — no header, no arrow.
13. **Dead copy keys in `src/content/onboarding.ts`** (grep-verified zero references outside the file): `hours`, `hoursUnit`, `hourUnit` (`:35-37`), `yearGrid`, `freeGrid`, `scrollGrid` (`:40-42`), `illustrative` (`:43`), `today`, `future` (`:46-47`), `introStatus` (`:50`), `yourSchedule`, `yourExercise`, `yourApps`, `steps`, `gym` (`:51-55`), `principles` (`:56-60`), `loopLabels` (`:61-65`). Also `activities.ts`'s `support` strings are never rendered.
14. **Copy inconsistency O03 vs O20** — "Cycling"/"Strength training" (`content/welcome.ts:7`) vs "Biking"/"Gym" (`content/activities.ts:3-5`).
15. **"You can change it later" (O08) and "This helps us tailor your plan" (O06)** are unbacked: `improveFirst`, `ageBand`, `occupation`, `mainReason` are stored and never read.
16. **`workoutCopy.support` ("Unlocks your apps for the rest of the day") is shown under "Arrive at the gym"** (`WorkoutModeScreen.tsx:34-36`), where the rule is an event rather than a daily target.
17. **Unknown-step fallback renders the raw id** (`PreBranchScreen.tsx:29`).
18. **Dead branch:** `OnboardingShell.tsx:71`'s `step === 'O01' ? c.start` can never execute.
19. **`useOnboarding.ts:22` mints the shared rule id with `createDraft('walking')`** regardless of the chosen activity — harmless today because only `id`/`createdAt` survive, but it is a latent surprise.
20. **`onboardingStore` validators accept ids the flow cannot produce** — `O19` and `X6` (`onboardingStore.ts:12,23`).
21. **Deleted file still referenced in a README:** `src/features/onboarding/welcome/BlockingTimeline.tsx` is deleted in the working tree (git status) while `welcome/README.md:4` still describes a "timeline" component; the surviving timeline lives at `src/design-system/BlockingTimeline.tsx`.

---

## 15. Test inventory for these flows (and its blind spot)

Files read: `src/features/launch/__tests__/boot.test.tsx`; `src/features/onboarding/__tests__/{router,forms,finish-prebranch,intro,intro-scenes,story,impact,impact-playback,time-scenes}.test.*`; `src/onboarding/__tests__/{flow,validation}.test.ts`; `src/features/rules/__tests__/{activity-branches,walking,walking-router,workout-goals,schedule-screen,plan-router,plan-build,rule-preview}.test.*`; `src/features/setup/__tests__/{setup-router,primers,setupFlow,sign-in}.test.*`; `src/features/subscription/__tests__/{paywall-router,subscription,trial}.test.*`.

Covered: every pre-branch step renders/advances/returns through the real router (`onboarding/__tests__/router.test.tsx:32-46`); resume from persisted state (`:56-65`); all eight branch paths reach a valid rule (`rules/__tests__/activity-branches.test.tsx:19-46`); edit round-trips (`plan-router.test.tsx:25-41`); schedule errors and cross-midnight labels; all four denied primers; email code error/resend/success and Apple/Google cancellation; hard paywall history removal, 800 ms purchase, restore outcomes, billing errors; X3 branch resume for three scenarios and the X5 checklist.

**Blind spot:** `jest.setup.ts:3-10` mocks `useReducedMotion` to return **`true` globally**. Every rendered test therefore runs in reduced-motion mode. The default, motion-on experience — the O12/O13 auto-advance, the O11/O14 Continue gating, the `HabitLoop` node relocation, the shell slide transitions — is only exercised by the two suites that mock `useMotion` themselves (`onboarding/__tests__/impact-playback.test.tsx:3`, `rules/__tests__/plan-build.test.tsx:5-8`). Nothing renders the timed onboarding story through the real router with motion enabled.

---

## 16. Explicit absences (directories checked)

- No offline/connectivity handling in `src/features/onboarding`, `src/features/setup`, `src/features/subscription`, `src/features/launch` — **absent**.
- No `Linking.openSettings` / deep link to iOS Settings in `src/features/setup` — **absent** (the only call site in the repo is `src/features/unlock/GymUnlockScreen.tsx:67`).
- No `NetInfo` / `isConnected` usage anywhere in `src/` or `app/` — **absent** (the only "offline" token is a mocked rejection message in `src/features/gym-picker/__tests__/picker.test.tsx:36`).
- No `StoreReview` / native review request anywhere under `src/features` — **absent** (S4 stores a local rating only).
- No `analytics.identify` or `subscription.identify` call sites outside `src/demo/fakes` and `src/ports` — **absent**.
- No `scheduleTrialReminder` call sites outside the port and fake — **absent**.
- No `O19` screen file in `src/features/onboarding/screens/` (files are `O01`–`O18`, `O20`) — **absent**.
- No `TODO`/`FIXME` markers in any of the audited directories; the only self-declared placeholders are `src/content/legal.ts:1`, `src/content/subscription.ts:1,44`, and `src/features/subscription/PaywallStandIn.tsx` (by name).
