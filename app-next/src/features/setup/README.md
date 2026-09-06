# Post-purchase setup

`SetupRoute` resumes X1–X5 behind the entitlement guard and records each step locally. Permission primers call ports only; denied and skipped grants remain visible in the final checklist. `AppsSetup` uses the global fake-picker host. Gym places use the shared sheet and persisted local settings, with When-in-use before the optional Always upgrade.

Sign-in is optional. `SignInScreen` owns email/options state; `EmailCodeScreen` renders the code, resend and error controls. Phase 1's fake verification code is `123456`. The completion checklist reads actual stores rather than assuming permissions or account success.
