# App Review reply draft — 1.0.2 (22)

Sent on 2026-10-21 with the 1.0.2 (23) resubmission ([record](../releases/2026-10-21-appstore-1.0.2-build23-resubmission.md)). Sent text:

```text
Thank you for the screenshot and device details. We reproduced the subscription-verification error shown after sign-in: authentication could succeed while a temporarily unavailable store-environment or subscription check stopped the app from continuing.

Build 1.0.2 (23) corrects that recovery path. Verification now retries the step that failed. A newly signed-in account without a purchase continues to the subscription options. An unfinished purchase stays in recovery with Try again, Restore purchases and Account and help, and retrying never starts another purchase. Protected app access still requires verified subscription status.

We also made the subscription disclosures clearer: each plan shows its full price and billing period, and the trial length, renewal and cancellation terms appear above Continue, with Terms of Use, Restore purchases and Privacy Policy on the same screen.

Our previous review notes incorrectly described sign-in as optional. Onboarding and the subscription options are available before sign-in, but an Apple, Google or email-code sign-in is required before Setup and Home, so the subscription can be restored to the account. The updated review notes describe this path. No demo credentials are needed.

To review: start at Welcome and choose Sign in, or tap Get started and continue to the subscription options. Continue with Apple, Google or a six-digit email code. An account without a purchase opens the subscription options; an account with a subscription continues to Setup or Home.
```

The original draft follows.

```text
Thank you for the screenshot and device details. We reproduced the subscription-verification error shown after sign-in. Authentication could succeed while a temporarily unavailable store-environment or subscription check prevented the app from continuing.

We have corrected that recovery path. Verification now retries its failed step. A newly signed-in account without a purchase can continue to the subscription options if verification is temporarily unavailable. An unfinished purchase stays in recovery, with Try again, Restore purchases and Account and help; retry does not initiate another purchase. Protected app access still requires independently verified subscription admission.

We also clarified the full subscription price, billing period, automatic renewal and cancellation terms, and checked the sign-in, subscription and Setup screens on iPhone and iPad simulator sizes.

Our previous review notes incorrectly described optional sign-in. In this version, onboarding and subscription options are available before sign-in, but an Apple, Google or email-code sign-in is required before Setup and Home. The corrected notes describe the actual review path and the disclosed demo settings. No shared demo credentials are necessary.

To review the corrected flow, start at Welcome and choose Sign in, or use Get started and continue to the subscription options. Continue with Apple, Google or a six-digit email code. An account without a purchase opens the subscription options; an existing verified subscription continues into Setup or Home.
```

Before sending, add only the exact delivery version/update and physical-device results the owner has verified. Do not claim Apple's particular initiating failure was established, that native iOS 27 Apple authorization was repaired, or that Guideline 5.1.1(v) is resolved. Required sign-in remains an owner policy decision; if that behavior changes, rewrite both this draft and the review notes.

Investigation and evidence: [Build 22 recovery](../plans/2026-10-20-review-221-recovery.md). Policy: [ADR 0087](../adr/0087-recoverable-subscription-verification.md).
