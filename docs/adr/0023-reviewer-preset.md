---
status: accepted
date: 2026-09-10
---

# 0023: Honest release reviewer preset

## Decision

The release onboarding recognizes the exact, case-sensitive name `App Review`, independently of analytics
or network availability. A boolean PostHog `review_preset` flag can select the same path. Before leaving the
name screen, the app applies a persisted, one-shot ordinary walking-rule draft: 20 steps, all day, on the
current device-local weekday. Every later builder, plan-build, summary, commit and editor surface consumes
that draft; the preset grants no sensor, entitlement, purchase or enforcement bypass.

Twenty steps is the sole additional valid walking-step goal. Normal goal selection retains its 500-step
floor and increments. The preset preserves the existing rule identity and never reapplies over later edits.
Flag lookup fails closed, and an exact-name match never waits for or exposes analytics. A flag exposure is
recorded only when a true remote assignment actually changes the shown journey; the entered name is never
included in analytics.

## Context

App Review needs a short, desk-reviewable path through real Screen Time and pedometer behavior. The prior
draft Review Notes described a 20-step preset, but release code still produced the normal 5,000-step plan.
Changing the rule only at commit would make the accepted summary dishonest, while a development route or
fake step source would not exercise production behavior.

## Consequences

The 20-step goal counts steps already measured inside today's normal all-day window; it does not require 20
new post-install steps. The schedule model is recurring, so choosing the current weekday also recurs weekly;
this is not a one-time date-only condition. Reviewers and users can see and edit the condition normally.
The special goal and exact-name affordance should be removed when the first-review path no longer needs them.

## References

- `docs/asc/review-notes.md`
- `plans/ship/05-review-readiness.md`
- `app-next/src/features/onboarding/reviewPreset.ts`
