---
status: superseded
date: 2026-10-13
---

# 0079: The client splits installs between the trial and no-trial onboarding placements

## Decision

The client assigns each onboarding session to arm A or B by an FNV-1a hash of `onboarding_trial_offer:<PostHog device ID>`, 50/50. A loads the `onboarding` placement as before. B loads the `onboarding_no_trial` placement and is accepted only when it returns exactly the two approved Variant A `.notrial` twins with no introductory offer; it needs no remote config. Anything else from that placement is judged as A, and failures fall back to A through `onboarding_trial_fallback`. A paywall on `onboarding` with remote config `trial: false` and the twins still yields B, so an Adapty-driven test keeps working.

The assignment is pinned per offer session and resets with it on an identity change. An empty or unreadable device ID assigns A. `onboarding_offer_exposed` adds `assigned_arm` beside the rendered `arm`, so intention-to-treat and as-shown analysis are both possible in PostHog.

Agents operate the experiment through the Adapty CLI: repointing `onboarding_no_trial` to paywall A stops B for every client at once without an OTA, and pointing it back resumes B. Changing the split ratio requires an OTA.

## Context

ADR 0078 placed the split in an Adapty A/B test, but the Adapty CLI cannot create A/B tests, segments or remote config, so every change needed a person in the dashboard. A PostHog flag would be agent-operable but is new-submission material under `docs/ota.md` and the `flag-registry` check. A deterministic hash over an identifier the client already has adds no flag, no native code and no persisted schema, and B shows only products and steps the reviewed binary already presents.

## Consequences

The experiment can be stopped, resumed and analyzed by agents with existing CLIs. PostHog `reset()` clears the device ID, so a sign-out followed by a new onboarding can draw a new arm; onboarding normally runs once per install. The split is uniform over random device IDs (50.1% B over 100,000 UUIDs). The `onboarding_offer_version` audience marker is still set before an `onboarding` load and is no longer needed for B.

## References

- [0078](0078-adapty-onboarding-trial-assignment.md), assignment superseded here; screens, checkout, trial length and analytics otherwise unchanged.
- `app-next/src/packages/subscription/createOnboardingOffer.ts`, `AdaptySubscriptionAdapter.ts`.
- [Subscription setup](../subscriptions.md#three-day-trial-versus-no-trial-experiment).

Superseded by [ADR 0091](0091-guest-first-accounts-and-adapty-access.md).
