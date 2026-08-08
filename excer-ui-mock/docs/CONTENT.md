# ExcerLock standalone prototype — implementation-ready content catalog

Status: implementation contract for the looks-only Expo prototype
Target translation layer: excer-ui-mock/src/content
Fixture date: 2026-08-07
Authority order: excer-ui-mock/DESIGN.md → excer-ui-mock/docs/DESIGN_SYSTEM.md → excerlock-app-prd.md → the three Pillow audits.

## 1. Content contract

This document owns visible copy and hardcoded demo data. It does not authorize real permissions, app blocking, health reads, location reads, purchases, account changes, exports, messages, browser opens, or shares.

Binding voice rules:

- Sell the payoff: movement, room, time, and choice.
- State the conclusion before the evidence.
- Use cause → consequence → recovery for negative states.
- Never use guilt, punishment, red-alert language, fake scarcity, countdowns, fake testimonials, or fake usage claims.
- Prefer “could,” “would,” “preview,” and “sample” anywhere a real system capability might otherwise be implied.
- Preserve the surrounding shell in empty, loading, denied, and failed states.
- Use “Couldn’t verify” or “No data found,” not “You failed.”
- Walking grants access while movement holds; balance still drains normally.
- No rate condition has a daily cap.
- Apple Health is the only fitness-data source named in v1.
- Notification permission is never requested during onboarding.
- Never put names, app names, gym/location details, or health values on share cards.
- Purchase success opens simulated Signup before Home; every auth state is local-only.
- Natural first Home and Manage start with zero conditions. Seeded cards are debug/showcase fixtures only.
- “Balance on hold” belongs only to access holidays; walking always uses normal drain.

Suggested module split:

~~~text
src/content/
  common.ts
  auth.ts
  demo-fixtures.ts
  onboarding.ts
  paywall.ts
  home.ts
  conditions.ts
  sessions.ts
  manage.ts
  analysis.ts
  lock-moments.ts
  settings.ts
  simulated-native.ts
~~~

Suggested shared types:

~~~ts
type SurfaceKind =
  | "brand"
  | "brandedSheet"
  | "focusedChoice"
  | "nightSession"
  | "shieldPreview"
  | "simulatedNative"
  | "localBrowser";

type ActionCopy = {
  label: string;
  accessibilityLabel?: string;
  disabledReason?: string;
};

type ScreenCopy = {
  id: string;
  route: string;
  surface: SurfaceKind;
  eyebrow?: string;
  title: string;
  body?: string;
  operationalNote?: string;
  primary?: ActionCopy;
  secondary?: ActionCopy;
  tertiary?: ActionCopy;
  simulatedNativeId?: string;
};

type ContentOption = {
  id: string;
  label: string;
  subtitle?: string;
  value: string | number | null;
  destructive?: boolean;
};

type DemoFixture<T> = {
  dataOrigin: "fixture";
  renderedBadge?: "Sample data" | "Prototype preview";
  value: T;
};

type PermissionStatus = "notAsked" | "allowedInDemo" | "needsAttention";
type ConditionKind = "event" | "state" | "rate";
type AccountStatus = "postPurchase" | "signedInDemo" | "signedOutDemo";
type AccessHolidayKind =
  | "restOfDay"
  | "setPeriod"
  | "restDayNoLocking"
  | "outsideLockWindow";
type ReviewPromptState =
  | "eligible"
  | "suppressedAfterShield"
  | "shown"
  | "stoppedAfterThree"
  | "stoppedByManualRate";
type NotificationEntryKind = "afternoonNudge" | "weeklyRecap" | "streakLastCall";
type HeatCellKind =
  | "event"
  | "rate"
  | "state"
  | "missed"
  | "rest"
  | "blank";
~~~

## 2. Common copy and demo identity

~~~ts
export const commonCopy = {
  appName: "ExcerLock",
  pitch: "Earn your screen time.",
  tabs: {
    home: "Home",
    manage: "Manage",
    analysis: "Analysis",
    settings: "Settings",
  },
  actions: {
    back: "Back",
    cancel: "Cancel",
    close: "Close",
    continue: "Continue",
    done: "Done",
    next: "Next",
    save: "Save",
    retry: "Try again",
    instructions: "Instructions",
    notNow: "Not now",
  },
  fixtureLabels: {
    sampleData: "Sample data",
    prototypePreview: "Prototype preview",
    localOnly: "Saved only in this demo",
  },
  emptyValue: "—",
  unavailableValue: "N/A",
};
~~~

Canonical route titles. `null` means the route intentionally has no visible navigation title; use its visible wordmark as the accessibility screen name. Dynamic routes derive their title only from the named fixture field.

~~~ts
export const screenTitles = {
  splash: null,
  onboardingValue: "Earn your screen time.",
  onboardingConfession: "How much time do you spend on your phone each day?",
  onboardingMirror: "That’s about 76 days a year.",
  onboardingPrivacy: "Your activity stays yours.",
  onboardingScreenTime: "Choose the apps that can wait.",
  onboardingApps: "Choose apps to place behind the lock.",
  onboardingMotion: "Keep apps open while you walk.",
  onboardingHealth: "Let workouts you already record earn time.",
  onboardingLocation: "Check in when you arrive.",
  onboardingAllowance: "Choose your daily free time.",
  onboardingReview: "Your setup.",
  onboardingDone: "Your lock is ready to help.",
  home: "Home",
  homeBalance: "Today’s balance",
  homeCondition: "{conditionName}",
  manage: "Manage",
  analysis: "Analysis",
  settings: "Settings",
  paywall: "ExcerLock Premium",
  paywallIncluded: "What’s included",
  signup: "Save your setup",
  signupEmail: "Use your email",
  signin: "Sign back in",
  conditionCatalog: "Choose a way to earn",
  conditionPlace: "Choose a gym",
  conditionState: "Set the walking rule",
  conditionRate: "Set the exchange",
  conditionEvent: "Set the goal",
  conditionReward: "Choose the reward",
  conditionBanner: "Choose card artwork",
  conditionPreview: "Preview your condition",
  conditionEdit: "Edit condition",
  walkReady: "Ready to walk?",
  walkVerifying: "Finding your walking rhythm…",
  walkActive: "Walking",
  walkPaused: "Walking paused.",
  walkGrace: "Keep moving.",
  walkComplete: "Walk complete.",
  walkEnded: "Walking ended.",
  walkPermission: "Walking couldn’t start.",
  gymReady: "Check in at Harbor Strength.",
  gymVerifying: "Checking your location…",
  gymVerified: "You’re at the gym.",
  gymFailed: "Couldn’t verify this check-in.",
  gymInstructions: "Check the location preview",
  lockedApps: "Locked apps",
  rules: "Rules",
  dailyAllowance: "Daily free allowance",
  rollover: "Carry unused time forward",
  streakPolicy: "When I miss an active day",
  savedGyms: "Saved gyms",
  savedGymDetail: "{gymName}",
  gymDetectionMode: "Check-in mode",
  gymAutoDetect: "Make check-ins hands-free",
  weeklyRules: "Weekly rules",
  weeklyDay: "{weekday}",
  weeklyLockWindow: "Lock window",
  plannedDayOff: "Add a planned day off",
  todayOverride: "Today needs a rest day",
  analysisTrend: "Time Reclaimed",
  analysisEarning: "Earning",
  analysisDay: "{formattedDate}",
  analysisBadge: "{badgeName}",
  shareAchievement: "Share achievement",
  notificationNudgePreview: "Your screen time is waiting",
  notificationRecapPreview: "You reclaimed 6h 20m this week",
  notificationLastCallPreview: "12-day streak on the line",
  timeOut: "Time’s up—for now.",
  shield: "{shieldVariantTitle}",
  permissions: "Permissions",
  aboutPermissions: "About permissions",
  permissionDetail: "{permissionName}",
  account: "Account",
  subscription: "Manage Subscription",
  notifications: "Notifications",
  general: "General",
  appearance: "Appearance",
  language: "Language",
  dayBoundary: "Day boundary",
  startWeek: "Start week on",
  units: "Units",
  connections: "Connections",
  appleHealth: "Apple Health",
  shortcuts: "Siri & Shortcuts",
  manageData: "Manage data",
  help: "Help & FAQ",
  contact: "Contact support",
  bug: "Report a bug",
  idea: "Request a feature",
  diagnostics: "Send diagnostics",
  about: "About ExcerLock",
  rate: "Rate ExcerLock",
  reviewPrompt: "Enjoying ExcerLock?",
  whatsNew: "What’s new",
  follow: "Follow ExcerLock",
  credits: "Credits",
  terms: "Terms of Use",
  privacy: "Privacy Policy",
  debug: "Demo states",
} as const;
~~~

Demo identity and clock:

| Key | Exact fixture |
|---|---|
| Locale | en-US |
| Time zone | America/New_York |
| Current date | Friday, August 7, 2026 |
| Status-bar time | 9:41 |
| First name | Jordan |
| Account email | jordan@example.com |
| Simulated App Store account | j•••••@example.com |
| Install date | May 1, 2026 |
| App version | ExcerLock 1.0.0 (100) |
| Footer qualifier | Prototype |
| Saved gym | Harbor Strength |
| Secondary gym | Northside Community Gym |
| Selected demo apps | Loop, Clips, Orbit |
| Confessed daily phone time | 5 hours / 300 minutes |

Time formatting:

- Under 60 minutes: 10 min.
- One hour or more in compact data: 2h 05m.
- One hour or more in prose: 2 hours 5 minutes.
- Zero balance: 0 min left, never negative.
- Dates in rows: Aug 14, 2026.
- Dates in prose: August 14, 2026.
- Ranges: Jul 27–Aug 2.
- Percentages: whole numbers unless a chart tooltip needs one decimal.

## 3. Onboarding domain

Every onboarding permission page is branded. Every following iOS-looking prompt is a simulated-native surface with a visible prototype disclosure.

| ID / route | Exact screen copy | Actions and fixture |
|---|---|---|
| D-SPL-01 / | Wordmark: ExcerLock. Accessibility label: ExcerLock launch screen. | No action. |
| D-ONB-01 /onboarding/value | Title: Earn your screen time. Body: Move your body, earn a little room for the apps you choose. | Primary: Next. |
| D-ONB-02 /onboarding/confession | Title: How much time do you spend on your phone each day? Body: A rough answer is enough. It only shapes the sample insights ahead. | Live value after touch: 5 hours. Min: 1 hour. Max: 12+ hours. Primary: Next. Disabled reason before touch: Choose a rough daily amount to continue. |
| D-ONB-03 /onboarding/mirror | Eyebrow: At 5 hours a day. Title: That’s about 76 days a year. Body: No guilt. Just a little time worth taking back. | Primary: Take some back. |
| D-ONB-04 /onboarding/privacy | Title: Your activity stays yours. Body: This prototype keeps every choice inside this demo. It does not request permissions, read device activity, or send data anywhere. | Secondary link: Learn more. Primary: I accept. |
| D-ONB-05 /onboarding/screen-time | Title: Choose the apps that can wait. Body: In the full product, Screen Time access would place the apps you choose behind the lock. This prototype only previews that flow. Operational note: Without it, you can still explore every screen here—no real apps are blocked. | Primary: Continue. After denial: Review the preview whenever you’re ready. Actions: Try again, Continue without access. |
| D-ONB-06 /onboarding/apps | Title: Choose apps to place behind the lock. Body: Pick a few sample apps. Nothing on your device is shown or changed. | Search placeholder: Search sample apps. Selected count: 3 selected. Actions: Cancel, Done. Done disabled at zero: Select at least one sample app. |
| D-ONB-07 /onboarding/motion | Title: Keep apps open while you walk. Body: Preview a walking session that responds to movement. No motion or location is read in this prototype. Operational note: Balance would still drain normally while walking. | Secondary: Not now. Primary: Allow. |
| D-ONB-08 /onboarding/health | Title: Let workouts you already record earn time. Body: Preview how workouts in Apple Health could count toward your conditions. This prototype does not open or read Health data. | Secondary: Skip. Primary: Allow. |
| D-ONB-09 /onboarding/location | Title: Check in when you arrive. Body: A manual gym check-in could use while-in-use location. Auto-detect would be an optional hands-free upgrade. This prototype uses neither. | Secondary: Skip. Primary: Allow. |
| D-ONB-10 /onboarding/allowance | Title: Choose your daily free time. Body: This is the time your chosen apps would get before movement adds more. | Initial value: null. Guided fixture after selection: 45 min. Derived sentence: Apps would lock after 45 minutes, then open again when you earn time. Primary: Done. Disabled reason at null: Choose an allowance to continue. |
| D-ONB-11 /onboarding/review | Title: Your setup. Body: One quick look before the lock is ready. | Rows: Locked apps — 3 selected; Daily free time — 45 min; Screen Time — Allowed in demo; Motion & Fitness — Allowed in demo; Apple Health — Allowed in demo; Location — Not now. Primary: Looks good. |
| D-ONB-12 /onboarding/done | Title: Your lock is ready to help. Body: You chose the apps, the allowance, and the ways movement can make room. | Primary: See plans. No Back. |

Privacy detail sheet:

- Title: About this prototype
- Body 1: Every value in this build is hardcoded sample data.
- Body 2: The prototype does not request Screen Time, Motion, Health, Location, or Notification access.
- Body 3: It does not identify installed apps, block apps, read workouts, read steps, check a location, create an account, or send analytics.
- Close: Done

Confession options:

~~~ts
export const phoneUseHours = [
  1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, "12+"
];
export const confessionFixture = {
  initial: null,
  guidedSelection: 5,
  annualHours: 1825,
  annualDaysRounded: 76,
};
~~~

Allowance range:

~~~ts
export const allowancePicker = {
  initial: null,
  minutes: { min: 0, max: 240, step: 5 },
  terminalOption: { id: "unlimited", label: "Unlimited", value: "unlimited" },
  zeroLabel: "0 min · Full Lock",
  formatterExamples: {
    5: "5 min",
    45: "45 min",
    60: "1 h",
    90: "1 h 30 min",
    240: "4 h",
  },
};
~~~

Sample app picker:

| Group | Row ID | Label | Subtitle | Initial state |
|---|---|---|---|---|
| Social | loop | Loop | Sample social feed | Selected |
| Social | circle | Circle | Sample community app | Off |
| Video | clips | Clips | Sample short videos | Selected |
| Video | watch | Watch | Sample streaming app | Off |
| Games | orbit | Orbit | Sample game | Selected |
| Games | blocks | Blocks | Sample puzzle game | Off |
| Other | browse | Browse | Sample web browser | Off |
| Other | shop | Shop | Sample shopping app | Off |

## 4. Paywall and subscription domain

### 4.1 Main paywall

~~~ts
export const paywallCopy = {
  eyebrow: "A plan built around movement",
  title: "ExcerLock Premium",
  body: "Build a screen-time plan that makes room for the workouts and walks you already want to do.",
  includedLink: "What’s included",
  cancellationNote: "Cancel anytime in the App Store.",
  restore: "Restore purchases",
  redeem: "Redeem code",
  terms: "Terms of Use",
  privacy: "Privacy Policy",
  prototypeDisclosure: "Prototype preview — no purchase will be made.",
};
~~~

Plan fixtures:

| Plan ID | Label | Price | Trial | Badge | CTA | Renewal disclosure |
|---|---|---:|---|---|---|---|
| annual | Annual | $59.99/year | 7 days free | 7 DAYS FREE · SAVE 50% | Start 7-day free trial | Then $59.99/year until cancelled. |
| monthly | Monthly | $9.99/month | None | None | Continue monthly | $9.99/month until cancelled. |

Annual is initially selected. The displayed $4.99/month equivalent is supporting copy only; billing copy remains $59.99/year.

Transparent timeline:

1. Today — Your 7-day free trial begins.
2. Day 7 — The annual plan begins at $59.99/year.
3. Anytime — Cancel in the App Store.

No trial-end reminder is promised. No countdown appears.

What’s included detail:

| Feature ID | Title | Body |
|---|---|---|
| locked-apps | One shared screen-time balance | Keep the apps you choose in one clear group instead of managing a separate timer for each one. |
| conditions | Ways to earn that fit your day | Use gym visits, walking, steps, workouts, distance, or active effort as conditions. |
| analysis | See the time you took back | Review sample trends, streaks, earning sources, and milestones in one place. |
| schedules | Rules for real life | Set active days, rest days, lock windows, and planned days off. |
| verification | Clear status and recovery | See what a condition needs, what the demo detected, and how to repair a missing permission. |

Lower proof cards use product facts, not testimonials:

- Title: One balance. Many ways to earn.
- Title: Rest days stay rest days.
- Title: Your setup stays yours.
- Repeated CTA: Start 7-day free trial or Continue monthly, matching selection.

### 4.2 Simulated purchase states

Simulated App Store confirmation:

- Product: ExcerLock Premium
- Selected annual line: 7 days free, then $59.99/year
- Selected monthly line: $9.99/month
- Account: j•••••@example.com
- Primary system action: Subscribe
- Secondary system action: Cancel
- Disclosure: Prototype preview — no charge, subscription, or App Store action will occur.

Processing copy:

- CTA: Preparing preview…
- Accessibility status: Purchase preview in progress.
- Repeat taps disabled.

Success:

- Title: You’re all set.
- Body: This demo has switched to the subscribed state. No purchase was made. One last step keeps the sample setup together.
- Action: Done
- Result: Dismiss the simulated Store alert, then open post-purchase Signup. Do not route directly to Home.

Recoverable purchase failure:

- Title: Purchase didn’t finish.
- Body: Nothing was charged in this prototype. Return to the plans and try the preview again.
- Actions: Try again, Back to plans

Restore states:

| State | Title | Body | Action |
|---|---|---|---|
| loading | Checking sample purchases… | This is a local prototype state. | Cancel |
| restored | Purchases restored | The subscribed demo state is ready. No App Store receipt was checked. | Continue |
| none | Nothing to restore | No sample purchase is attached to this demo state. | OK |

### 4.3 Post-purchase Signup and sign-in domain

Route / design ID: `/signup` · `D-AUTH-01`. Query mode `postPurchase` is required and has no Back; `mode=recovery&returnTo=account` is the signed-out Account recovery and returns to Account.

The purchase preview remains anonymous. A successful purchase always resolves through this simulated account step before Home. Restore success routes here only while identity is anonymous; an already signed-in fixture routes Home. Non-buyers never see Signup. Every auth-shaped surface carries `simulatedNative=true` and the visible disclosure below.

Shared auth fixture:

~~~ts
export const authFixture = {
  accountStatus: "postPurchase" as const,
  email: "jordan@example.com",
  maskedEmail: "j•••••@example.com",
  method: null as null | "apple" | "email",
  disclosure: "Prototype preview — no Apple or Clerk account is contacted or created.",
};
~~~

Post-purchase Signup:

- Eyebrow: Premium preview ready
- Title: Save your setup
- Body: Keep the plan and setup together in one sample profile. This prototype creates nothing outside the app.
- Status label: Demo account — nothing is sent
- Primary: Continue with Apple
- Divider: or
- Secondary: Continue with email
- Existing-account link: Already have an account? Sign in
- Footer: By continuing, you acknowledge the local Terms of Use and Privacy Policy previews.
- Disclosure: Prototype preview — no Apple or Clerk account is contacted or created.
- Required post-purchase mode: Back is absent/disabled. Purchase is already complete in the demo fixture.
- Recovery mode: Back returns to the signed-out Account page.

Simulated Apple branch:

- Sheet account: j•••••@example.com
- Primary: Continue
- Secondary: Cancel
- Processing label: Preparing demo profile…
- Cancel result: Return to Save your setup with the purchase fixture intact.

Email branch:

- Title: Use your email
- Body: Enter the address for the sample profile. No email will be sent.
- Field label: Email
- Placeholder: name@example.com
- Guided value: jordan@example.com
- Primary: Continue with email
- Disabled reason: Enter a complete email address.
- Secondary: Back
- Result after a valid email: Preparing demo profile… then Signup success. No code or message step appears.

Signup success:

- Title: Your demo profile is ready.
- Body: Jordan’s sample profile now holds the local setup. No account was created and nothing was uploaded.
- Primary: Start with Home
- Result: Route to the natural first Home with zero conditions and empty Analysis history.

Signup recoverable failure:

- Title: Couldn’t finish the signup preview.
- Cause: The local auth fixture is set to unavailable.
- Recovery: Your subscribed state and setup are still here.
- Required-mode action: Try again
- Recovery-mode actions: Try again, Back

Sign-in recovery, shared by Signup’s existing-account link and the signed-out Account page:

- Title: Sign back in
- Body: Reconnect Jordan’s sample profile to this local setup. No account service is contacted.
- Status label: Demo account — nothing is sent
- Primary: Continue with Apple
- Secondary: Continue with email
- Footer link: Need a demo profile? Create one
- Disclosure: Prototype preview — no Apple or Clerk account is contacted.
- Email entry reuses the exact Signup field and validation; the terminal email action is Sign in.
- Success title: You’re back in this demo.
- Success body: Jordan’s sample profile is connected to the local setup. Nothing was downloaded or changed outside the prototype.
- Success action: Done
- Failure title: Couldn’t finish the sign-in preview.
- Failure recovery: The local setup is still available. Try the sample sign-in again or go back.
- Failure actions: Try again, Back

### 4.4 Subscription management fixtures

~~~ts
export const subscriptionFixtures = {
  trial: {
    status: "Free trial",
    plan: "ExcerLock Premium · Annual",
    accessThrough: "Trial ends Aug 14, 2026",
    renewal: "$59.99/year after the trial",
  },
  active: {
    status: "Active",
    plan: "ExcerLock Premium · Annual",
    accessThrough: "Renews Aug 7, 2027",
    renewal: "$59.99/year",
  },
  cancelled: {
    status: "Cancelled",
    plan: "ExcerLock Premium · Annual",
    accessThrough: "Access through Aug 14, 2026",
    renewal: "Will not renew",
  },
};
~~~

Subscription page rows:

- Change or cancel subscription — Review the sample plan and cancellation flow.
- Restore purchases — Preview a restore result.
- Redeem code — Preview the App Store handoff.
- Help & FAQ — Billing and subscription answers.
- Learn more — See what Premium includes.

Cancellation reasons:

- Title: What could work better?
- Body: Choose the closest reason. This feedback stays in the current demo.

1. The subscription is too expensive.
2. I’m not using ExcerLock enough.
3. The earning rules don’t fit me.
4. I had trouble with permissions or verification.
5. Something else.

Optional comment placeholder: Tell us more, if you’d like.
Character count: 0/180
Continue disabled until a reason is selected.

Honest win-back fixture:

- Eyebrow: A lower annual option
- Title: Keep Premium for $29.99/year.
- Body: Same Premium features and the same 7-day trial. No timer and no deadline in this preview.
- Primary: Choose $29.99/year
- Secondary: No thanks
- Renewal: Then $29.99/year until cancelled.
- Never render LIMITED TIME or a countdown.

Cancellation confirmation:

- Title: Cancel the sample subscription?
- Body, trial fixture: Premium stays active through August 14, 2026. No App Store subscription changes.
- Body, active fixture: Premium stays active through August 7, 2027. No App Store subscription changes.
- Actions: Keep Premium, Confirm cancellation
- Result title: Sample subscription cancelled
- Result body: The local fixture will not renew. No App Store subscription changed.
- Result action: Done

Cancelled-state primary action: Subscribe again.

## 5. Home and balance domain

### 5.1 Natural first Home and debug/showcase Home

~~~ts
export const firstHomeFixture = {
  fixtureMode: "naturalFirstHome",
  dayLabel: "Friday · Active day",
  earnedTodayLabel: "0 min earned today",
  streak: 0,
  goalPercent: 0,
  goalCaption: "Your first active day starts here",
  timeLocked: "2h 14m",
  screenTime: "45 min",
  dailyAllowanceMinutes: 45,
  earnedMinutes: 0,
  usedMinutes: 45,
  remainingMinutes: 0,
  conditions: [],
  analysisHistory: "empty",
};

export const showcaseHomeFixture = {
  fixtureMode: "debugShowcase",
  dayLabel: "Friday · Active day",
  earnedTodayLabel: "2h 05m earned today",
  streak: 12,
  goalPercent: 50,
  goalCaption: "50% of goal completed",
  timeLocked: "2h 14m",
  screenTime: "1h 32m",
  dailyAllowanceMinutes: 45,
  earnedMinutes: 125,
  usedMinutes: 170,
  remainingMinutesLocked: 0,
  remainingMinutesUnlocked: 30,
  conditions: ["demo-gym", "demo-walk", "demo-steps"],
};
~~~

Natural first-Home labels:

- Hero: Move first, scroll after.
- Hero body: Your 45 minutes are used. Add a way to earn and make some room.
- Stat 1: Time Locked / 2h 14m
- Stat 2: Screen Time / 45 min
- Empty-card title: Add your first way to earn
- Empty-card body: Pick a movement goal, set its rule, and see the exact card before you save.
- Empty-card action: Add condition
- Shortcut: Edit
- Shortcut: Analysis
- Streak accessibility label: No streak yet; active day.
- Goal accessibility label: Today’s meaningful-activity goal has not started.

Debug/showcase labels, retained for visual QA against approved anchors:

- Stat 1: Time Locked / 2h 14m
- Stat 2: Screen Time / 1h 32m
- Shortcut: Edit
- Shortcut: Analysis
- Streak accessibility label: 12-day streak, active day.
- Goal accessibility label: 50% of today’s streak goal completed.

Home state copy:

| State | Lock | Primary status | Supporting copy |
|---|---|---|---|
| first-home-empty | Closed | Move first, scroll after. | Your 45 minutes are used. Add your first way to earn. |
| locked | Closed | Move first, scroll after. | Your sample balance is empty. Pick any available way to earn. |
| unlocked | Open | 30 min ready | Use it when you want. Movement can add more. |
| low | Open | 10 min left | A quick walk keeps your options open. |
| unlimited | Open | No limit today | Your sample allowance is Unlimited. |
| rest-of-day | Open | Unlocked for today | Go to gym completed. Your sample balance is on hold until midnight. |
| set-period | Open | Unlocked until 8:30 PM | Distance goal completed. Your sample balance is on hold for this 1h 30m access period. |
| rest-day-no-locking | Actual access pose | No limits today | Sunday is a Rest day. Your sample balance is on hold until midnight. |
| outside-window | Open | Limits start at 7:00 PM | You’re outside the lock window. Your sample balance is on hold until then. |
| empty-conditions | Use current balance pose | Add your first way to earn | Choose a condition, set the rule, and preview its Home card. |

Access-holiday contract:

- Event reward states: `D-HOME-10` on `/(tabs)/home` for rest-of-day and set-period.
- Rule states: `D-HOME-11` on `/(tabs)/home` for no-locking Rest day and outside-window.
- Internal kinds: restOfDay, setPeriod, restDayNoLocking, outsideLockWindow.
- User-facing status chip: OPEN TIME for rest-of-day/set-period; REST DAY for no-locking Rest days; OUTSIDE WINDOW for lock-window relief.
- Balance wording: Balance on hold. Never say drain paused on a walking surface.
- While any access holiday is active, the lock uses its actual open/access pose and the balance value remains visible but does not count down.
- Rest-of-day fixture ends at the day boundary, midnight.
- Set-period fixture snapshot time is 7:00 PM; it lasts 1h 30m and ends at 8:30 PM.
- Rest-day no-locking fixture ends at midnight. The separate Allowance only rest behavior is not an access holiday and uses the normal allowance.
- Outside-window fixture snapshot time is 6:20 PM and ends at 7:00 PM, when the sample lock window begins.
- These two Debug snapshots override the shared 9:41 status-bar clock only while selected.

Condition-card status during access holidays:

- Rest-of-day source Event: completed action remains ✓ Completed; result line: Unlocked for today · balance on hold.
- Set-period source Event: completed action remains ✓ Completed; result line: Unlocked until 8:30 PM · balance on hold.
- Other cards during a no-locking Rest day: desaturated status chip REST DAY; helper: Conditions are resting with today’s rule.
- Other cards outside the lock window: desaturated status chip OUTSIDE WINDOW; helper: Limits start at 7:00 PM.

### 5.2 Condition-card fixtures

These card fixtures render only after the user saves a condition or selects Debug → Seed showcase conditions. Natural first Home has only the large Add card.

Event card:

- Name: Go to gym
- Context: Harbor Strength
- Eligible action: Complete
- Completing action: Checking…
- Completed action: ✓ Completed
- Completed accessibility state: Go to gym, completed today.
- Verification-required helper: Check in at Harbor Strength to add 30 minutes.

State card:

- Inactive name: While walking
- Inactive helper: Walk to keep apps open.
- Inactive action: Start walking
- Verifying chip: VERIFYING
- Verifying helper: Finding your walking rhythm…
- Active chip: ACTIVE
- Active title: Walking
- Active body: Apps stay open while you move.
- Active status: Balance drains normally.
- Ended body: You stopped walking.
- Ended action: Keep walking
- Prohibited copy: Drain paused while active.

Rate card:

- Eyebrow: Today’s steps → screen time
- Metric: 6,240
- Metric label: steps today
- Earned: 2h 05m
- Earned label: earned
- Ratio: 1,000 steps = 20 min
- Meter fixture fraction: 0.624
- Meter accessibility label: 6,240 steps credited today at 20 minutes per 1,000 steps.
- Implementation note: 0.624 is a visual sample scale, not a daily cap. Do not render a cap label.
- No CTA and no Claim action.

### 5.3 Balance and condition detail sheets

Balance detail, empty:

- Title: Today’s balance
- Hero: 0 min left
- Body: Your free time and earned time have been used. The quickest sample route is a 20-minute walk.
- Rows:
  - Daily free time — 45 min
  - Earned — 2h 05m
  - Used — 2h 50m
- Primary: Start a walk
- Secondary: See trend

Balance detail, positive:

- Title: Today’s balance
- Hero: 30 min left
- Body: Use it when you want. Any new earn adds to the same balance.
- Rows:
  - Daily free time — 45 min
  - Earned — 2h 35m
  - Used — 2h 50m
- Primary: Keep earning
- Secondary: See trend

Balance detail, access-holiday variants:

| Kind | Hero | Cause | Balance row | Resume row | Primary |
|---|---|---|---|---|---|
| Rest of day | Open all day | Go to gym opened the selected apps for the rest of today. | Balance on hold · 30 min | New allowance day · Midnight | View condition |
| Set period | Unlocked until 8:30 PM | Distance goal opened the selected apps for 1h 30m. | Balance on hold · 30 min | Normal balance use resumes · 8:30 PM | View condition |
| Rest day | No limits today | Sunday uses the No locking rest rule. | Balance on hold · 45 min | Monday’s rules begin · Midnight | View weekly rules |
| Outside window | Limits start at 7:00 PM | The sample lock window is 7:00 PM–7:00 AM. | Balance on hold · 30 min | Limits begin · 7:00 PM | View weekly rules |

Shared access-holiday footer: This is hardcoded sample state. No real app access changed.

Condition detail fixtures:

| Condition | Status | Exact rule | Today evidence | Window | Primary |
|---|---|---|---|---|---|
| Go to gym | Ready | Check in at Harbor Strength once to add 30 minutes. | Not completed today. | 6:00 AM–10:00 PM | Check in |
| While walking | Inactive | Keep moving to keep apps open. Balance drains normally; a 2-minute grace period starts when movement stops. | 0 min active today. | 7:00 AM–10:00 PM | Start walking |
| Steps exchange | Crediting | Every 1,000 steps adds 20 minutes continuously from today’s sample total. | 6,240 steps · 2h 05m credited. | Anytime | View analysis |

Shared detail action: Edit condition.

Low-time banner:

- Title: 10 minutes left
- Body: A quick walk keeps your options open.
- Primary: Earn more
- Dismiss accessibility label: Dismiss low-time notice.

## 6. Conditions and builder domain

### 6.1 Catalog groups and entries

Every create-mode economy value begins null. Example rules are explanatory only and never prefill a picker.

| ID | Group | Label | Kind | Signal / source | One-line description |
|---|---|---|---|---|---|
| gym-arrive | Gym | Arrive at gym | event | Saved gym presence | Check in at a saved gym and earn once. |
| gym-present | Gym | Be at the gym | state | Saved gym presence | Keep apps open while you remain at the gym. |
| gym-time | Gym | Time at the gym | rate | Minutes present | Exchange time at a saved gym for screen time. |
| walk-state | Walking | While walking | state | Live walking | Keep apps open while you keep moving. |
| walk-steps-rate | Walking | Steps exchange | rate | Steps / Apple Health | Turn today’s steps into screen time continuously. |
| walk-steps-event | Walking | Step goal | event | Steps / Apple Health | Earn once when today’s step goal is reached. |
| run-distance-event | Running | Distance goal | event | Running distance / Apple Health | Earn once when a recorded run reaches your distance. |
| run-distance-rate | Running | Distance exchange | rate | Running distance / Apple Health | Exchange recorded running distance for screen time. |
| cycle-distance-event | Cycling | Distance goal | event | Cycling distance / Apple Health | Earn once when a recorded ride reaches your distance. |
| cycle-distance-rate | Cycling | Distance exchange | rate | Cycling distance / Apple Health | Exchange recorded cycling distance for screen time. |
| swim-distance-event | Swimming | Distance goal | event | Swimming distance / Apple Health | Earn once when a recorded swim reaches your distance. |
| swim-distance-rate | Swimming | Distance exchange | rate | Swimming distance / Apple Health | Exchange recorded swimming distance for screen time. |
| calories-event | Any activity | Active-calorie goal | event | Active calories / Apple Health | Earn once when today’s active-calorie goal is reached. |
| calories-rate | Any activity | Active-calorie exchange | rate | Active calories / Apple Health | Exchange active calories for screen time. |
| active-minutes-event | Any activity | Active-minutes goal | event | Active minutes / Apple Health | Earn once when today’s active-minutes goal is reached. |
| active-minutes-rate | Any activity | Active-minutes exchange | rate | Active minutes / Apple Health | Exchange active minutes for screen time. |
| workout-duration-event | Any activity | Finish any workout | event | Workout duration / Apple Health | Earn after any recorded workout lasts at least your chosen time. |

No direct-vendor or marketplace rows appear.

### 6.2 Catalog rules and disabled copy

- Unique key: kind + signal + source + place.
- Duplicate reason: Already added for this source and place.
- Taken state: Already in your Conditions.
- Event-versus-rate conflict: Unavailable while {conditionName} is active. Both would reward the same activity.
- Missing Apple Health preview: Connect the Apple Health demo state to configure this condition.
- Missing saved gym: Add a gym before choosing this condition.
- Five-gym limit: You can keep up to 5 saved gyms.
- State conditions conflict with nothing because they do not bank time.
- Kind is immutable in edit mode.
- Rates have no cap control.
- State conditions have no drain control. Usage always drains normally.
- No condition is created before the user explicitly saves it.

Catalog screen:

- Title: Choose a way to earn
- Body: Pick the outcome that feels natural. The condition kind stays behind the scenes.
- Filters: All, Gym, Walking, Running, Cycling, Swimming, Any activity
- Disabled-row link: Why unavailable?
- Close touched draft alert: Discard this condition?
- Alert body: Your unfinished choices will be removed from this demo.
- Alert actions: Keep editing, Discard

### 6.3 Builder screens

| Step | Title | Body | Primary |
|---|---|---|---|
| catalog | Choose a way to earn | Pick the outcome that feels natural. | None until row tap |
| place | Choose a gym | Select a saved place or add a sample gym. | Next |
| configure-state | Set the walking rule | Choose a grace period and, if useful, an active window. | Next |
| configure-rate | Set the exchange | Choose how many minutes this signal adds. Nothing is prefilled. | Next |
| configure-event | Set the goal | Choose the threshold that makes this count. Nothing is prefilled. | Next |
| reward | Choose the reward | Decide what one completed event adds or opens. | Next |
| banner | Choose card artwork | Pick the banner this condition will wear on Home and Manage. | Next |
| preview | Preview your condition | This is the exact card that will appear on Home. | Save condition |
| edit | Edit condition | Changes update this condition everywhere in the demo. | Done |

Edit-only destructive action: Delete condition.

Delete alert:

- Title: Delete “{conditionName}”?
- Body: The condition will leave Home and Manage. Past sample Analysis entries stay in place.
- Actions: Cancel, Delete

Disable helper:

- Turning a condition off keeps its sample history and settings. It simply leaves today’s earning paths.

### 6.4 Exact option lists and ranges

State grace:

~~~ts
[
  { value: 30, label: "30 sec" },
  { value: 60, label: "1 min" },
  { value: 120, label: "2 min" },
  { value: 180, label: "3 min" },
  { value: 240, label: "4 min" },
  { value: 300, label: "5 min" },
]
~~~

Rate minutes wheel for every signal: 5–60 min in 5-min steps, initial null.

Rate quanta:

| Signal | Fixed metric side | Example after selection |
|---|---|---|
| Steps | 1,000 steps | 1,000 steps = 20 min |
| Running | 1 mi or 1 km | 1 mi = 15 min |
| Cycling | 3 mi or 5 km | 3 mi = 10 min |
| Swimming | 100 yd or 100 m | 100 yd = 5 min |
| Active calories | 100 kcal | 100 kcal = 10 min |
| Active minutes | 10 active min | 10 active min = 10 min |
| Gym time | 10 min present | 10 min at the gym = 5 min |

Event threshold ranges:

| Signal | Range | Step | Initial |
|---|---|---|---|
| Steps | 1,000–30,000 | 500 | null |
| Run, metric | 1–42 km | 0.5 km | null |
| Run, imperial | 1–26 mi | 0.5 mi | null |
| Cycle, metric | 5–200 km | 5 km | null |
| Cycle, imperial | 3–120 mi | 3 mi | null |
| Swim | 100–5,000 m | 100 m | null |
| Active calories | 50–2,000 kcal | 50 kcal | null |
| Active minutes | 10–180 min | 5 min | null |
| Any workout | 10–120 min | 5 min | null |
| Gym arrival | Thresholdless | — | Fires on sample verification |

Event reward choices:

| ID | Label | Subtitle |
|---|---|---|
| fixed | Add a fixed amount | Add 5–120 minutes to today’s balance. |
| rest-of-day | Open for the rest of today | Keep the selected apps open until the day boundary. |
| set-period | Open for a set period | Keep the selected apps open for 15 minutes–4 hours. |

Fixed amount: 5–120 min, 5-min steps, initial null.
Set period: 15 min–4 h, 15-min steps, initial null.
Per-day cap: 1–10 completions or Unlimited, initial null.
Cooldown: Off or 15 min–8 h in 15-min steps, initial null.
Repeatable: No / Yes, initial null.
Active-window modes: Anytime (initial), Start time only, End time only, Start and end. Any clock time is selectable; the guided walking fixture is 7:00 AM–10:00 PM. “Anytime” is the absence of a window, not an economy value or a preselected reward.

### 6.5 Saved-gym and simulated map fixtures

The natural first state has zero saved gyms. The rows below are Debug/place-picker showcase fixtures and are added only after an explicit local Save gym action.

| Gym ID | Name | Subtitle | Radius | Tag |
|---|---|---|---:|---|
| harbor-strength | Harbor Strength | 0.4 mi away · Sample place | 100 m | Verified gym |
| northside | Northside Community Gym | 1.8 mi away · Sample place | 100 m | Honor system |

Place chooser actions: Add a gym, Cancel, Save place.
Map search placeholder: Search sample places.
Radius values: 50, 75, 100, 125, 150, 175, 200 m.
Radius helper: A wider radius is easier to detect but less precise.
Prototype disclosure: No map, search, pin, Wi‑Fi, or location service is used.

### 6.6 Banner options

| Family | Exact option labels |
|---|---|
| Gym | Weights floor; Squat rack; Sunset gym; Cable row |
| Running | Road at dawn; Track lights; Forest trail |
| Walking | City sidewalk; Park path; Night walk |
| Cycling | Open road; Mountain climb; City commute |
| Swimming | Pool lanes; Open water; Underwater light |
| General | Abstract energy; Sunrise; City motion; Rain window; Mountain silhouette |
| User | Use your own photo |

Photo disclosure: Prototype preview — no photo library opens and no image is imported.

### 6.7 Debug/showcase seeded conditions

These fixtures exist only under Debug → Showcase conditions and visual QA routes. Natural first Home and Manage always start with zero conditions; none of these rows may be silently seeded after Signup.

| ID | Card name | Catalog entry | Exact rule | Today |
|---|---|---|---|---|
| demo-gym | Go to gym | Arrive at gym | Harbor Strength · add 30 min · once daily · 4 h cooldown · 6:00 AM–10:00 PM | Ready |
| demo-walk | While walking | While walking | Apps stay open while moving · normal drain · 2 min grace · 7:00 AM–10:00 PM | Inactive |
| demo-steps | Steps exchange | Steps exchange | 1,000 steps = 20 min · continuous · Anytime | 6,240 steps · 2h 05m credited |

## 7. Walk and gym session domain

### 7.1 Walk session

| State | Exact content | Actions |
|---|---|---|
| ready | Title: Ready to walk? Body: Keep your phone with you and move at a natural pace. Apps would stay open only while movement holds. Status rows: Motion & Fitness — Allowed in demo; Location — Allowed in demo. Operational note: Balance drains normally. | Start walking; Cancel; Always show these tips toggle |
| verifying | Title: Finding your walking rhythm… Body: Looking for a steady sample cadence. No motion is being read. | Cancel |
| active | Chip: ACTIVE. Hero: 18:42. Hero label: elapsed. Secondary metric: 2,146 steps. Balance line: 7 min left · drains normally. | Pause; End session |
| paused | Title: Walking paused. Body: Your sample grace timer is ready. | Resume; End session |
| grace | Title: Keep moving. Hero: 0:42. Body: Start walking again before the grace timer ends. | Resume walking; End session |
| ended-by-user | Title: Walk complete. Cause: Ended by you. Values: 24:18 duration; 2,804 steps; 24 min access kept open. | Done; Start again; Why did apps lock? |
| ended-stopped | Title: Walking ended. Cause: You stopped walking. Body: Your balance was empty, so the sample apps returned behind the lock. | Done; Keep walking; Why did apps lock? |
| permission-lost | Title: Walking couldn’t start. Body: Motion & Fitness or Location needs attention in this demo state. Repair label: Review the permission preview, then try again. | Instructions; Try again; Back |

Pause alert:

- Title: Pause walking?
- Body: The grace timer will begin while the session is paused.
- Actions: Keep walking, Pause

End alert:

- Title: End this walking session?
- Body: Apps may return behind the lock if your sample balance is empty.
- Actions: Keep walking, End session

Why apps locked sheet:

- Title: Why did apps lock?
- Body: Walking keeps access open only while movement holds. It does not pause balance use or bank time. When walking ends with no balance left, the lock returns.
- Action: Got it

### 7.2 Gym check-in

| State | Exact content | Actions |
|---|---|---|
| ready | Title: Check in at Harbor Strength. Body: This preview checks a sample 100 m radius. No location is read. Status: Location — Needs attention or Allowed in demo. | Check in; Cancel |
| verifying | Title: Checking your location… Body: Harbor Strength · 100 m sample radius. No location service is running. | Cancel |
| verified | Chip: VERIFIED. Title: You’re at the gym. Body: Go to gym added 30 minutes to the sample balance. | Done; View condition |
| failed | Title: Couldn’t verify this check-in. Body: The sample Location status may need attention, or the selected gym radius may be too small. Repair label: Your setup is still here. | Instructions; Try again; Back |

Gym instructions:

- Title: Check the location preview
- Step 1: Set Location to Allowed in demo.
- Step 2: Confirm Harbor Strength is selected.
- Step 3: Keep the sample radius at 100 m or wider.
- Body: Nothing on this page reads your actual location.
- Primary: Mark as fixed in demo
- Secondary: Back

## 8. Manage and rules domain

Manage root:

- Title: Manage
- Section: CONDITIONS
- Add action: Add condition
- Empty title: No conditions yet
- Empty body: Add a way to earn and its card will appear here and on Home.
- Disable helper: Off keeps the sample history and settings. Delete removes the condition from the active list.
- Section: LOCKED APPS
- Row: Locked apps / 3 selected
- Section: RULES
- Row, natural first state: Rules / 45 min allowance · Rollover off
- Row, debug/showcase state: Rules / 45 min · Reset my streak · 2 gyms

Natural Manage fixture:

~~~ts
export const firstManageFixture = {
  conditions: [],
  lockedAppCount: 3,
  dailyAllowanceMinutes: 45,
  rollover: { enabled: false, capMinutes: null },
  streakPolicy: "hardReset",
  savedGyms: [],
};
~~~

Debug/showcase condition rows only:

| Name | Subtitle | Enabled |
|---|---|---|
| Go to gym | Event · Ready today | On |
| While walking | State · Inactive | On |
| Steps exchange | Rate · 2h 05m today | On |

Condition-list controls:

- Toolbar idle action: Edit.
- Toolbar reorder action: Done.
- Reorder helper: Press and hold a handle to change the order shown on Home.
- Swipe action: Remove.
- Reorder accessibility hint: Moves this condition before or after another condition; the Home card order updates with it.
- Empty condition-section action: Add condition.

Remove confirmation:

- Title: Remove “{conditionName}”?
- Body: The condition will leave Home and Manage. Past sample Analysis entries remain.
- Actions: Cancel, Remove

Locked-app explainer:

- Title: What stays available?
- Body: In the product concept, Phone, Messages, Maps, ExcerLock, emergency features, and anything iOS exempts would remain available.
- Prototype note: This picker uses sample names and does not inspect or change installed apps.
- Action: Done

Locked-app picker:

- Title: Locked apps
- Body: Choose from the same sample list used during onboarding. Nothing installed on this device is inspected or changed.
- Search placeholder: Search sample apps
- Initial count: 3 selected
- Actions: Cancel, Done
- Done disabled at zero: Select at least one sample app.
- Supporting link: What stays available?

Rules hub:

- Route / design ID: `/manage/rules` · `D-MAN-08`.
- Rules hub title: Rules
- Rules hub body: Keep the balance, streak, schedule, and saved places in one clear setup.
- Rules rows: Base allowance / 45 min; Rollover / Off; Streak policy / Reset my streak; Weekly schedule & lock window / Mon–Sat active · Sun rest; Saved gyms / 0 of 5 naturally or 2 of 5 in showcase.
- Secondary section: TODAY
- Buried row: Use a rest day today / Reason required
- Rules Back result: Manage with the one-line Rules summary updated.

Base allowance:

- Route / design ID: `/manage/base-allowance` · `D-MAN-09`.
- Title: Daily free allowance
- Body: Choose how much time the selected apps would get before movement adds more.
- Current fixture: 45 min
- Options: 0 min through 4 h in 5-minute steps, plus Unlimited; reuse `allowancePicker` exactly.
- Zero label: 0 min · Full Lock
- Unlimited label: Unlimited
- Derived fixture sentence: The sample apps would use 45 minutes, then wait for the next earn.
- Zero consequence: The sample apps would begin behind Full Lock until a condition opens them.
- Unlimited consequence: The sample apps would stay open all day; conditions can still build Analysis history.
- Actions: Cancel, Done
- Done disabled reason: Choose a daily amount.
- Parent subtitle after commit: 45 min, Full Lock, or Unlimited.

Rollover and cap:

- Route / design ID: `/manage/rollover` · `D-MAN-10`.

~~~ts
export const rolloverOptions = {
  enabledInitial: false,
  modes: [
    { id: "off", label: "Off", subtitle: "Each day starts with only that day’s allowance." },
    { id: "capped", label: "Carry some forward", subtitle: "Unused balance can reach tomorrow, up to a cap." },
  ],
  capMinutes: { min: 30, max: 240, step: 30, guidedFixture: 60 },
};
~~~

- Title: Carry unused time forward
- Body: Decide whether unused sample balance would follow you into tomorrow.
- Initial row: Off
- Dependent row when enabled: Rollover cap / 1 h sample
- Cap options: 30 min, 1 h, 1 h 30 min, 2 h, 2 h 30 min, 3 h, 3 h 30 min, 4 h.
- Derived enabled sentence: Up to 1 hour of unused balance would carry into the next allowance day.
- Derived off sentence: Unused balance would clear at the day boundary.
- Actions: Cancel, Done
- Done disabled reason when enabled without cap: Choose a rollover cap.
- Parent subtitle after commit: Off or Up to 1 h.

Streak policy:

- Route / design ID: `/manage/streak-policy` · `D-MAN-11`.

| ID | Label | Subtitle |
|---|---|---|
| hard-reset | Reset my streak | A missed Active day resets the streak at the next day boundary. |
| auto-cushion | Use one automatic cushion | The first missed Active day in a streak becomes a logged Rest day; the next miss resets it. |

- Title: When I miss an active day
- Body: Choose what happens when an Active day is missed. Planned Rest days and the typed rest-day override never break a streak.
- Initial: Reset my streak
- Selection commits immediately; no Save.
- Learn-more action: How streak cushions work
- Learn-more body: One automatic cushion changes only the first missed Active day in the current streak to a logged Rest day. It never adds activity or time.
- Parent subtitle after commit: Reset my streak or One automatic cushion.

Saved-gym management:

- Collection route / design ID: `/saved-gyms` · `D-MAN-12`.
- Title: Saved gyms
- Natural empty title: No gyms saved yet
- Natural empty body: Add a sample place when you want gym arrival, presence, or time conditions.
- Count label: 0 of 5 gyms
- Add action: Add a gym
- Debug/showcase rows: Harbor Strength / Manual check-in · 100 m · Verified gym; Northside Community Gym / Auto-detect preview · 100 m · Honor system.
- Five-gym disabled reason: You’ve saved 5 gyms. Remove one to add another.
- Footer: This prototype never searches places, scans Wi‑Fi, or reads location.

Saved-gym detail:

- New/edit route / design ID: `/gym/[gymId]` · `D-MAN-13`; use `gymId=new` for the unsaved fixture.
| Row | Harbor Strength fixture | Options / behavior |
|---|---|---|
| Name | Harbor Strength | Local text value; 1–60 characters. |
| Place type | Verified gym | Verified gym; Honor system. Informational in the prototype. |
| Arrival radius | 100 m | 50, 75, 100, 125, 150, 175, 200 m. |
| Check-in mode | Manual check-in | Manual check-in; Auto-detect. |
| Wi‑Fi confirmation | Off | Off; Use sample network. Optional confirmation only. |

- Radius helper: A wider radius is easier to detect but less precise.
- Manual-mode subtitle: Open ExcerLock and check in when you arrive. The product concept would need only while-in-use location.
- Auto-detect subtitle: Let the product concept notice an arrival in the background. Always Location would be required; manual check-in remains available.
- Wi‑Fi sample network: Harbor-Guest
- Wi‑Fi disclosure: Prototype preview — no nearby networks are scanned or joined.
- Actions: Cancel, Save gym
- Destructive action: Remove gym
- Remove title: Remove Harbor Strength?
- Remove body: Conditions using this sample gym will show Needs attention until another place is selected. Past Analysis entries stay visible.
- Remove actions: Cancel, Remove

Auto-detect primer and states:

- Title: Make check-ins hands-free
- Body: Auto-detect would use Always Location for this saved gym. Manual check-in is the complete lighter-permission path and stays available.
- Operational note: This prototype changes only the local demo status and never reads location.
- Primary: Preview Always Location
- Secondary: Keep manual check-in
- Simulated disclosure: Prototype preview — no Always Location permission is requested.
- Allowed result: Auto-detect preview / On
- Not-now result title: Manual check-in is still ready.
- Not-now result body: Harbor Strength stays saved at 100 m. You can preview auto-detect later.
- Recovery action: Done

Weekly rules:

~~~ts
export const weeklyRulesFixture = {
  monday: "active",
  tuesday: "active",
  wednesday: "active",
  thursday: "active",
  friday: "active",
  saturday: "active",
  sunday: "rest",
  restBehavior: "noLocking",
  lockWindow: null,
  plannedDaysOff: [
    { date: "2026-09-07", label: "Monday, September 7", state: "rest" }
  ],
};
~~~

Weekly-rules screen:

- Title: Weekly rules
- Summary: Six active days · Sunday is a Rest day.
- Rest helper: Rest days do not extend or break a streak.
- Lock-window helper: Outside a lock window there is no locking and no balance drain.
- Add-date action: Add a planned day off
- Primary: Done

Lock-window card and nested picker:

- Row title: Lock window
- Off subtitle: Off · Limits can apply all day.
- On subtitle fixture: 7:00 PM–7:00 AM
- Toggle default: Off
- From row: From / 7:00 PM
- To row: To / 7:00 AM
- Helper: During this window, the sample apps stay behind the lock unless a condition currently opens them. Walking still takes precedence while its condition is active.
- Time sheet title: Choose a time
- Any clock time is selectable; there is no minimum window length.
- Wheel actions: Cancel, Done

Planned-days-off list and calendar:

- Section title: PLANNED DAYS OFF
- Empty copy: No planned days off.
- Populated row: Monday, September 7 / Rest day · Streak unchanged
- Add action: Add a planned day off
- Calendar title: Add a planned day off
- Calendar body: The selected date becomes a Rest day and will not extend or break the streak.
- Selected fixture: September 7, 2026
- Calendar actions: Cancel, Add day off
- Existing-date swipe action: Remove
- Remove alert title: Remove September 7?
- Remove alert body: That date will return to its usual Monday rule.
- Remove alert actions: Cancel, Remove

Day choices:

| ID | Label | Subtitle |
|---|---|---|
| active | Active | Use the full allowance, earning, and locking rules. |
| rest | Rest | Do not count this day against the streak. |
| custom | Custom | Choose a different allowance, condition reward, or lock window for this day. |

Rest choices:

- No locking — A true day off.
- Allowance only — Use the daily free time, with no earning required.

Custom-day dependent controls:

- Allowance row: Daily free time / 90 min sample
- Lock-window row: Lock window / 8:00 PM–7:00 AM sample
- Reward overrides row: Condition rewards / None
- Helper: These values affect this weekday only in the current local preview.
- Sheet actions: Cancel, Done

Custom-day reward override flow:

- Reward row helper: Untouched conditions keep their usual rules.
- Natural zero-condition disabled reason: Add a condition before creating a reward override.
- Condition-list title: Choose a condition to change
- Condition-list body: The override applies only to this Custom weekday.
- Customize title after selection: {conditionName} on {weekday}
- Debug/showcase rows: Go to gym / Add 45 min today; While walking / Usual access while active; Steps exchange / 1,000 steps = 10 min today.
- Event row options: reuse fixed amount, rest of day, and set period; repeat/cap/cooldown stay inherited unless explicitly changed.
- Rate row options: reuse that signal’s fixed quantum and 5–60-minute wheel; no cap control appears.
- State row options: Use usual access while active or Off this weekday. State conditions never bank time.
- Added override summary: {conditionName} / {weekdayRuleSummary}
- Reset action: Use usual rule
- Footer: Only this Custom day changes. The saved condition keeps its normal rule everywhere else.
- Actions: Cancel, Done

Today override:

- Title: Today needs a rest day
- Body: Turn today into a Rest day without breaking the streak. Add a reason to make the choice deliberate.
- Placeholder: Why do you need today off?
- Fixture reason: Not feeling well today.
- Character count: 0/180
- Primary: Use rest day
- Disabled reason: Add a short reason first.
- Confirm title: Use a rest day today?
- Confirm body: Today will not extend or break the streak. The reason stays in this local demo.
- Actions: Cancel, Confirm rest day

## 9. Analysis domain

All Analysis values are sample data. Natural first state is the empty shell; populated values below are Debug/showcase fixtures. Render Sample data near the first Analysis heading or expose it through the screen accessibility summary.

### 9.1 Overview and recap

~~~ts
export const analysisNaturalFixture = {
  range: "week",
  timeReclaimedThisMonthMinutes: 0,
  timeReclaimedAllTimeMinutes: 0,
  currentStreak: 0,
  longestStreak: 0,
  activityCount: 0,
  earnedThisMonthMinutes: 0,
  history: "empty",
};

export const analysisShowcaseOverviewFixture = {
  range: "week",
  timeReclaimedThisMonthMinutes: 1122,
  timeReclaimedThisMonthLabel: "18h 42m",
  timeReclaimedAllTimeMinutes: 4080,
  timeReclaimedAllTimeLabel: "68h",
  currentStreak: 12,
  longestStreak: 21,
  activityCount: 43,
  earnedThisMonthMinutes: 590,
};
~~~

Overview copy:

- Title: Analysis
- Hero eyebrow: Time Reclaimed
- Hero value: 18h 42m
- Hero conclusion: You took back 18h 42m this month.
- Hero method link: How this is calculated
- Trend title: Screen time and earning
- Trend conclusion: You reclaimed 11h 13m so far this week.
- Streak title: Your streak
- Streak values: 12 days current · 21 days longest
- Earning title: Your favorite ways to earn
- Badge title: Milestones
- Empty Analysis title: Your first insight starts with one active day.
- Empty Analysis body: The chart, streak map, earning breakdown, and milestone shelf will fill with sample history after a condition completes.
- Empty primary: Start today

Empty Analysis fixtures preserve the complete shell:

| Block | Exact empty fixture |
|---|---|
| Time Reclaimed hero | Value: —. Conclusion: Your first reclaimed hour will appear here. |
| Trend | Conclusion: No sample days yet. Seven blank day slots; axes and legend remain visible. |
| Streak | 0 days current · 0 days longest. |
| Heat map | 28 blank cells. Accessibility summary: No sample history in this four-week range. |
| Earning | Total: 0 min. Body: Your first completed condition will appear here. |
| Milestones | All 22 badges remain visible as locked silhouettes with 0/threshold progress; each group’s first badge is next. |

Fresh weekly recap, Jul 27–Aug 2:

| Row | Exact fixture |
|---|---|
| Hero | 6h 20m reclaimed |
| Delta | 42 min more than the week before |
| Active days | 5 of 6 active days |
| Earn count | 7 earns · most from gym visits |
| Earned vs spent | 4h 50m earned · 5h 25m spent |
| Streak | 7-day streak at week’s end |
| CTA | Share recap |
| Freshness | Visible for 72 hours in the demo state |

Recap neutral down-delta format: 2h less than last week. Never “down,” “worse,” or “failed.”

### 9.2 Trend-chart fixtures

Week, Aug 3–9:

| Day | Locked-app use | Earned | Reclaimed | State |
|---|---:|---:|---:|---|
| Mon Aug 3 | 172 min | 45 min | 128 min | Complete |
| Tue Aug 4 | 201 min | 60 min | 99 min | Complete |
| Wed Aug 5 | 148 min | 80 min | 152 min | Complete |
| Thu Aug 6 | 214 min | 40 min | 86 min | Complete |
| Fri Aug 7 | 92 min | 125 min | 208 min | Today |
| Sat Aug 8 | — | — | — | Future |
| Sun Aug 9 | — | — | — | Future rest |

Week summary:

- Conclusion: You reclaimed 11h 13m so far this week.
- Comparison: 4h 53m more than last week.
- Best day: Friday · 3h 28m reclaimed.
- Lowest day: Thursday · 1h 26m reclaimed.
- Average: 2h 15m per completed day.
- Accessibility summary: From Monday through Friday, sample locked-app use totaled 13h 47m, earning totaled 5h 50m, and reclaimed time totaled 11h 13m.

Month, August 2026:

| Period | Reclaimed |
|---|---:|
| Aug 1–2 | 7h 29m |
| Aug 3–9 | 11h 13m |
| Aug 10–16 | Future |
| Aug 17–23 | Future |
| Aug 24–30 | Future |
| Aug 31 | Future |

Year:

| Month | Reclaimed |
|---|---:|
| May | 12h 40m |
| June | 16h 05m |
| July | 20h 33m |
| August | 18h 42m |
| September–December | Future |

Trend-detail screen:

- Title: Time Reclaimed
- Segments: Week, Month, Year
- Period control: Aug 3–9
- Comparison row: Compared with / None
- Method title: What Time Reclaimed means
- Method body: Each sample day compares the fixed 5-hour starting point with that day’s sample locked-app use. A high-use day never subtracts from the total.

Comparison options:

1. None
2. Steps
3. Workout minutes
4. Conditions completed
5. Unlock time used
6. Blocked attempts

### 9.3 Heat-map fixtures

Legend:

- Event — check glyph — First met by a completed event.
- Rate — mini-bar glyph — First met by continuous credit.
- State — pulse-dot glyph — First met by sustained state.
- Missed — neutral empty cell — Active day not met.
- Rest — faint neutral fill — Rest, holiday, or override.
- Blank — no data — Future or before install.

Four-week fixture:

| Date | Kind | Glyph | Accessibility summary |
|---|---|---|---|
| Jul 13 | event | check | Active day met by Go to gym. |
| Jul 14 | rate | mini-bar | Active day met by Steps exchange. |
| Jul 15 | state | pulse-dot | Active day met by While walking. |
| Jul 16 | event | check | Active day met by Go to gym. |
| Jul 17 | rate | mini-bar | Active day met by Steps exchange. |
| Jul 18 | event | check | Active day met by Distance goal. |
| Jul 19 | rest | none | Rest day; streak unchanged. |
| Jul 20 | state | pulse-dot | Active day met by While walking. |
| Jul 21 | event | check | Active day met by Go to gym. |
| Jul 22 | rate | mini-bar | Active day met by Steps exchange. |
| Jul 23 | state | pulse-dot | Active day met by While walking. |
| Jul 24 | missed | none | Active day not met; neutral sample state. |
| Jul 25 | event | check | Active day met by Go to gym. |
| Jul 26 | rest | none | Rest day; streak unchanged. |
| Jul 27 | event | check | Active day met by Go to gym. |
| Jul 28 | rate | mini-bar | Active day met by Steps exchange. |
| Jul 29 | state | pulse-dot | Active day met by While walking. |
| Jul 30 | event | check | Active day met by Distance goal. |
| Jul 31 | rate | mini-bar | Active day met by Steps exchange. |
| Aug 1 | event | check | Active day met by Go to gym. |
| Aug 2 | rest | none | Rest day; streak unchanged. |
| Aug 3 | event | check | Active day met by Go to gym. |
| Aug 4 | rate | mini-bar | Active day met by Steps exchange. |
| Aug 5 | state | pulse-dot | Active day met by While walking. |
| Aug 6 | event | check | Active day met by Go to gym. |
| Aug 7 | rate | mini-bar | Active day met by Steps exchange. |
| Aug 8 | blank | none | Future day. |
| Aug 9 | blank | none | Future Rest day. |

Day-detail fixtures:

| State | Title | Status copy | Evidence | Values | Action |
|---|---|---|---|---|---|
| event | Thursday, Aug 6 | Goal met at 6:42 PM | Go to gym completed first. | 30 min earned · 84 min spent | View condition |
| rate | Friday, Aug 7 | Goal met at 11:06 AM | Steps exchange reached the 15-minute streak floor first. | 125 min earned · 92 min spent | View earning |
| state | Wednesday, Aug 5 | Goal met at 8:54 AM | While walking stayed active for 10 minutes. | 24 min active · 0 min banked · 108 min spent | View condition |
| missed | Friday, Jul 24 | This active day wasn’t met. | No condition reached the meaningful-activity floor. | 0 min earned · 130 min spent | Start today |
| rest | Sunday, Aug 2 | Rest day | Rest days neither extend nor break the streak. | No requirement | Done |
| blank | Sunday, Aug 9 | No sample data yet. | This day is in the future. | — | Done |

### 9.4 Earning breakdown

Total: 9h 50m banked this month.

| Rank | Condition | Minutes | Share | Subtitle |
|---:|---|---:|---:|---|
| 1 | Steps exchange | 245 | 42% | Your top source |
| 2 | Go to gym | 180 | 31% | 6 completed check-ins |
| 3 | Distance goal | 105 | 18% | 3 recorded runs |
| 4 | Active-minutes goal | 60 | 10% | 2 completed goals |

Time-of-day distribution:

- Morning — 22%
- Afternoon — 31%
- Evening — 47%
- Conclusion: You earned most often in the evening.

Earning detail title: Earning
Segments: Week, Month
Method body: Every banked minute enters the same sample balance. State conditions appear in activity history but do not bank time.

### 9.5 Milestone shelf — all 22 badges

Statuses use unlocked, next, locked, or new. Current values: 12-day streak, 43 activities, 68 hours reclaimed.

| Asset ID | Group | Name | Threshold | Fixture status / progress |
|---|---|---|---:|---|
| streak-3-days | Streaks | Three in a row | 3 days | Unlocked May 4, 2026 |
| streak-7-days | Streaks | One strong week | 7 days | Unlocked May 8, 2026 |
| streak-14-days | Streaks | Two-week rhythm | 14 days | Next · 12/14 days |
| streak-30-days | Streaks | 30-day streak | 30 days | Locked · 12/30 |
| streak-60-days | Streaks | Two months moving | 60 days | Locked · 12/60 |
| streak-100-days | Streaks | Century streak | 100 days | Locked · 12/100 |
| streak-180-days | Streaks | Half-year habit | 180 days | Locked · 12/180 |
| streak-365-days | Streaks | A year in motion | 365 days | Locked · 12/365 |
| activity-1 | Activities | First earn | 1 activity | Unlocked May 1, 2026 |
| activity-5 | Activities | High five | 5 activities | Unlocked May 6, 2026 |
| activity-10 | Activities | Double digits | 10 activities | Unlocked May 12, 2026 |
| activity-25 | Activities | Quarter century | 25 activities | Unlocked June 10, 2026 |
| activity-50 | Activities | Fifty activities | 50 activities | Next · 43/50 |
| activity-100 | Activities | Hundred activities | 100 activities | Locked · 43/100 |
| activity-250 | Activities | Built by movement | 250 activities | Locked · 43/250 |
| activity-500 | Activities | Five hundred strong | 500 activities | Locked · 43/500 |
| time-reclaimed-10-hours | Time Reclaimed | 10 hours reclaimed | 10 h | Unlocked May 14, 2026 |
| time-reclaimed-25-hours | Time Reclaimed | 25 hours reclaimed | 25 h | Unlocked June 2, 2026 |
| time-reclaimed-50-hours | Time Reclaimed | 50 hours reclaimed | 50 h | New · unlocked Aug 1, 2026 |
| time-reclaimed-100-hours | Time Reclaimed | Hundred hours back | 100 h | Next · 68/100 h |
| time-reclaimed-250-hours | Time Reclaimed | 250 hours reclaimed | 250 h | Locked · 68/250 h |
| time-reclaimed-500-hours | Time Reclaimed | Five hundred hours back | 500 h | Locked · 68/500 h |

Unlocked badge detail:

- Title: 50 hours reclaimed
- Hero: 50h
- Body: You crossed 50 sample hours reclaimed in August 2026.
- History: 10h on May 14 · 25h on June 2 · 50h on Aug 1
- Primary: Share
- Badge new label: NEW

Locked badge detail:

- Title: Hundred hours back
- Hero: 68 / 100h
- Body: Keep using the setup that already works. Every reclaimed sample hour moves this ring.
- Section: How to make progress
- Suggestion: Your strongest source is Steps exchange.
- Primary: View earning

### 9.6 Share fixtures

Milestone preview:

- Format options: 9:16, 1:1
- Name: 50 Hours Reclaimed
- Hero: 50h
- Unlock month: August 2026
- Brand: ExcerLock
- Primary: Share
- Secondary: Save Image
- Privacy note: Uses aggregate sample numbers only.

Recap preview:

- Range: Jul 27–Aug 2
- Hero: 6h 20m reclaimed
- Active days: 5 of 6
- Earns: 7 earns
- Brand: ExcerLock
- Primary: Share

Simulated share result:

- Title: Share preview complete
- Body: Nothing left this prototype.
- Action: Done

Simulated Save Image result:

- Title: Save preview complete
- Body: No image was written to Photos.
- Action: Done

## 10. Lock moments and all shield variants

### 10.1 In-app notices

Low time:

- Title: 10 minutes left
- Body: A quick walk keeps your options open.
- Primary: Earn more
- Secondary: Dismiss

Time out:

- Title: Time’s up—for now.
- Body: A 20-minute walk earns 30 more minutes in this sample setup.
- Primary: Start walking
- Secondary: See all ways to earn
- Tertiary: Back home

### 10.2 Shield variants

All four are shieldPreview surfaces: light ivory blur, closed clay lock, warm dark text, orange primary. Metadata must set simulatedNative=true. The visible disclosure may sit in the debug/demo wrapper, not inside the production-shaped shield.

| Variant ID | Title | Subtitle | Primary | Secondary | Forbidden |
|---|---|---|---|---|---|
| balance-empty | Time’s up—for now. | A 20-minute walk gets you 30 more minutes. | Open ExcerLock | Close | Balance, spent-time, streak, or countdown values |
| full-lock | Move first, scroll after. | A gym check-in adds 30 minutes. | Open ExcerLock | Close | Guilt, “failed,” or a specific gym/location |
| walk-ended | You stopped walking. | Start walking again to pick up where you left off. | Keep walking | Close | Any claim that balance drain was paused |
| schedule | Apps are asleep. | Back at 7:00 AM. | OK | None | Extra action, earning pitch, or stale counter |

Shield accessibility labels:

- balance-empty: Apps are locked because today’s sample balance is empty.
- full-lock: Apps are locked by the Full Lock sample rule.
- walk-ended: Apps are locked because the walking sample session ended with no balance.
- schedule: Apps are locked by the sample schedule until 7:00 AM.

No shield haptic or sound.

## 11. Settings domain

### 11.1 Settings root

Title: Settings

Pinned permission panel, attention:

- Title: Permissions health
- Status: 1 needs attention
- Body: Location needs a quick check. Everything else looks ready or optional.
- Action: Review permissions

Pinned permission panel, healthy:

- Title: Permissions health
- Status: All ready
- Body: Every permission is marked healthy in this demo state.
- Action: Review permissions

Root sections and rows:

| Section | Row | Subtitle/value | Trailing |
|---|---|---|---|
| ACCOUNT | Account | jordan@example.com | Chevron |
| ACCOUNT | Manage Subscription | Free trial · Ends Aug 14, 2026 | Chevron |
| ACCOUNT | Notifications | All off | Chevron |
| GENERAL | General | Auto appearance · Miles · Midnight | Chevron |
| DATA & CONNECTIONS | Connections | Apple Health demo · 1 shortcut added | Chevron |
| DATA & CONNECTIONS | Manage data | Exports, resets, and local deletion | Chevron |
| SUPPORT & FEEDBACK | Help & FAQ | Locking, earning, permissions, and billing | Chevron |
| SUPPORT & FEEDBACK | Contact support | Preview a support message | Chevron |
| SUPPORT & FEEDBACK | Report a bug | Preview a bug report | Chevron |
| SUPPORT & FEEDBACK | Request a feature | Save a sample idea locally | Chevron |
| SUPPORT & FEEDBACK | Send diagnostics | Status-only sample bundle | Chevron |
| ABOUT | About ExcerLock | What’s new, share, legal, and credits | Chevron |

Signed-out root override: Account / Signed out · Setup kept / Chevron. All other Settings rows remain available.

Footer: ExcerLock 1.0.0 (100) · Prototype
Hidden debug entry: tap footer seven times.

### 11.2 Permission health and detail

Permission list:

| Permission | Attention-state status | Healthy-state status |
|---|---|---|
| Screen Time | Allowed in demo | Allowed in demo |
| Location | Needs attention | Allowed in demo |
| Motion & Fitness | Allowed in demo | Allowed in demo |
| Apple Health | Allowed in demo | Allowed in demo |
| Notifications | Not asked · optional | Allowed in demo |

About permissions row subtitle: What each permission would enable and what this prototype actually does.

Permission detail copy:

| Permission | Benefit-led title | Scope body | Without it |
|---|---|---|---|
| Screen Time | Keep your chosen apps behind the lock | The product concept uses Screen Time authorization to shield only the apps you select. This prototype shows sample names and makes no system request. | You can still explore every demo screen; no real apps are blocked. |
| Location | Check in when you’re at the gym | A manual check-in could compare while-in-use location with a saved radius. Auto-detect would be optional. This prototype reads no location. | Walking, steps, and workout conditions still make sense without gym check-ins. |
| Motion & Fitness | Know when a walk is really moving | A walking session could use motion classification and cadence while it is explicitly active. This prototype uses a timer and sample steps only. | Other conditions remain available. |
| Apple Health | Let recorded workouts count | The product concept reads device-recorded workouts, steps, distance, active calories, and active minutes. Manual entries would not count. This prototype reads none of them. | Gym and walking-session previews remain available. |
| Notifications | Hear about the wins you choose | Optional nudges could point back to Home or Analysis. Every type starts off. This prototype schedules nothing. | The core app concept still works without notifications. |

Denied/attention actions: Open Settings preview, About data, Try again.
Healthy action: Mark as not asked in demo.
Open Settings disclosure: Prototype preview — iOS Settings will not open.

About-permissions long sheet headings:

1. Screen Time — Only the group you choose would be shielded. Phone, Messages, Maps, ExcerLock, emergency features, and iOS exemptions stay available.
2. Location — Manual gym check-in is the complete lighter-permission path. Background auto-detect is optional.
3. Motion & Fitness — Used only during an explicitly started walking session in the product concept.
4. Apple Health — Read-only activity signals; no raw values appear in support or share content.
5. Notifications — Three opt-in types, all off by default.
6. Prototype — No permission, device data, or system setting is accessed here.

### 11.3 Account

Title: Account

Rows:

- Email — jordan@example.com
- Account status — Demo profile
- Sign out — Show local confirmation
- Delete account — Destructive preview

Sign-out alert:

- Title: Sign out of the demo profile?
- Body: The prototype will switch to its signed-out sample state. The local setup stays here and no account is changed.
- Actions: Cancel, Sign out

Signed-out Account state:

- Title: Account
- Status chip: SIGNED OUT
- Hero title: Sign in to restore your setup
- Body: Your local conditions, rules, and sample history are still here. This preview simply reconnects Jordan’s demo profile to them.
- Email row: Email / —
- Account status row: Signed out · Local setup kept
- Primary: Sign in
- Secondary: Back to Settings
- Prototype note: No server session ended and no account data moved.
- Primary route: `/signup?mode=recovery&returnTo=account`.

Sign-in action opens the exact `Sign back in` recovery flow in section 4.3. On success, return to Account with:

- Status chip: DEMO PROFILE
- Email: jordan@example.com
- Account status: Signed in for this demo
- Success notice: Jordan’s sample profile is connected again. Nothing was downloaded.

Delete-account page:

- Title: Delete account
- Body: In a real account flow this would remove account and server records. Here it only resets local demo state.
- Confirmation label: Type DELETE to continue.
- Placeholder: DELETE
- Primary: Delete demo account
- Disabled reason: Type DELETE exactly.
- Final title: Demo account removed
- Final body: Local sample state was reset. No account or server record changed.
- Action: Done

### 11.4 Notifications

Title: Notifications
Body: Choose only the reminders that feel useful. Every type starts off.

| Toggle | Subtitle | Default |
|---|---|---|
| Afternoon nudge | 3:00 PM · A gentle path back to earning | Off |
| Weekly recap | Last day of week at 6:00 PM | Off |
| Streak last-call | 9:00 PM · Only when explicitly enabled | Off |

Nudge time row appears only when Afternoon nudge is on.
Nudge-time sheet title: Afternoon nudge time.
Nudge-time fixture: 3:00 PM; any clock time is selectable. Actions: Cancel, Done.
Quiet-hours note: Sample delivery rules use 10:00 PM–7:00 AM quiet hours.
Prototype note: No notification is scheduled.

First-toggle primer:

- Title: Get one helpful nudge
- Body: Preview a reminder when there is still time to earn. This prototype will not request notification access or schedule anything.
- Primary: Continue
- Secondary: Not now

Canonical notification previews:

| Type | Title | Body |
|---|---|---|
| nudge | Your screen time is waiting | A quick workout unlocks your apps for tonight. |
| recap | You reclaimed 6h 20m this week | See your week + grab your share card. |
| last-call | 12-day streak on the line | There’s still time today—one workout keeps it alive. |

Notification deep-link entry map. Each entry is a local deterministic preview with `simulatedNotificationEntry=true`; no notification is delivered and no operating-system link is handled.

Preview routes / IDs: `/notification-preview/nudge` · `D-NOT-01`; `/notification-preview/recap` · `D-NOT-02`; `/notification-preview/last-call` · `D-NOT-03`.

Each preview route has two inspectable local states:

- Unopened: native-style notification card shows the canonical title/body, app name ExcerLock, and now timestamp. Actions: Tap notification, Dismiss.
- Tapped: the destination opens with the entry chip and focus state in the table below. The notification card itself is gone.
- Dismiss result: Return to Debug without changing Home, Analysis, balance, streak, or notification toggles.

| Type | Local destination | Entry chip | Destination conclusion | Highlight / action |
|---|---|---|---|---|
| nudge | `/(tabs)/home?entry=nudge` | FROM NOTIFICATION PREVIEW | A little room is waiting. | Scroll to the cheapest available condition; zero-condition fallback focuses Add your first way to earn. |
| recap | `/(tabs)/analysis?entry=recap` | WEEKLY RECAP PREVIEW | You reclaimed 6h 20m last week. | Expand the Jul 27–Aug 2 recap; Share opens `/share-achievement?type=recap`. |
| last-call | `/(tabs)/home?entry=lastCall` | STREAK REMINDER PREVIEW | Keep the 12-day rhythm going. | Focus goal progress and the cheapest qualifying condition; its primary action starts the normal flow. |

Entry banners:

- Nudge body: Choose a workout or walk when it fits. Your sample setup is ready.
- Weekly recap body: Five active days, seven earns, and 6h 20m reclaimed—take a look or make a share card.
- Streak last-call body: One meaningful activity today keeps the sample streak moving. No rush from this prototype.
- Shared dismiss accessibility label: Dismiss notification preview context.
- Shared disclosure: Opened from a sample notification. Nothing was delivered.
- After dismissal, the destination remains on its normal Home or Analysis state.
- If the Account fixture is signed out, the local destination still opens because the setup remains on-device; no sign-in gate replaces the requested destination.

### 11.5 General

General rows:

| Row | Subtitle / current value |
|---|---|
| Appearance | Auto |
| Language | English (US) · System managed |
| Day boundary | Midnight |
| Start week on | Use device setting |
| Units | Miles |
| Siri & Shortcuts | 1 added |
| Haptics | On |
| Sounds | Off |

Appearance options: Auto, Light, Dark.
Appearance helper: Orange remains the brand; Light uses warm ivory and Dark uses warm near-black.

Language simulated handoff:

- Title: Language
- Body: Language is managed by iOS in the product concept.
- Primary: Open Settings preview
- Disclosure: No system page opens in this prototype.

Day boundary:

- Title: Day boundary
- Body: Choose when a new allowance day would begin.
- Options: Off · Midnight; Custom
- Custom fixture: 4:00 AM
- Consequence: At 4:00 AM, the sample balance and today labels reset.
- Primary when Custom: Done

Start week on:

- Use device setting
- Sunday
- Monday
- Immediate commit; no Save.

Units:

- Miles
- Kilometers
- Helper: Running and cycling conditions update their labels. Existing sample meaning stays the same.
- Immediate commit; no Save.

Siri & Shortcuts:

| ID | Title | Suggested phrase | Fixture status |
|---|---|---|---|
| balance | Check balance | How much time do I have left? | Added |
| walking | Start walking | Start a walking session. | Add |
| gym | Check in at the gym | Check me in at the gym. | Add |

Native-sheet disclosure: Prototype preview — no Siri shortcut is created or removed.

### 11.6 Connections and Apple Health

Connections title: Connections
Body: Apple Health and Siri & Shortcuts are the only connection surfaces in this v1 prototype.

Rows:

- Apple Health — Demo status · Connected
- Siri & Shortcuts — 1 demo shortcut added

No vendor marketplace or direct-app connection rows.

Apple Health detail:

- Title: Apple Health
- Body: This page previews the signals the product concept could read. No Health data is accessed.
- Manual-entry note: Manually typed entries would not count.
- Run diagnostics action label: Run diagnostics

Signal rows:

| Signal | Fixture status |
|---|---|
| Workouts | Sample available · 8:42 AM |
| Steps | Sample available · 8:40 AM |
| Running distance | Sample available · Yesterday |
| Cycling distance | No sample today |
| Swimming distance | No sample today |
| Active calories | Sample available · 8:40 AM |
| Active minutes | Sample available · 8:40 AM |

Disconnect alert:

- Title: Disconnect the Apple Health demo?
- Body: Apple Health conditions will show Needs attention. No Health permission changes.
- Actions: Cancel, Disconnect in demo

### 11.7 Manage data

Title: Manage data
Body: Every action below is a prototype preview.

| Action | Subtitle |
|---|---|
| Export activity ledger | Preview a JSON share sheet for sample earn and streak history. No file is created. |
| Export conditions | Preview a JSON share sheet for the current local conditions. Natural first state contains none; Debug showcase contains three. No file is created. |
| Reset demo data | Restore the guided sample state and keep onboarding complete. |
| Delete all local data | Return the prototype to first-run state. No device or server data is touched. |

Export result:

- Title: Export preview ready
- Body: No file was created. You can open the simulated share sheet to inspect the handoff.
- Primary: Preview share
- Secondary: Done

Reset alert:

- Title: Reset demo data?
- Body: Sample history, settings, and conditions will return to their starting fixtures.
- Actions: Cancel, Reset

Delete-local alert:

- Title: Delete all local demo data?
- Body: The prototype will return to onboarding. No device, Health, Screen Time, account, or server data is touched.
- Actions: Cancel, Delete demo data

### 11.8 Support and diagnostics

Help & FAQ:

- Title: Help & FAQ
- Greeting: Hi there. How can we help?
- Search placeholder: Search sample help
- Contact row: Contact support / Preview a message to support@excerlock.com
- Article fixtures:
  1. Why are my apps still locked? — Balance, Full Lock, walking, and schedules.
  2. How earning adds time — Events, states, and rates in plain language.
  3. Fix a permission preview — Screen Time, Location, Motion, Health, and Notifications.
  4. Why couldn’t the gym check-in verify? — Sample radius and Location status.
  5. Manage a trial or subscription — Plans, restore, and cancellation preview.
- Browser disclosure: Local prototype article — no web page is loaded.

Shared composer:

| Mode | Title | Placeholder |
|---|---|---|
| contact | Contact support | What can we help with? |
| bug | Report a bug | What happened, and what did you expect? |
| idea | Request a feature | What would make ExcerLock more useful? |

Composer helper: Nothing is sent from this prototype.
Bug attachment: Add sample screenshot.
Attachment disclosure: No photo or screenshot picker opens.
Character count: 0/1000.
Send disabled reason: Add a message first.
Visible sample diagnostics: App 1.0.0 (100); iOS 18.6 sample; permission summary; subscription demo state.
Send action: Send preview.

Composer result:

- Title: Thanks for the detail.
- Body: This demo message was saved only for the current preview. Nothing was sent.
- Action: Done

Diagnostics:

- Title: Send diagnostics
- Body: Preview a status-only support bundle. It never includes health values, sample app names, gym names, or coordinates.
- Primary: Prepare sample bundle
- Secondary: Back

Bundle fields:

- Device & app — iPhone 15 Pro sample; iOS 18.6 sample; locale en-US; America/New_York; low-power mode Off; background refresh On.
- Account & plan — user_demo_001; Free trial.
- Permissions — status labels only.
- Blocking health — Shield inactive; 3 sample apps; monitor registered in demo; last shield preview 8:12 AM.
- Signal freshness — timestamps and source label only; no values.
- Economy, natural first fixture — 0 min balance; 0 min earned; 45 min spent; 0-day streak; zero active conditions.
- Economy, debug/showcase fixture — 0 min balance; 125 min earned; 170 min spent; 12-day streak; three active conditions.
- Rules — Midnight boundary; device week start; Miles; Mon–Sat active; Sun rest; no lock window.

Success:

- Title: Sample bundle ready
- Body: Review the status-only fields, then preview the share handoff.
- Primary: Share bundle preview
- Secondary: Done

Failure:

- Title: No data found
- Body: The selected sample date may have no fixture, or a permission state may need attention.
- Repair label: Your setup is still here.
- Primary: Instructions
- Secondary: Back

### 11.9 About

About title: About ExcerLock

Rows:

- What’s new — Version 1.0
- Rate ExcerLock — Prototype only; after manual open: Automatic previews off
- Share ExcerLock — Preview the iOS share sheet
- Follow us — TikTok and Instagram
- Credits — Acknowledgements
- Terms of Use — Local prototype document
- Privacy Policy — Local prototype document

What’s new:

- Title: What’s new
- Release: Version 1.0 · First look
- Date: August 7, 2026
- Cards:
  - A lock that moves with you — Preview locked and unlocked Home states.
  - Three ways to earn — Event, state, and rate cards now share one system.
  - Your time, made visible — Sample trends, heat map, milestones, and share cards.
- No external fetch claim.

Rate:

- Title: Rate ExcerLock
- Body: If this gentler rhythm feels useful, you can preview the App Store rating handoff. It will not open the store or submit a rating.
- Primary: Preview rating prompt
- Secondary: Not now
- Manual-row consequence note: Opening Rate ExcerLock turns off all future automatic review previews in this demo, even if the prompt is cancelled.

Simulated native review prompt:

- Design ID: `D-SET-25` · simulated native overlay opened automatically from an eligible prior surface or manually from About → Rate ExcerLock.
- System title: Enjoying ExcerLock?
- System body: Tap a star to preview a rating on the App Store.
- Star fixture: None selected initially; guided selection: 5 stars.
- Actions: Not Now, Submit
- Disclosure outside the native-shaped surface: Prototype preview — the App Store will not open and no rating will be submitted.
- Submit disabled reason: Choose a sample star rating.
- Terminal title: Rating preview complete
- Terminal body: No rating was submitted. Automatic review previews are now off in this demo.
- Terminal action: Done

Automatic review lifecycle:

~~~ts
export const reviewPromptLifecycleFixture = {
  installAgeDays: 98,
  unlockMomentCount: 5,
  currentStreakDays: 12,
  automaticShows: 0,
  manualRateOpened: false,
  lastShieldShownAt: null as string | null,
  suppressionWindowMinutes: 30,
  maximumAutomaticShows: 3,
  triggerOrder: ["fifthUnlockAfterDayThree", "firstSevenDayStreak", "thirtyDayStreak"],
};
~~~

| State | Debug/status copy | Result |
|---|---|---|
| eligible-first | Ready after the fifth unlock | Show only after the fifth unlock moment finishes and its in-place Home animation is dismissed; install age must be at least 3 days. |
| eligible-second | Ready at the first 7-day streak | Show only if automatic preview count is below 3 and manual Rate has never opened. |
| eligible-third | Ready at the 30-day streak | Final automatic opportunity under the same guards. |
| presented | Rating preview open | Show the simulated native stars and return to the originating positive surface after either action. |
| dismissed | Maybe another time | Increment automaticShows and return without changing a rating, balance, unlock, or streak fixture. |
| rated | Thanks for the preview | Show Rating preview complete, then permanently stop automatic review previews; no rating was recorded. |
| suppressed-shield | Waiting after a shield | A shield preview was shown 12 minutes ago. Automatic review preview can be reconsidered in 18 minutes. |
| stopped-three | Automatic previews complete | Three automatic review previews have been shown. Do not ask again. |
| stopped-manual | Automatic previews off | Rate ExcerLock was opened manually. Do not ask automatically again. |

Lifecycle rules:

- Anchor every automatic ask to a positive unlock/streak moment, never to paywall completion, Signup, app launch, a shield, a failed verification, or a balance-empty state.
- A prompt counts as shown when its simulated native surface appears, including Not Now.
- Suppress automatic presentation for 30 minutes after any shield variant is shown. Eligibility can be reevaluated after that window; never queue an immediate prompt on shield dismissal.
- Stop permanently after the third automatic show.
- Opening the manual Rate ExcerLock row sets `manualRateOpened=true` before its prompt opens and permanently suppresses every automatic show. The manual preview itself remains available whenever the user chooses it.
- Debug may select any lifecycle state without changing unlock, streak, or shield fixtures elsewhere.

Share ExcerLock:

- Share text: I’m trying a screen-time setup that makes movement the way back in. ExcerLock — Workout to Unlock.
- Prototype disclosure: Nothing leaves this prototype.

Follow:

- Title: Follow ExcerLock
- Body: Preview the external-link rows.
- Rows: TikTok; Instagram
- Subtitle for both: Prototype link
- Result: External link preview only. No app or browser opened.

Credits:

- Title: Credits
- Body: ExcerLock is an original UI prototype. User-facing acknowledgements belong here; internal generated-asset provenance remains in the project foundry manifests.
- Section: Platform conventions
- Row: Apple system surfaces / Shown only as clearly labeled prototype simulations.

Legal documents:

- Titles: Terms of Use; Privacy Policy
- Eyebrow: Local prototype document
- Updated: August 7, 2026
- Opening body: This local document exists only to preview the legal handoff and reading layout. It is not a published policy or agreement.
- Browser actions: Done; Reader; Share preview
- Share disclosure: No document or URL is shared.

## 12. Simulated-native surface registry

Every entry below must set simulatedNative=true in content/state. Use a native-looking presentation only after a branded explainer. The disclosure is visible in a footer, caption, or wrapper label and is also included in accessibility text.

| ID | Surface | Visible disclosure | Terminal result |
|---|---|---|---|
| native.permission.screenTime | Screen Time authorization alert | Prototype preview — no Screen Time permission is requested. | Allowed in demo / Not now |
| native.permission.motion | Motion & Fitness alert | Prototype preview — no motion permission is requested. | Allowed in demo / Not now |
| native.permission.health | Apple Health permission sheet | Prototype preview — no Health data is requested or read. | Allowed in demo / Not now |
| native.permission.location | Location permission alert | Prototype preview — no location permission is requested. | Allowed in demo / Not now |
| native.permission.locationAlways | Always Location upgrade alert | Prototype preview — no Always Location permission is requested. | Auto-detect preview on / Keep manual check-in |
| native.permission.notifications | Notification permission alert | Prototype preview — no notification permission is requested. | Allowed in demo / Not now |
| native.auth | Apple/email account handoff | Prototype preview — no Apple or Clerk account is contacted or created. | Cancel / Demo profile ready |
| native.notificationPreview | Notification banner/lock-screen card | Prototype preview — no notification was scheduled or delivered. | Dismiss / Open local destination |
| native.familyActivity | Family Activity picker | Prototype preview — sample apps only; installed apps are not inspected. | Cancel / Done |
| native.purchase | App Store purchase sheet | Prototype preview — no charge or subscription will occur. | Cancel / Subscribe preview |
| native.restore | Restore progress/alert | Prototype preview — no receipt is checked. | Cancel / OK |
| native.share | iOS share sheet | Prototype preview — nothing leaves the app. | Cancel / Preview complete |
| native.settings | iOS Settings handoff | Prototype preview — Settings will not open. | Cancel / Mark fixed in demo |
| native.language | Per-app language handoff | Prototype preview — Settings will not open. | Done |
| native.siri | Siri/Shortcuts confirmation | Prototype preview — no shortcut is created. | Cancel / Done |
| native.map | Map/place picker | Prototype preview — no map, search, pin, or location is used. | Cancel / Save sample place |
| native.photo | Photo/screenshot picker | Prototype preview — no photo library opens. | Cancel / Use sample image |
| native.browser | Browser/legal/article surface | Local prototype document — no website is loaded. | Done / Share preview |
| native.alert | Destructive/system alert | Prototype preview — only local demo state can change. | Cancel / Confirm |
| native.review | App Store review prompt | Prototype preview — the App Store will not open and no rating will be submitted. | Not Now / Rating preview complete |

## 13. Failure and recovery registry

| ID | Title | Cause copy | Recovery copy | Actions |
|---|---|---|---|---|
| permission-denied | This permission needs attention. | The demo state is set to Not now. | Review what the permission would enable, then mark it fixed when ready. | About this permission; Open Settings preview |
| gym-verification | Couldn’t verify this check-in. | Location may need attention, or the sample radius may be too small. | Your selected gym and reward are still here. | Instructions; Try again; Back |
| walk-permission | Walking couldn’t start. | Motion & Fitness or Location needs attention in this demo state. | Review the permission preview, then try again. | Instructions; Try again; Back |
| walk-stopped | You stopped walking. | The grace timer ended while the sample balance was empty. | Start walking again to pick up where you left off. | Keep walking; Done |
| purchase | Purchase didn’t finish. | The simulated App Store flow was cancelled or interrupted. | Nothing was charged. Return to the plans and try the preview again. | Try again; Back to plans |
| restore-none | Nothing to restore. | No sample purchase is attached to this state. | Choose a plan or close the restore preview. | OK |
| signup | Couldn’t finish the signup preview. | The local auth fixture is set to unavailable. | The subscribed state and setup are still here. | Try again; Back in recovery mode only |
| signin | Couldn’t finish the sign-in preview. | The sample account handoff was interrupted. | The local setup is still available. Try the sample sign-in again or go back. | Try again; Back |
| gym-auto-detect | Auto-detect needs attention. | The Always Location preview is set to Not now. | Harbor Strength stays saved and manual check-in is still ready. | Keep manual check-in; Preview again |
| diagnostic-empty | No data found. | The selected sample date may have no fixture, or a permission may need attention. | Review the instructions; your setup is still here. | Instructions; Back |
| support-send | Thanks for the detail. | This is a looks-only prototype. | The message was saved only for the current demo; nothing was sent. | Done |
| export | Export preview ready. | No file was created. | Open the simulated share sheet to inspect the handoff. | Preview share; Done |
| photo-cancel | No photo selected. | The prototype never opened the photo library. | Keep the curated banner or choose the hardcoded sample crop. | Keep current; Use sample image |
| builder-discard | Discard this condition? | The draft has unsaved local choices. | Keep editing to preserve them or discard the demo draft. | Keep editing; Discard |
| condition-delete | Delete “{conditionName}”? | The condition will leave Home and Manage. | Past sample Analysis entries stay visible. | Cancel; Delete |
| account-delete | Delete account. | No real account exists in this prototype. | Type DELETE to reset only local demo state. | Cancel; Delete demo account |

## 14. Hidden debug content

Title: Demo states
Body: Jump to any hardcoded visual state. Nothing outside this prototype changes.

Sections and rows:

- FIRST RUN — Reset onboarding; Open paywall annual; Open paywall monthly; Purchase loading; Purchase success; Post-purchase Signup; Signup email validation; Signup failure.
- AUTH — Demo profile signed in; Account signed out; Sign-in; Sign-in failure.
- HOME — Natural first Home; Locked showcase; Unlocked showcase; Earn transition; 10 minutes left; Empty balance; Rest of day; Set period; Rest day; Outside lock window.
- CARDS — Showcase event; Showcase state inactive; Showcase state active; Showcase rate.
- WALK — Ready; Verifying; Active; Paused; Grace; Ended by user; Ended after stop; Permission lost.
- GYM — Ready; Verifying; Verified; Failed.
- MANAGE — Natural zero conditions; Seed showcase conditions; Reorder; Delete confirmation; Base allowance; Rollover off/on; Reset my streak/One automatic cushion; Saved gyms empty/2/5; Manual/auto-detect; Custom-day reward overrides.
- ANALYSIS — Populated; Empty; New badge; Locked badge; Weekly recap.
- PERMISSIONS — Needs attention; All ready.
- SUBSCRIPTION — Trial; Active; Cancelled; Restore none.
- NOTIFICATION ENTRIES — Afternoon nudge → Home; Weekly recap → Analysis/share; Streak last-call → Home.
- REVIEW — First eligible; Seven-day eligible; 30-day eligible; Shield-suppressed; Three-show stop; Manual-Rate stop.
- SHIELDS — Balance empty; Full Lock; Walk ended; Schedule.
- SYSTEM PREVIEWS — Permission; Always Location; Account handoff; Family Activity picker; Purchase; Share; Settings; Map; Photo; Browser; Review.
- Destructive row: Reset all demo state.
- Reset alert title: Reset every demo state?
- Reset body: The prototype will return to Splash with first-run fixtures.
- Actions: Cancel, Reset all.

## 15. Content QA checklist

Before implementation is considered content-complete:

1. Every route in DESIGN.md resolves to one title and one exit action.
2. All simulated-native entries carry simulatedNative=true and the exact disclosure from section 12.
3. No UI string says a real app was blocked, permission granted, workout read, place checked, purchase charged, account changed, file created, message sent, browser opened, or share completed.
4. No notification string appears during onboarding.
5. No direct fitness vendor appears.
6. No rate surface mentions a cap.
7. Every walking-active surface says balance drains normally.
8. Every error preserves context and exposes a repair or retry.
9. Every empty Analysis state keeps the chart/heat-map/badge shells.
10. All 22 badges render, with one next-up badge per group.
11. All four shield variants use only their allowed action set.
12. Paywall has no countdown, fake testimonial, fake limited-time language, or hidden decline path.
13. Share cards contain aggregate sample numbers and dates only.
14. Settings values update parent subtitles after local choices.
15. Destructive previews require a second confirmation and state that only demo data changes.
16. Purchase or restore success passes through simulated Signup before Home; signed-out Account always offers the shared sign-in recovery flow.
17. Natural first Home and Manage contain zero conditions; event/state/rate seeds are reachable only through Debug → Showcase conditions.
18. Manage exposes daily free time, rollover and cap, streak policy, saved gyms, detection mode, radius, and Custom-day reward overrides with every dependent disabled reason.
19. Rest-of-day, set-period, no-locking Rest day, and outside-window access holidays show an open pose and Balance on hold copy; Allowance only and walking keep their distinct normal-drain semantics.
20. Automatic review previews follow the three-trigger order, 30-minute post-shield suppression, three-show stop, and immediate permanent suppression after manual Rate opens.
21. Each notification preview lands on its named Home or Analysis destination, renders the matching entry context, and never claims a notification was delivered.
