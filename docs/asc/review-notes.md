# App Review Information — draft (not submitted)

ExcerLock uses Apple's Family Controls / Screen Time APIs to shield apps selected by the user until the user completes an exercise condition. On first run, grant Screen Time authorization and select apps to shield when prompted.

For a desk-reviewable walking condition, on the setup name screen enter the exact name **App Review**. The release build creates today's walking goal of 20 steps. Continue setup, select at least one app, then walk with the review iPhone until the goal is met. Walking verification requires a physical device; Simulator does not provide representative motion/HealthKit data.

Gym automation uses background location only to detect arrival/departure at the gym chosen by the user. Location is processed on device; coordinates are not sent to analytics. “Always” access permits detection while the app is not open.

No demo account is required. Sign in with Apple is available; anonymous use must remain supported where shown. Account deletion, data export, analytics opt-out, restore purchases, support, Terms, and Privacy Policy are reachable from Settings.

If Screen Time permission is denied or no apps are selected, the app shows that state and provides recovery guidance.

Reviewer contact, phone, and final support/privacy URLs must be entered in App Store Connect before submission. This file is a draft and is not evidence that the `App Review` preset or any external metadata is present/active.
