# App Review notes — 1.0.2 (24), runtime 8

Live on review detail `3752d42c-6ee1-40da-ac4c-2d55b2f7d0e7` for the 1.0.2 (24) resubmission (2026-10-22), which replaced 1.0.2 (23) in the queue. Build 24 adds the iOS 27 Sign in with Apple presentation fix (runtime 8). Build 23 embeds the ADR 0087 recovery fix, which also reached runtimes 4–7 by OTA. These notes replace the build-22 text that incorrectly promised optional sign-in. App Store Connect caps notes at 4,000 characters.

```text
GUIDELINE 2.5.1: No HealthKit; steps use on-device Core Motion.

ExcerLock uses Family Controls / Screen Time to shield apps the user selects until they complete a Condition (walking or gym). It is a self-control tool for the user's own device, not a parental-control or medical app.

QUICK REVIEW PATH (physical device needed for movement and shields)
1. Fresh install. Tap Get started and continue through the intro pages.
2. On "What should we call you?" enter exactly: App Review (case-sensitive). This applies an ordinary, editable Walking target: 20 steps, all day, today. It grants no purchase, account, permission or enforcement bypass.
3. Continue through the questions and import the plan, then continue to the subscription options.
4. Each plan shows its full billed price and period with the weekly equivalent. The trial length and the following billed amount appear above Continue, with Terms of Use, Restore purchases and Privacy Policy below. Purchase with a Sandbox Apple ID. Account and help and Close stay available without buying.
5. Sign in with Apple, Google or email (six-digit code). Sign-in is required before Setup and Home; it ties the subscription to an account for restore and recovery. No demo credentials are needed. Returning users tap Sign in on Welcome. An account without a purchase opens the subscription options. If verification is temporarily unavailable, the app retries; an unfinished purchase stays in recovery with Try again, Restore purchases and help, and retry never buys another plan.
6. Allow Screen Time and pick at least one app, then allow Motion & Fitness. Not now leaves a reminder on Home.
7. Open a selected app: it stays shielded until the Walking target is met. Walk about 30 seconds (20 steps).

PERMISSIONS
- Screen Time (Family Controls): shields selected apps.
- Motion & Fitness: counts steps and detects walking on device.
- Location While Using: recognizes arrival at the saved gym. Always: keeps walking and gym detection available in the background during a walking window, requested only when needed; monitoring stops when the window ends.
- Camera (optional): verifies walking on device; nothing is recorded or uploaded.
- Notifications (optional): trial reminder, target completion, background walking notice.
No location, step counts or Screen Time selections are sent to our servers.

SCREEN TIME BANK (optional)
On "How does this unlock?" choose Screen Time Bank. Steps or gym minutes earn Points; the Shop spends Points on Bank time, which drains only while Locked apps are used. Points cannot be bought, have no cash value and grant no subscription access.

ACCOUNT
Onboarding and the subscription options are available before sign-in. Sign-in persists until Sign out or Delete account. Account deletion and data export are in Settings.

FILMING MODE AND SHOWCASE DATA (disclosed owner demo settings)
Seven taps on the version in Settings toggle Filming mode for two hours; it grants no subscription access and bypasses no permission. For the owner's allowlisted account only, it also shows sample History, 12,000 showcase Points and 17 Bank minutes.

AD ATTRIBUTION
The app asks for tracking permission (ATT) to measure ad campaigns. Meta and TikTok receive only install/registration, paywall-view, trial-start and first-purchase events; no health, movement, location or Screen Time data.

TECHNICAL NOTES
- Build 24 fixes Sign in with Apple failing to open on iOS 27.
- Expo Updates delivers JavaScript fixes within the reviewed feature set; it cannot change native code, permissions or entitlements.
- Remote configuration tunes copy, plan order and detection thresholds; it cannot grant paid access.
```

Owner decision before the next review: Apple Guideline 5.1.1(v) requires use without login when significant account-based features are absent. Conditions and Enforcement run on device; account-bound recovery alone is not a proven justification. Recommend optional provider sign-in after independently verified anonymous paid admission, retaining purchase recovery and account isolation. That requires a separate identity/admission policy change and physical purchase/restore verification. This patch does not weaken those guarantees or claim the risk is resolved.
