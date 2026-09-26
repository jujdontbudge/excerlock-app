# App Review notes (live for version 1.0, Build 12)

The exact text in App Store Connect review details `15958994-c459-4b32-9327-242dda3b6cb5`, set 2026-09-26. Update this file whenever the live notes change.

```text
GUIDELINE 2.5.1: Like Build 11, this build (12) ships without HealthKit. The binary does not link the HealthKit framework and carries no HealthKit entitlement or Health usage descriptions. ExcerLock never offered an Apple Health feature: steps and walking are measured on device with Core Motion (Motion & Fitness).

ExcerLock uses Apple's Family Controls / Screen Time APIs to shield apps the user selects until the user completes a movement condition (walking or gym). It is a self-control tool for the user's own device, not a parental-control app and not a medical app.

QUICK REVIEW PATH (about 5 minutes, physical iPhone required)
1. Fresh install. Tap Get started through the three intro pages.
2. On the name screen ("What should we call you?") enter exactly: App Review (case-sensitive). This applies a reviewer preset: an all-day walking condition with a 20-step goal for today's weekday. It is an ordinary user rule, editable later; it grants no bypass.
3. Answer the remaining questions (Walking and "Reach a step goal" are already selected). The plan screen reads "Your apps are blocked until you walk 20 steps all day". Tap Import, then Continue.
4. Subscription: the paywall offers ExcerLock Premium Annual / Monthly with a free trial. Purchase with a Sandbox Apple ID. Restore purchases is on the paywall and in Settings.
5. Sign-in is optional: tap Skip for now.
6. Choose apps to lock: allow Screen Time when asked and pick at least one app in Apple's app picker. Then allow Motion & Fitness.
7. Open a selected app: it is shielded. Walk with the iPhone for about 30 seconds (20 steps): the condition completes and the app opens. Steps already counted today also satisfy the goal.

PERMISSIONS
- Screen Time (Family Controls): required to shield apps. If denied or no apps are chosen, Home shows a card naming what is not set up, with a button to finish it or open Settings.
- Motion & Fitness: counts steps and detects walking on device.
- Location While Using: recognizes arrival at the gym the user saved. Location Always (optional): keeps walk detection and gym auto-detect running while ExcerLock is closed. Both are asked only when a condition needs them; manual Check in and Check walking remain available.
- Camera (optional): when the phone is propped up, the camera checks walking movement on device. Nothing is recorded or uploaded.
- Notifications: trial reminder only.
No location, steps or app selections are sent to our servers.

ACCOUNT
No demo account is needed: the app works anonymously. Sign in with Apple, Google and email code are optional. Account deletion and data export are in Settings.

The Simulator does not provide motion data, so walking verification must be checked on a device.

TECHNICAL NOTES
- The app uses Expo Updates (expo-updates) to deliver JavaScript-only fixes inside the already-reviewed feature set. It cannot change native code, permissions, entitlements or capabilities. Any new capability requires a new App Store build and review.
- Remote configuration (PostHog) only tunes copy, plan order and detection thresholds. Its defaults are exactly the behavior described above, and it can be switched off.
- ExcerLock is for a self-managing adult on their own device. It is not a parent/child or family-management app and not an MDM/VPN product. Shielding uses Apple Family Controls + ManagedSettings.
```
