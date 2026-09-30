# In-app iPhone screenshots (App Review 2.3.3, Sep 28 2026)

Replacement candidates for the iPhone screenshot set Apple rejected under 2.3.3 ("6.7-inch screenshots do not show the app in use / full UI"). **Not uploaded.** Uploading or reordering App Store Connect screenshots needs the founder's go-ahead.

## Provenance

- Every image is one unedited simulator frame of the app's own UI: `xcrun simctl io screenshot` on an iPhone 16 Plus simulator (iOS 26.4), then flattened to RGB PNG. No compositing, device frames, captions or overlays.
- The only change is the status bar, set with `simctl status_bar override`: 9:41, full Wi-Fi and cellular bars, 100 % battery.
- App: Debug dev-client build, JS served from branch `JohanSardar/app-review-actual-proof` at `05668286`, running in demo mode with the scenario below. Demo mode renders the shipping screens through fake adapters (CONTEXT.md, "Demo mode"), so the data is an example user's.

| File | Screen | Scenario, route |
|---|---|---|
| 01-home-locked.png | Home: apps locked, walking Condition at 3,200 / 5,000 steps | `trial-active`, `/home` |
| 02-conditions.png | Conditions tab: walking, gym and unlock-while-walking Conditions | `multi-rule-overlap`, `/conditions` |
| 03-condition-preview.png | Onboarding: the Condition preview ("Once you hit 10,000 steps, your apps will unlock.") | `condition-demo-walk-steps`, `/onboarding/S3b` |
| 04-gym-condition.png | Home with a gym Condition ("Arrive at the gym", "I'm at the gym") | `gym-arrival-user`, `/home` |
| 05-analytics.png | Analytics tab: weekly steps, streak and trend | `analytics-6-weeks`, `/analytics` |
| 06-condition-builder.png | Condition builder, first question | `trial-active`, `/conditions` → Add condition |

SHA-256:

```
72179c9bcbebb029a55c0391a3697dd1ba757ec9d48342bcbe46a067c4b4fe09  01-home-locked.png
3ea0cad83eb8b6f5814c0b23c234a1c2d879a15668b4c289fa11ad3789747205  02-conditions.png
4ab469e3bcd831d6cf85824e6272a37b513806562e0c758f5dc80abe9c36d67f  03-condition-preview.png
cbeb1df0294bf8d195f1723acc8d5b1115f6f72b5d73692df42be4935a0aac24  04-gym-condition.png
316b0edc55426dc8a84de3b3ffd998bddae2c1bdbb53d90cbb56084750336ac3  05-analytics.png
6a0a3f63ded540ad48458a61010efd25f8a0d030b67249fa83171d9aeb56126c  06-condition-builder.png
```

## Slot

App Store Connect currently holds the seven submitted v3 `APP_IPHONE_67` screenshots. These six are alternate in-app capture candidates only; they were not uploaded or substituted for the v3 set.

## Compliance check

- **Size:** 1290 × 2796 portrait, RGB, no alpha. Apple's screenshot specifications list 1290 × 2796 portrait as an accepted size for the 6.9" display slot (iPhone 16 Plus, 15 Pro Max, 14 Pro Max), and 1 to 10 screenshots per set. Source: https://developer.apple.com/help/app-store-connect/reference/app-information/screenshot-specifications (read Sep 28 2026).
- **2.3.3:** "Screenshots should show the app in use, and not merely the title art, login page, or splash screen." Each image is a working screen, not title art, sign-in or a splash. Source: https://developer.apple.com/app-store/review/guidelines/#2.3.3
- **2.3.7:** no prices, plan terms or review quotes appear, and the paywall is deliberately left out. The rejected `06-reviews.png` carried review text.
- **iPad:** `supportsTablet` is false, so no iPad set is required. Apple reviewed on an iPad Air 11-inch (M3), which runs the iPhone app in compatibility mode.

## Left out on purpose

- Home with a met goal (`home-locked-walking`, `home-unlocked-met`): the hero still draws a closed padlock and "Apps blocked until you complete exercise" while VoiceOver says "Unlocked" (`home/HomeLockStatus.tsx` ignores `unlocked` except for its accessibility label). A screenshot of it would contradict itself. It is a separate display bug, not fixed here.
- The Screen Time shield: the simulator cannot render the real ManagedSettings shield, and a mock would not be the app in use.
