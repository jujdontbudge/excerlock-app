# ExcerLock ADR audit: user-facing consequences

Date: 2026-10-03. Read-only audit. I read all 61 ADR files in `docs/adr/` (0001 to 0059, including both 0007s and both 0008s; TEMPLATE.md and README.md skipped). I judged each one only by what a user sees, and checked the claims that matter against the code.

**Code checked:**
- **`origin/main` (`8a395184`)**: what ships in the next OTA. The local `main` ref is stale, so I used `origin/main`.
- **App Store build 17 (`1508e366`)**: what is live now.

The main checkout is being edited by another session on `fix/stay-signed-in`, which is removing ADR 0049. Code references below are to `origin/main`, not to that unfinished working tree.

**Status labels:**
- **Live** means the behaviour is in build 17 on the App Store.
- **Next OTA** means it is on `main` but not in build 17. It reaches users with the next runtime-4 update.

---

## Top findings, ranked by harm

1. **0050 sends every returning subscriber to the first onboarding page on every cold launch, and access depends on our server being reachable** (Live). The in-progress 0049 fix does not change this. The Journey still starts at `phase: 'welcome'` (`journey/index.ts`), and `bootDestination` maps that to the first onboarding page. Access also needs a fresh server check every five minutes (0059, 0052).
2. **No ADR covers this: apps cannot unlock after a cold launch without network** (Live). Applying a lock decision waits for an online identity handshake with our API and Adapty. If the phone has no connection (gym basement, trail, airplane mode) or the API is down, walking or a met goal does not lift the shields. This contradicts ADR 0012.
3. **No ADR covers this: lapsed users cannot reach account deletion, data export, support or legal pages** (Live). The only link to "Account and help" is on the verification-failure screen. This is an App Review 5.1.1(v) risk.
4. **0058 adds false social proof and an onboarding rating prompt** (Next OTA, must not ship as is). The page claims "4.7", "50K+ ExcerLock users", shows six testimonials with faces and the Oxford, Harvard and Cambridge logos. Apple's rating sheet then appears before the person has used the app, and Continue waits for it.
5. **0053 removes all loading feedback** (Next OTA). Buttons look identical while they work for up to 15 s, the subscription check shows a blank page, and error notices vanish after 2.4 s.
6. **0054 makes Continue, Back and Close scroll away with the content** (Next OTA). The scroll indicator is also hidden.
7. **0041 relocks apps 10 s after the phone goes still**, overriding the "stop grace" the user picked in Settings (30 s to 5 min) (Live).
8. **No ADR covers this: the subscription check is limited to 5 calls per minute per IP address** (Live). It also reads only the webhook copy of the subscription. At thousands of users on shared carrier, gym or office IP addresses, paying users get "Let's try that again".
9. **0040's known gap: hands-free unlock fails every day a lock window starts while ExcerLock is suspended** (Live, issue #143 open).
10. **0011: purchase and restore block when our API is down** (Live).
11. **0043: the Screen Time permission is first asked after payment** (Live).

---

## Every ADR

| ADR | Title | Verdict | Reason |
|---|---|---|---|
| 0001 | Coordinate releases and retire agent work conservatively | keep | Release tooling; no user effect. |
| 0002 | Minimal default agent context | keep (superseded) | Agent tooling, historical. |
| 0003 | Four explicit on-demand skills | keep (superseded) | Agent tooling, historical. |
| 0004 | Share core skills across agent CLIs | keep (superseded) | Agent tooling, historical. |
| 0005 | Prefer CLIs for iOS and service operations | keep | Agent tooling. |
| 0006 | Route web extraction by source type | keep | Agent tooling. |
| 0007 | Gym presence session drives unlock and minute credit | keep (superseded) | Replaced by 0012; its "a single blip never relocks a workout" intent is good. |
| 0007 | Restore kept capabilities across coding agents | keep (superseded) | Agent tooling. |
| 0008 | Share the installed agent capability inventory | keep (superseded) | Agent tooling. |
| 0008 | Walk & Scroll sessions verify from the motion signal | keep (superseded) | Replaced by 0012. |
| 0009 | Analytics periods and condition-driven stats | keep | Day/Week/All and Condition-specific tiles are sensible. |
| 0010 | Ship native target and signing contract | keep | Build plumbing. |
| 0011 | Canonical identity, provider linking, and durable erasure | **change** | Purchase and restore wait for our own API. A server outage blocks all buying and restoring. |
| 0012 | Persisted detection and conditional watchdog enforcement | keep | Its rules protect users. The code breaks one of them (see Other decisions 1). |
| 0013 | Async production runtime ownership | keep | The startup retry screen is fine. The "restart the app" dead end needs a failed cleanup, which is rare. |
| 0014 | Immutable production calendar history | keep | Sealed days keep streaks stable. Missed-day sealing uses measured steps. |
| 0015 | Resolve local schedule times deterministically | keep | Correct DST behaviour. |
| 0016 | Exact measurements for overnight rule accounting | keep | Overnight Conditions get correct credit. |
| 0017 | Recover unsupported schedules without inventing native policy | keep | Keeps Home and Conditions usable; honest notice. |
| 0018 | Bridge superseded production migrations | keep | Server data safety. |
| 0019 | Update Home on semantic time boundaries | keep | Performance, no visible cost. |
| 0020 | Anchor the mobile Sentry core at the workspace root | keep | Bundle size. |
| 0021 | Separate startup diagnostics from cold-launch acceptance | keep | Measurement only. |
| 0022 | Supabase auth lifecycle quiescence | keep | Session safety; it keeps auto-refresh on. |
| 0023 | Honest release reviewer preset | keep | Only triggers for the exact name "App Review". Remove later, as the ADR says. |
| 0024 | Keep account access after subscription lapse | keep | This is the right rule, but 0050 overrode it in code. Restore it (see Other decisions 2). |
| 0025 | Main is the release source | keep | Process. |
| 0026 | Isolate the phone motion recorder | keep | Lab tool, never shipped. |
| 0027 | Isolate linked background recorder instrumentation | keep | Lab tool, never shipped. |
| 0028 | Standalone research runtime for Trace Lab | keep | Lab tool, never shipped. |
| 0029 | One guided two-app linked test flow | keep | Lab tool, never shipped. |
| 0030 | Recoverable and cancellable running linked test | keep | Lab tool, never shipped. |
| 0031 | Install Sentry at the entry and keep thrown Error messages | keep | Better crash triage; the privacy floor stays. |
| 0032 | PostHog flag rails with one production consumer per entry | keep | A flag can never block a render. |
| 0033 | Startup stage signposts | keep | Measurement only. |
| 0034 | Explicit raw-stream suspension evidence | keep | Lab tool. |
| 0035 | Remote stride-gate thresholds behind clamps and a kill switch | keep | Lets walking detection be fixed without a release. |
| 0036 | Walk keep-alive stays Always location, without the blue indicator | keep | Removes the blue pill and saves battery. |
| 0037 | Simulator startup stage medians | keep | Measurement only. |
| 0038 | Device startup stage medians | keep | Measurement only. |
| 0039 | In-app incident reports with a bounded snapshot | keep | One-tap problem report with a strict privacy floor. |
| 0040 | Background walking grants; shield analytics | **change** | The deferred gap: a window that starts while ExcerLock is suspended cannot unlock from a pocket walk (#143). |
| 0041 | Raw stream corroborates Apple and confirms stops | **change** | A 10 s still-stop overrides the user's chosen 30 s to 5 min stop grace, so the Settings promise is false. |
| 0042 | OTA-ready sensor surface and review port | keep | Plumbing. |
| 0043 | Sign-in and permissions follow the paywall | **change** | Screen Time, which every Condition needs, is first asked after the person has paid. |
| 0044 | One lean agent context | keep | Agent tooling. |
| 0045 | Verification over tests; no comments | keep | Internal. |
| 0046 | Concept packages in strict layers | keep | Internal. |
| 0047 | Remove Clerk authentication from the API | keep | No users affected. |
| 0048 | Ship without HealthKit | keep | Forced by App Review. Apple Watch-only walks do not count; revisit with a visible Health feature. |
| 0049 | Explicit sign-in before the main app on every cold launch | **remove** | Already decided. |
| 0050 | Welcome-first hard Paywall and account-bound admission | **remove** (supersede) | Every cold launch lands on the first onboarding page, and an online five-minute lease decides access. Keep only the onboarding hard paywall and purchase recovery. |
| 0051 | Isolated TestFlight Sandbox authorization process | keep | TestFlight only; becomes unnecessary if 0050 goes. |
| 0052 | Verified StoreKit environment chooses the authorization lane | **change** | An 8 s wait at every launch. If StoreKit does not answer, the person cannot be admitted for the rest of that app session. |
| 0053 | Screens stay still and never show error or status text | **change** | No spinners, frozen-looking buttons, a blank page while checking, 2.4 s notices, unexplained disabled buttons. |
| 0054 | Screens scroll as one piece | **change** | Back, Close and Continue scroll off screen and the scroll indicator is hidden. |
| 0055 | Sandbox API accepts pinned Xcode StoreKit test purchases | keep | Developer simulator only. |
| 0056 | One semantic haptics language (proposed) | keep | Restrained, follows the HIG, respects the user's setting. |
| 0057 | Permission answers precede Setup advancement | keep | Fixes pages moving under an open prompt; separate Locked apps page. |
| 0058 | Research and rating after the imported plan | **change** | False ratings, user counts, testimonials and university logos, plus a rating ask during onboarding. |
| 0059 | Paid admission renews in place before its five-minute lease ends | **remove** | Only exists to prop up 0050's lease. Adds a full-screen cover and a server call on every return after 5 minutes. |

---

## Change and remove details

### 0049: Explicit sign-in on every cold launch (remove, decided)

The decision is already made. One warning: removing 0049 alone does not stop subscribers from landing on the Welcome page. The work on `fix/stay-signed-in` so far only replaces the sign-in gate (`identity/launchSignInGate.ts` becomes `rememberedSignIn.ts`). `journey/index.ts` still starts every app process at `phase: 'welcome'`, and `launch/lib/bootDestination.ts` still maps that to the first onboarding page. 0050 has to go too.

Severity: **hits every user.**

### 0050: Welcome-first hard Paywall and account-bound admission (remove and supersede)

**What the user experiences (Live).**

You subscribed yesterday. Overnight iOS closed ExcerLock, or you swiped it away. This morning:
1. You tap the icon and land on the first onboarding page ("Start" / "Already have an account? Sign in").
2. You tap Sign in, pick Apple and confirm with Face ID.
3. The app checks your subscription with our server. Build 17 shows "Checking your subscription"; the next OTA shows a blank page (0053).
4. A Setup page flashes, then Home appears.

Variations on the same morning:
- **On the subway with no signal**, sign-in or the check fails. You get "Let's try that again" with "Back to start", and you cannot see Home, your Conditions or your progress at all.
- **A new user who closes the app halfway through onboarding** is sent back to page 1. Their answers are kept, but the saved position is overwritten (`onboarding/lib/useOnboarding.ts` patches `step` to the first page on mount).
- **When an OTA update installs while you are on Home** (after 6 h away), the app reloads in front of you. The reload denies the resume because admission is gone (`runtime/lib/OtaResumeHost.tsx`), so you land on the Welcome page and must sign in again.
- **The "Your walking goal is complete — Open ExcerLock" notification** opens the Welcome page instead of Home.

**What top apps do.**
- **Persistent sessions:** Opal, Duolingo, Strava, Calm and Headspace keep the session in the Keychain and reopen straight to the main screen after a kill or reboot.
- **On-device entitlement:** Access comes from the on-device entitlement: StoreKit 2 keeps signed transactions on the phone, and RevenueCat and Adapty cache the customer's access. Server checks run in the background.
- **Apple's rule:** App Review 3.1.2(a): apps "should allow a user to get what they've paid for without performing additional tasks". HIG, Managing accounts: "Delay sign-in for as long as possible. People often abandon apps when they're forced to sign in."

**Recommended new rule.**
- **Reopening:** A cold launch reopens where the Journey left off. Onboarding resumes at its saved page; a subscriber with Setup complete opens Home.
- **Session:** The session persists until the user signs out or deletes the account.
- **Access:** Paid access is read on the device from the cached Adapty/StoreKit entitlement and survives launches and offline use.
- **Server check:** It runs in the background. Only a confirmed "no access" answer removes access; a network failure, timeout or unknown answer never does.
- **What to keep from 0050:** The hard paywall at the end of onboarding, the purchase recovery journal, and connecting a purchase to the chosen account.

**Code affected:**
- `app-next/src/packages/journey/index.ts`: initial `phase: 'welcome'`, in-memory `admission`, `useJourney.canEnterApp`.
- `app-next/src/packages/launch/lib/bootDestination.ts`, `app-next/src/packages/launch/BootGate.tsx`, `app-next/src/packages/launch/RootNavigator.tsx`.
- `app-next/src/packages/subscription/ServerSubscriptionAdmission.ts`: `MAX_LEASE_MS = 5 * 60_000`.
- `app-next/src/packages/onboarding/lib/welcome/WelcomeFooter.tsx`, `app-next/app/sign-in.tsx`, `app-next/src/packages/paywall/PaywallSlot.tsx`, `app-next/src/packages/setup/SetupRoute.tsx`.
- `app-next/src/packages/runtime/lib/OtaResumeHost.tsx`, `app-next/src/packages/onboarding/lib/useOnboarding.ts`.

Severity: **hits every user**, on every cold launch.

### 0059: Admission renews before its five-minute lease ends (remove)

**What the user experiences.**
- **Next OTA:** While the app is open it calls our server about every four minutes. Return after more than 5 minutes away and a full-window launch cover sits over the screen for up to 15 s while the server answers. If the answer cannot be fetched, you are moved to the "Let's try that again" page.
- **Live (build 17, which has no renewal):** A paying person who spends more than 5 minutes in Setup reaches the Paywall when Setup ends. The ADR's own context says so.

**What top apps do.** Nobody re-verifies a subscription on a five-minute timer or blocks the screen for it. StoreKit 2 pushes renewals and revocations through `Transaction.updates`, and the SDKs refresh in the background.

**Recommended new rule.** Delete the lease. Refresh the entitlement in the background on launch and foreground. Never cover the UI for it.

**Code affected:**
- `app-next/src/packages/journey/index.ts`: `renewAdmission`, `refreshAdmission`, `reverify`.
- `app-next/src/packages/launch/RootNavigator.tsx`: the `journey.checking` `FullWindowOverlay`.
- `app-next/src/packages/runtime/lib/NativeRuntimeEffects.tsx`.

Severity: **hits every user**, many times a day.

### 0052: Verified StoreKit environment chooses the authorization lane (change)

**What the user experiences (Live).** Every cold launch waits up to 8 s for `AppTransaction.shared`. It is called once, while the runtime is built (`runtime/createClientServices.ts`). If StoreKit does not answer in time, for example on a first launch with a weak connection, the result is `null`. Admission then becomes `unavailableSubscriptionAdmission()` for that whole app session. The subscriber gets "Let's try that again", and every Try again fails until they force-quit and relaunch.

**What top apps do.** Access is not gated on the receipt environment. Apple's documented server pattern is to try Production first and fall back to Sandbox on a sandbox-receipt answer (status 21007 in the receipt API). RevenueCat and Adapty route Sandbox and Production on the server.

**Recommended new rule.** If 0050's server lane survives in any form:
- an App Store binary defaults to Production;
- it caches the verified environment once per install;
- it never blocks launch or admission on this lookup.

**Code affected:** `app-next/modules/excerlock-store-environment/index.ts` (8 s race), `app-next/src/packages/platform/subscriptionBackend.ts`, `app-next/src/packages/runtime/createClientServices.ts`, `app-next/src/packages/subscription/UnavailableSubscriptionAdmission.ts`.

Severity: **rare edge**, but it is a total lockout for that session when hit.

### 0053: Screens stay still and never show error or status text (change)

**What the user experiences (Next OTA).**
- **Frozen buttons:** You tap "Continue with Apple", "Start free trial" or "Try again". The button keeps its exact look while the work runs: `PrimaryButton` with `loading` changes nothing visible and ignores further taps. The subscription check can take up to 15 s plus up to 15 s waiting for identity, so the app looks frozen.
- **Blank page while checking:** `app/sign-in.tsx` renders nothing at all during the check (build 17 said "Checking your subscription").
- **Unexplained disabled buttons:** If you mistype your email, Continue is simply grey with no reason given.
- **Missed failures:** When a purchase fails, a pill appears for 2.4 s and fades. The ADR admits a user who looks away misses it.

**What top apps do.**
- Duolingo, Headspace and Strava show a spinner inside the button during sign-in and purchase.
- They show an inline hint under a bad email.
- HIG, Loading: "If you make people wait… they can interpret the lack of content as a problem with your app."
- HIG, Progress indicators: "People tend to associate a stationary indicator with a stalled process or a frozen app". It also recommends a spinner "next to a specific control, such as a button."

**Recommended new rule.**
- **Keep:** no alert when the user cancels Apple's sheet, no layout jumps, never show raw error text.
- **Add:**
  - a busy button swaps its label for a same-size spinner after about 300 ms;
  - long checks show a short calm title ("Checking your subscription");
  - a field shows why it is invalid, in space reserved for that;
  - a failure the user must act on stays until dismissed.

**Code affected:**
- `app-next/src/packages/ui/PrimaryButton.tsx`, `ui/SecondaryButton.tsx`, `ui/Notice.tsx`, `ui/tokens.ts` (`hold.notice: 2400`).
- `packages/eslint-plugin-excerlock/index.cjs` (`no-status-text`).
- `app-next/app/sign-in.tsx`, `app-next/src/packages/identity/SignInScreen.tsx`, `app-next/src/packages/paywall/lib/PaywallScreen.tsx`.

Severity: **hits every user.**

### 0054: Screens scroll as one piece (change)

**What the user experiences (Next OTA).** On every screen the title, Back or Close button and the bottom Continue sit inside one scroll view (`ui/ScreenShell.tsx` puts `header` and `footer` inside the `ScrollView`). The scroll indicator is hidden (`showsVerticalScrollIndicator={false}`).
- **On the rating page with six reviews,** on the paywall of a small iPhone, or on a long permission page, Continue is below the fold and nothing shows that the page scrolls. 0058 says so itself: "A long rating page reaches Continue after the reviews."
- **On the in-app paywall,** scrolling down takes the Close button off screen.

**What top apps do.**
- Calm, Headspace, Duolingo and Opal pin the primary button at the bottom and Close/Restore at the top of onboarding and paywalls. The ScreensDesign recording of Opal's paywall shows Restore and X pinned at the top and the "Try for $0.00" button at the bottom.
- HIG, Scroll views: "Make it apparent when content is scrollable."
- iOS navigation bars and toolbars stay put while content scrolls under them.

**Recommended new rule.**
- Back/Close and the primary bottom action stay pinned; only the content between them scrolls.
- Show the scroll indicator, or let partially visible content at the edge show there is more.

**Code affected:** `app-next/src/packages/ui/ScreenShell.tsx`, `app-next/src/packages/ui/UI-STYLE.md`, `app-next/src/packages/onboarding/lib/RatingScreen.tsx`, `app-next/src/packages/paywall/lib/PaywallScreen.tsx`.

Severity: **hits every user** (onboarding and paywall).

### 0058: Research and rating after the imported plan (change; block the next OTA until fixed)

**What the user experiences (Next OTA; on `main` since 2026-10-01, not in build 17).** Right after the app builds your plan, before you have used it once:
1. **A research page** reads "ExcerLock is built on research to HACK your brain" above the University of Oxford, Harvard University and University of Cambridge logos.
2. **A rating page** then shows:
   - "4.7 ★" and "50K+ ExcerLock users";
   - six testimonials with photos ("I've lost so much weight…", "I've gained so much muscle…").
3. **Apple's rating sheet** pops up after about a second.
4. **Continue does nothing** until that request returns. Commit `76232e5b` made Continue wait, which contradicts the ADR's "Continue never waits for the prompt".

The app went live on 2026-10-01, so these numbers and quotes are not true. The ADR itself says "placeholders… Replace placeholder claims before release."

**What the rules and top apps say.**
- **HIG, Ratings and reviews:** "Avoid asking for a rating on first launch or during onboarding… People may even be more likely to leave negative feedback." iOS shows the system sheet at most three times a year, and this spends one before the person has any reason to rate.
- **App Review 5.2.1:** "Don't use protected third-party material such as trademarks… without permission, and don't include misleading, false… representations."
- **Other rules:** The introduction to the guidelines' Business section warns against "fake feedback". The US FTC rule on consumer reviews and testimonials (in force since October 2024) bans fake testimonials.
- **Top apps:** Opal's onboarding uses press mentions and review counts; they are real.

**Recommended new rule.**
- No rating request during onboarding. Ask after a real success, for example the third Day the user's Conditions are Met.
- Social proof uses only true, current numbers and real, consented quotes.
- No institution logos without written permission; research claims cite the actual studies.

**Code affected:**
- `app-next/src/packages/onboarding/researchRatingCopy.ts`, `onboarding/lib/RatingScreen.tsx`, `onboarding/lib/ResearchScreen.tsx`, `onboarding/lib/ratingPrompt.ts`.
- `onboarding/OnboardingRoute.tsx` (`ratingReady` gate), `onboarding/lib/flow.ts` (the two added steps).
- `app-next/assets/onboarding/` (university logos, review photos).

Severity: **hits every new user**, plus App Review, trademark and consumer-law risk.

### 0041: The raw stream confirms stops (change)

**What the user experiences (Live).**
1. In Settings you pick "Walk & Scroll stop grace: 2 minutes" ("How long apps stay open after you stop walking").
2. You walk while reading, then wait at a crossing holding the phone steady, or set it on a café table.
3. 10 s after the phone goes still, your apps lock again mid-video. `stillStopMs: 10_000` in `strideGateConfig.ts` ends relief from any phase, including grace.

**What top apps do.** A setting does what it says. Apple Fitness and Strava auto-pause on a confirmed stop, but they do not quietly override a user-chosen duration.

**Recommended new rule.**
- A measured stop starts the stop grace at once, instead of waiting for Apple's 8 to 30 s late "stationary". The grace then runs the full length the user chose.
- Only a confirmed put-down (placement) relocks immediately.
- If the product really wants 10 s, the Settings choice and its copy must say so.

**Code affected:** `app-next/src/packages/activity/lib/detection/MotionAdapter.ts` (the `stillStopMs` check), `activity/lib/detection/strideGateConfig.ts`, `activity/walkingMachine.ts`, `settings/PreferencesScreen.tsx`, `settings/lib/settingsCopy.ts`.

Severity: **some users** (Walk & Scroll Conditions).

### 0040: Background walking grants on Home; shield analytics (change the deferred gap)

**What the user experiences (Live; issue #143 open).**
1. You have a walking Condition from 9:00 to 17:00.
2. Overnight iOS suspends ExcerLock: the keep-alive stops at window end (`AwakeSession.reconcile` stops it outside the window).
3. At 9:00 the shield goes up through Screen Time. You walk to work with the phone in your pocket and open Instagram: still shielded.
4. It unlocks only after you open ExcerLock, usually when you are no longer walking.

This happens every day a window starts while the app is suspended.

**What top apps do.** Apps that must react while closed keep a cheap system wake-up registered. Apple's significant-change location service and region monitoring relaunch a suspended or terminated app.

**Recommended new rule.**
- While any walking Condition exists, keep a low-power wake source registered outside the window (significant-change or region monitoring), so ExcerLock can start the keep-alive when a window opens.
- If that cannot be guaranteed, the shield copy at window start should say to open ExcerLock once.

**Code affected:** `app-next/src/packages/activity/lib/detection/AwakeSession.ts`, the Expo location client in `activity/lib/location/`, `app-next/src/packages/runtime/lib/NativeRuntimeEffects.tsx`, shield copy in `enforcement/`.

Severity: **some users** (walking Conditions with a time window), daily.

### 0043: Sign-in and each Condition's permissions follow the paywall (change)

**What the user experiences (Live).** You answer about 25 onboarding questions, start the trial, sign in, and only then see Apple's Screen Time prompt for the first time. Every Condition needs that permission. If you tap Don't Allow, or a Family Sharing organiser must approve it, the subscription you just started cannot lock anything.

**What top apps do.**
- Opal asks for Screen Time before its paywall. In the ScreensDesign recording, its own explainer and the Screen Time prompt appear around 1:27, and the paywall around 1:49. It presents the permission as the source of the person's "Focus Report".
- HIG, Managing accounts, on sign-in: "Delay sign-in for as long as possible."

**Recommended new rule.**
- Ask the single Screen Time authorization before the paywall, as part of showing value. Keep app picking, Motion, Location and gym after it.
- Sign-in after the paywall happens once and is remembered (with 0049 removed). Prefer a "Not now", since locks and progress are on-device (App Review 5.1.1(v): "If your app doesn't include significant account-based features, let people use it without a login").

**Code affected:** `app-next/src/packages/setup/SetupFlow.tsx`, `app-next/src/packages/permissions/setupNeeds.ts`, `app-next/src/packages/onboarding/lib/flow.ts`, `app-next/src/packages/paywall/PaywallSlot.tsx`.

Severity: **some users.**

### 0011: Canonical identity, provider linking and durable erasure (change, narrow)

**What the user experiences (Live).** Purchase and restore both wait for `waitForIdentityReady()` (`subscription/AdaptySubscriptionAdapter.ts`). "Ready" means our API accepted `PUT /v1/user` and two Adapty calls succeeded in this app session (`identity/lib/identityCoordinator.ts`).
- **API down or slow:** During a deploy or VM outage, Start free trial and Restore spin until they time out. Nobody can buy or restore.
- **Lock decision blocked too:** The same "ready" flag also gates the lock decision (see Other decisions 1).

**What top apps do.** RevenueCat- and Adapty-based apps buy through StoreKit with the SDK's own user ID, and sync the backend afterwards. Restore talks to StoreKit only.

**Recommended new rule.**
- Purchase and restore need only StoreKit and the Adapty identify call.
- Creating the user on our server and attaching analytics run in the background with retries.
- Our own API never blocks money or the lock decision.

**Code affected:** `app-next/src/packages/identity/createAuthServices.ts`, `identity/lib/identityCoordinator.ts`, `subscription/AdaptySubscriptionAdapter.ts`, `runtime/lib/createIdentityServices.ts`.

Severity: **rare edge** (outage), but every user during it.

---

## Other decisions (harmful, not covered by any ADR)

### 1. Locks wait for an online handshake on every cold launch (Live)

**What happens.**
- `RuntimeEnforcementSource.read()` turns the lock decision into "unknown" while `!accountReady`, and the shield writer then changes nothing (`EnforcementHost`: unknown means preserved).
- `accountReady` requires `identity.ready` (`model/accountDataReady.ts`). That needs our API plus Adapty to answer in this app process, and readiness is not remembered between launches.
- `AdaptySubscriptionAdapter.identify()` also resets the stored Entitlement to `unknown` on each launch until a profile arrives.

**Scenario.** iOS relaunches ExcerLock in the background when you arrive at a basement gym with no signal. Or you open it on a trail after walking your 5,000 steps. Your apps stay locked even though you did what was required. They also stay locked for every user if our API or Adapty is down.

**Why it is wrong.** This contradicts ADR 0012: "Authentication readiness gates money/sync, not an invented enforcement condition". It arrived in `2573a0de` (2026-09-29), "activate account-local data in production", without an ADR.

**Fix.** Account data is ready when the local session matches the local account data. Network steps run afterwards. A launch keeps the last known Entitlement until a confirmed new one arrives.

**Code:**
- `app-next/src/packages/enforcement/RuntimeEnforcementSource.ts`, `model/accountDataReady.ts`, `runtime/lib/createRealRuntime.ts` (line ~265).
- `identity/lib/identityCoordinator.ts`, `subscription/AdaptySubscriptionAdapter.ts` (`identify`).

Severity: **some users** routinely; **every user** during an outage.

### 2. Lapsed users cannot reach account deletion, export, support or legal pages (Live)

**What happens.** "Account and help" (`app/recovery.tsx`) is linked only from the verification-failure page (`app/sign-in.tsx`).
- A lapsed subscriber who signs in is sent to the paywall.
- The paywall offers Terms, Restore and Privacy, and its Close goes to the Welcome page.
- "Sign in to manage your account" on the recovery page loops back the same way.

**Why it is wrong.**
- App Review 5.1.1(v): "you must also offer account deletion within the app".
- HIG, Managing accounts: "Make the link easy to discover."
- ADRs 0024 and 0050 both promise this access.

**Fix.** Add an always-visible "Account and help" link on the paywall and the Welcome page, or restore 0024's post-Setup access.

Severity: **some users** (lapsed or cancelled), plus App Review risk.

### 3. The subscription check does not scale and depends on webhook timing (Live)

**What happens.**
- **Rate limits:** `POST /v1/subscription/resync` allows 5 requests per minute per IP address (`server/src/routes/subscription.ts`), under a global 100 per minute per IP (`server/src/index.ts`). Each paying user calls it at every sign-in, every return after 5 minutes and about every 4 minutes while the app is open (0059).
- **Shared addresses:** Carrier NAT and gym, office or campus Wi-Fi put many users behind one address. Those users get a 429, which the app shows as "Let's try that again".
- **Webhook dependence:** The server asks Adapty for the profile and then discards the answer. It decides only from the webhook copy (`server/src/packages/subscriptions/lib/resync.ts`). If Adapty's purchase webhook arrives late, a brand-new subscriber gets "Let's try that again" straight after paying.

**Fix.** This goes away with the 0050 rewrite. If any server check remains, rate-limit by user rather than IP, and use the Adapty profile it already fetched.

Severity: **some users** today; **every user** at thousands of daily users.

### 4. OTA updates reload the app in front of the user (Live mechanism, worse with 0050)

**What happens.** `updates/updates.ts` reloads while the app is in the foreground on a tab root, after it has been away 6 h. With 0050 in place, the reload loses admission and drops the user on the Welcome page (`OtaResumeHost` denies the resume).

**What top apps do.** Apply downloaded updates at the next cold start or while in the background (the expo-updates default).

Severity: **every user**, once per update.

### 5. Onboarding loses its place on relaunch (Live)

**What happens.** A cold launch routes to the first onboarding page, and `useOnboarding` overwrites the saved step. Someone who leaves at question 18 of about 30 restarts at page 1, although their answers are kept.

**What top apps do.** Resume where the person left off.

Severity: **some users.**

---

## Evidence used

- **ADR text:** `/Users/johansardar/ExcerLock/docs/adr/*.md`.
- **Code:** `origin/main` (`8a395184`) and build 17 source `1508e366`, via `git show`. The rating and research pages (`9f4b9ae9` and later) and ADRs 0053, 0054 and 0059 are not in build 17.
- **Apple App Review Guidelines** (fetched 2026-10-03): 3.1.2(a), 5.1.1(v), 5.2.1, and the Business section introduction.
- **Apple HIG** (fetched 2026-10-03): Ratings and reviews, Managing accounts, Loading, Progress indicators, Scroll views.
- **ScreensDesign:** Opal onboarding recording (app id 914, video 1881): Screen Time prompt about 1:27, paywall about 1:49, Restore and X at the top of the paywall.
- **GitHub issues:** #143 and #144 are open.
