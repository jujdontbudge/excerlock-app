# T08 — Post-purchase setup sequence (X1–X5), fake app picker, gym picker, sign-in screens

## Inputs

`02-screen-inventory.md` §5 and §7 (SH-apps, SH-gym, SH-permission-fake). AppBlock replay 8/40/120 for the
sheet and permission-primer structure. Reference study (`design/motion/reference/`). Old app copy for permission explanations lives in
`app/src/lock/PERMISSION_COPY` (read for facts about what Screen Time can and cannot see; rewrite in the new
voice).

## Steps

1. `src/onboarding/setupFlow.ts`: X1 → X2 → X3(branch) → X4 → X5, with `setupComplete` in `onboardingStore`.
   Tests: branch picks the right X3; skip paths; resume.
2. X1 Screen Time primer: three bullets (blocks the apps you choose · cannot see what you do in them · change
   any time in Settings), "Allow Screen Time" → `ScreenTimePort.requestAuthorization()` (fake prompt). Denied
   → "Open Settings" (fake: no-op with toast-less inline note) + "Continue anyway".
3. X2 pick apps: "Choose apps" → `ScreenTimePort.presentAppPicker()`; fake shows `FakeAppPicker` bottom sheet:
   search field, "Categories" and "Apps" sections with generic names (Social, Games, Video, Messaging; App A…F
   with colored tiles, no real brands), multi-select with checkmarks, Done. Result: "N apps · M categories".
   Continue disabled at zero unless "Skip for now" (then `Home` shows the no-apps state).
4. X3 branch permission screens (one component, content per branch):
   - Walking: Motion primer → fake prompt.
   - Gym: `GymPicker` sheet (SH-gym): search field with fake results ("Gold's Gym Downtown", …), static map
     image placeholder (`assets/images/map-placeholder.png`, per STYLE.md manifest) with a pin, name field,
     Save (max 5 gyms). Then Location primer: When-in-use → fake prompt; then an "Auto-detect arrivals" switch
     explaining Always location, toggling calls `GymPort.enableAutoDetect()` (fake prompt for Always).
   - Running/Biking: Health primer → fake prompt.
   Denied states show what will not work and Continue.
5. X4 "Save your progress": Apple / Google / Email buttons → `AuthPort` fakes; email → `EmailCodeScreen`
   (6-digit code field, resend, error). "Skip for now". Session stored.
6. X5 "You're all set" checklist reflecting actual grants; "Go to Home".
7. `SH-apps` and `SH-gym` are also opened from Home/Conditions/Settings later; export them from
   `src/features/sheets/`.
8. Evidence for every screen and prompt result; motion notes.

## Acceptance

- [ ] Every branch's X3 renders correctly (`gym-arrival-user`, `runner-distance`, `home-locked-walking`
      scenarios resumed at `setup:X3`).
- [ ] Deny paths continue and are reflected on Home (`home-permission-needed`) and Settings permissions.
- [ ] Gym picker enforces max 5 and requires a name.
- [ ] Email code screen handles wrong code error and resend.
