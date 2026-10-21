# App Review reply draft — 1.0.2 (22)

Owner draft only. **Do not send as a claim about the currently embedded build-22 bundle.** First deliver the fix through an approved route, verify the signed artifact on affected physical devices, and update the review notes. No reply or submission was sent from this worktree.

```text
Thank you for the screenshot and device details. We reproduced the subscription-verification error shown after sign-in. Authentication could succeed while a temporarily unavailable store-environment or subscription check prevented the app from continuing.

We have corrected that recovery path. Verification now retries its failed step. A newly signed-in account without a purchase can continue to the subscription options if verification is temporarily unavailable. An unfinished purchase stays in recovery, with Try again, Restore purchases and Account and help; retry does not initiate another purchase. Protected app access still requires independently verified subscription admission.

We also clarified the full subscription price, billing period, automatic renewal and cancellation terms, and checked the sign-in, subscription and Setup screens on iPhone and iPad simulator sizes.

Our previous review notes incorrectly described optional sign-in. In this version, onboarding and subscription options are available before sign-in, but an Apple, Google or email-code sign-in is required before Setup and Home. The corrected notes describe the actual review path and the disclosed demo settings. No shared demo credentials are necessary.

To review the corrected flow, start at Welcome and choose Sign in, or use Get started and continue to the subscription options. Continue with Apple, Google or a six-digit email code. An account without a purchase opens the subscription options; an existing verified subscription continues into Setup or Home.
```

Before sending, add only the exact delivery version/update and physical-device results the owner has verified. Do not claim Apple's particular initiating failure was established, that native iOS 27 Apple authorization was repaired, or that Guideline 5.1.1(v) is resolved. Required sign-in remains an owner policy decision; if that behavior changes, rewrite both this draft and the review notes.

Investigation and evidence: [Build 22 recovery](../plans/2026-10-20-review-221-recovery.md). Policy: [ADR 0087](../adr/0087-recoverable-subscription-verification.md).
