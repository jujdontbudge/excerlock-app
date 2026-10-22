---
status: accepted
date: 2026-10-21
---

# 0089: Resume Onboarding with its frozen offer

## Decision

An unfinished Onboarding resumes its saved step on a cold launch. Saved `P` opens the Paywall. Closing that Paywall continues to save the preceding step: `S3d` for a trial offer or `S3e` without a trial. A subsequent launch resumes that step, and Continue returns to checkout with every answer retained.

Save the frozen `OnboardingOffer` metadata alongside the step in the existing Onboarding store, using an additive nullable `offer` field. Restore it before boot routing. Store no SDK product handles; checkout fetches fresh handles from the saved offer's placement and validates its arm before accepting them. Older installs without this field retain their existing offer selection and trial-step fallback. Storage keys and versions remain unchanged.

This supersedes only the process-local offer lifetime and cold-launch re-evaluation in accepted ADR 0078. ADR 0079's install assignment remains unchanged. Account recovery and returning-account admission retain precedence over unfinished Onboarding.

## Context

An App Store user reached the Paywall, returned in a new session 53 minutes later, and was sent to Welcome. On `27e1c54a`, `paywall-relaunch-returns-to-checkout` reproduces this: boot ignores the persisted `P` checkpoint. The offer session also lives only in memory, so restoring a route alone can freeze fallback A before a no-trial offer has loaded.

The earlier `f9b7e338` attempt also introduced broader checkpoint inference, changed Close to Welcome, and added Settings and sign-in surfaces. This change keeps the current navigation and visible screens, using the saved step directly rather than inferring completion from staged answers or a new permanent completion flag. Its implementation is limited to boot routing, the existing offer port, the Onboarding checkpoint, and focused proofs.

## Consequences

- Answers and the frozen offer survive process death together, including arm B's skip of `S3c` and `S3d`.
- Product handles are renewed after relaunch. An unavailable or mismatched catalog follows the existing Paywall retry behavior rather than silently replacing the saved arm.
- The nullable field defaults to null on older installs and is cleared by the existing store reset. This does not grant Entitlement or change paid admission.
- Simulator proofs establish routing and scripted catalog behavior; real StoreKit availability and App Store purchases remain outside this proof.

## References

- [0078: One Adapty offer determines the onboarding tail and checkout](0078-adapty-onboarding-trial-assignment.md) — accepted; offer lifetime superseded here.
- [0079: The client splits installs between the trial and no-trial onboarding placements](0079-install-split-onboarding-trial-assignment.md) — accepted; assignment unchanged.
- [0088: Purchase preflight and durable recovery](0088-purchase-preflight-and-durable-recovery.md) — accepted; recovery precedence unchanged.
- `app-next/src/packages/launch/BootGate.tsx`, `onboarding/onboardingStore.ts`, `onboarding/lib/useOnboarding.ts`, `subscription/createOnboardingOffer.ts`, and `paywall/PaywallSlot.tsx`.
- `.agents/skills/verify-excerlock/references/features/onboarding.md` — checkout and Close relaunch proofs for both arms, plus the walking-goal resume proof.
