# App Review Information — draft (not submitted)

ExcerLock uses Apple's Family Controls / Screen Time APIs to shield apps selected by the user until the user completes an exercise condition. On first run, grant Screen Time authorization and select apps to shield when prompted.

For a desk-reviewable walking condition, on the setup name screen enter the exact name **App Review**. The release build creates an all-day, 20-step walking rule for today's device-local weekday; it recurs weekly rather than creating a date-only condition, and steps already counted today may satisfy the goal. Continue setup, select at least one app, then walk with the review iPhone until the goal is met. Walking verification requires a physical device; Simulator does not provide representative motion/HealthKit data.

Gym automation uses background location only to detect arrival/departure at the gym chosen by the user. Location is processed on device; coordinates are not sent to analytics. “Always” access permits detection while the app is not open.

No demo account is required. Sign in with Apple is available; anonymous use must remain supported where shown. Account deletion, data export, analytics opt-out, restore purchases, support, Terms, and Privacy Policy are reachable from Settings.

If Screen Time permission is denied or no apps are selected, the app shows that state and provides recovery guidance.

The app uses Expo OTA (`expo-updates`) to deliver JavaScript-only fixes within the reviewed feature set: an update carries no native code, no new or changed permissions, and no feature the reviewed binary does not already contain.

Remote configuration (PostHog) only tunes analytics-driven copy, step order and thresholds; its defaults are exactly the reviewed behavior above, and it does not enable, disable or unlock any capability.

The app is self-control for the signed-in adult on this device: it is not a parent/child product, not MDM, and does not manage anyone else's device. Shielding is done through Apple's Family Controls and ManagedSettings — not through a VPN and not through MDM.

Canonical support and privacy URLs are now entered in App Store Connect. Reviewer contact and phone must still be entered before submission. This file remains a draft and is not evidence that the `App Review` preset is present/active.
