# App Review notes (for version 1.0.1, Build 19)

The exact text in App Store Connect review details `b4388fd8-23da-4e34-83e3-9210af040b1e` (version 1.0.1), set 2026-10-14. Update this file whenever the live notes change.

```text
GUIDELINE 2.5.1: Like builds 11 to 18, this build (19) ships without HealthKit. No HealthKit framework, entitlement or Health usage strings; steps and walking are measured on device with Core Motion.

ExcerLock uses Apple's Family Controls / Screen Time APIs to shield apps the user selects until the user completes a movement condition (walking or gym). It is a self-control tool for the user's own device, not a parental-control or medical app.

QUICK REVIEW PATH (about 5 minutes, physical iPhone required)
1. Fresh install. Tap Get started through the three intro pages.
2. On the name screen ("What should we call you?") enter exactly: App Review (case-sensitive). This applies a reviewer preset: an all-day walking condition with a 20-step goal for today's weekday. It is an ordinary, editable rule; it grants no bypass.
3. Answer the remaining questions (Walking and "Reach a step goal" are already selected). The plan screen reads "Your apps are blocked until you walk 20 steps all day". Tap Import, then Continue.
4. Subscription: the paywall lists each plan with its billed price ("Yearly $…", "Monthly $…") and its weekly equivalent; a free trial, where offered, is stated in small text under the plans. The purchase button reads "Continue". There is no free-trial toggle. Purchase with a Sandbox Apple ID. Restore purchases is on the paywall and in Settings.
5. Sign-in is optional: tap Skip for now. You do not need "Already have an account? Sign in" on the first screen; it is only for returning users.
6. Choose apps to lock: allow Screen Time when asked and pick at least one app in Apple's app picker. Then allow Motion & Fitness.
7. Open a selected app: it is shielded. Walk with the iPhone for about 30 seconds (20 steps): the condition completes and the app opens. Steps already counted today also satisfy the goal.

PERMISSIONS
- Screen Time (Family Controls): required to shield apps. If denied or no apps are chosen, Home shows a card to finish setup.
- Motion & Fitness: counts steps and detects walking on device.
- Location While Using: recognizes arrival at the gym the user saved. Location Always (optional): keeps walk detection and gym auto-detect running while ExcerLock is closed. Both are asked only when a condition needs them; manual Check in and Check walking remain available.
- New in 1.0.1: while a walking condition's window is active and Location Always is granted, ExcerLock uses Core Location live updates and visit monitoring so iOS can relaunch it in the background after closing it. It stops when the walking window ends; location stays on the device.
- Camera (optional): checks walking movement on device when the phone is propped up. Nothing is recorded or uploaded.
- Notifications: a trial-ending reminder, a "walking goal complete" prompt, and, during a walking condition, a notice if iOS closed ExcerLock in the background so the user can turn walking detection back on.
No location, steps or app selections are sent to our servers.

ACCOUNT
No demo account is needed: the app works anonymously. Sign in with Apple, Google and email code are optional. Account deletion and data export are in Settings.

The Simulator has no motion data; check walking on a device.

FILMING MODE (owner demo setting, disclosed)
Tapping the version number at the bottom of Settings seven times turns on Filming mode for 2 hours. It shortens walking detection so unlock and re-lock happen within about a second, for demo videos. It unlocks nothing without walking and grants no subscription access.

TECHNICAL NOTES
- The app uses Expo Updates (expo-updates) to deliver JavaScript-only fixes inside the already-reviewed feature set. It cannot change native code, permissions, entitlements or capabilities. Any new capability requires a new App Store build and review.
- Remote configuration (PostHog) only tunes copy, plan order and detection thresholds.
- Not an MDM/VPN product. Shielding uses Apple Family Controls + ManagedSettings.
```
