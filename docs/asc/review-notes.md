# App Review notes — 1.0.2 (22), runtime 7 — owner draft

Draft for ADR 0087's source change. **Not sent to App Store Connect.** Live detail `3752d42c-6ee1-40da-ac4c-2d55b2f7d0e7`, read on 2026-10-21 UTC, still incorrectly promises optional sign-in. The previous repository text described 1.0.1 build 20. These notes describe the patched JavaScript; the owner must approve its delivery and these notes before using them. The embedded build-22 bundle does not contain this patch.

```text
GUIDELINE 2.5.1: This build has no HealthKit; steps use on-device Core Motion.

ExcerLock uses Apple's Family Controls / Screen Time APIs to shield apps the user selects until they complete a Condition (walking or gym). It is a self-control tool for the user's own device, not a parental-control or medical app.

QUICK REVIEW PATH (physical device required for actual movement and shields)
1. Fresh install. Tap Get started and continue through the intro pages.
2. On "What should we call you?" enter exactly: App Review (case-sensitive). This applies an ordinary, editable Walking target: 20 steps, all day, on today's weekday. It grants no purchase, account, permission or enforcement bypass. Steps already counted today can satisfy the goal.
3. Continue through the questions and import the plan. Walking and "Reach a step goal" are already selected by the preset. Continue to the subscription options.
4. Each plan shows its full billed price and billing period; a weekly equivalent is secondary. Trial duration and the following billed amount appear above Continue. Automatic renewal and cancellation terms, Terms of Use, Restore purchases and Privacy Policy are on this scrollable screen. Purchase using a Sandbox Apple ID. Account and help and Close remain available without buying.
5. After a purchase, create or sign into an account using Continue with Apple, Continue with Google or Continue with email. Email sends a six-digit code. Sign-in is required before Setup and Home; there is no "Skip for now" on this route. An account associates a subscription with recovery. No shared demo credentials are needed. Returning users can tap Sign in on Welcome. A signed-in account with no purchase proceeds to the Paywall; a temporarily unavailable check never grants Home. An unfinished purchase stays in recovery with Try again, Restore purchases and help; retry does not buy another plan.
6. Allow Screen Time and select at least one app in Apple's app picker. Then allow Motion & Fitness. Setup asks only for permissions needed by the selected Conditions; Not now leaves a reminder on Home. Permission and subscription screens scroll on iPhone and iPad.
7. Open a selected app: Screen Time shields it until the Walking target is met. Walk with the device for about 30 seconds (20 steps). For Walking state, fast walking detection is the normal behavior for every account; Filming mode does not provide a separate paid or sensor bypass.

PERMISSIONS
- Screen Time (Family Controls): shields selected apps. If denied or no apps are chosen, Home offers the same Setup screens.
- Motion & Fitness: counts steps and detects walking on device.
- Location While Using: recognizes arrival at the saved gym. Location Always: keeps Walking state detection and gym auto-detect available in the background, requested only when needed. Manual Check in and Check walking remain available.
- During a walking window with Location Always, Core Location live updates and visit monitoring let iOS relaunch ExcerLock in the background. Monitoring stops when that window ends; location stays on device.
- Camera (optional): verifies walking on device when the phone is propped up. Nothing is recorded or uploaded.
- Notifications (optional): trial reminder, Walking target completion and a notice to reopen background walking if iOS stopped the app.
No location, step counts or Screen Time app selections are sent to our servers.

SCREEN TIME BANK (optional)
On "How does this unlock?" choose Screen Time Bank. Steps or gym minutes earn Points; the Shop spends Points on Bank time. Bank time drains only while Locked apps are used (Screen Time DeviceActivity), and apps lock when the Bank is empty. Points cannot be bought, have no cash value and grant no subscription access.

ACCOUNT
Get started and onboarding are available before sign-in. An Apple, Google or email-code sign-in is currently required to finish a purchase's account connection and enter Setup/Home. Sign-in persists until Sign out or Delete account. Account deletion and data export are in Settings. Account/help, restore, legal links and support stay reachable without paid access.

FILMING MODE AND SHOWCASE DATA (disclosed owner demo settings)
Seven taps on the version at the bottom of Settings toggle Filming mode for two hours. The fast walking detector is already enabled for every account. The gesture does not grant subscription access or bypass Screen Time permissions.
For the owner's allowlisted account, that same gesture also toggles Showcase data: sample History and activity displays, 12,000 showcase Points and 17 minutes in the Bank. Buying a Shop Offer spends showcase Points and adds Bank time, including real on-device Bank time. Measured History and real Points are not rewritten. Other accounts cannot enable Showcase data. These are disclosed demo functions; the App Review name preset remains an ordinary editable Condition and never grants admission.

AD ATTRIBUTION
The app asks for tracking permission (ATT) to measure ad campaigns. Meta and TikTok receive only the configured install/registration, paywall-view, trial-start and first-purchase events. No health, movement, location or Screen Time selection data is included.

TECHNICAL NOTES
- Expo Updates delivers JavaScript-only fixes within the reviewed feature set. It cannot change native code, permissions, entitlements or capabilities; new native capabilities require a new App Store build.
- Remote configuration tunes copy, plan order and detection thresholds. It cannot grant paid access or bypass account-bound subscription verification.
- Shielding uses Family Controls and ManagedSettings.
```

Owner decision before the next review: Apple Guideline 5.1.1(v) requires use without login when significant account-based features are absent. Conditions and Enforcement run on device; account-bound recovery alone is not a proven justification. Recommend optional provider sign-in after independently verified anonymous paid admission, retaining purchase recovery and account isolation. That requires a separate identity/admission policy change and physical purchase/restore verification. This patch does not weaken those guarantees or claim the risk is resolved.
