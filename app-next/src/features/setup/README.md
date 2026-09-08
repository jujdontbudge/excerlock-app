# Post-purchase setup

`SetupRoute` resumes X1–X5 behind the entitlement guard and records each step locally. X3 is represented by
`X3a` (the gym-only embedded picker) and `X3b` (the activity permission primer); legacy persisted `X3` values
resume at the correct branch step. Permission primers call ports only; denied and skipped grants remain
visible and actionable in the final checklist. `AppsSetup` uses the global fake-picker host. Gym setup asks
for When-in-use after the picker, then `AutoDetectToggle` offers the explained optional Always upgrade.

Sign-in is optional. `SignInScreen` owns email/options state; `EmailCodeScreen` renders the code, resend and
error controls. Phase 1's fake verification code is `123456`. The completion checklist reads actual stores,
explains missing setup, and routes unfinished rows to their repair surface.
