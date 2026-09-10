---
status: accepted
date: 2026-09-10
---

# 0017: Recover unsupported schedules without inventing native policy

## Decision

Validate the complete proposed enabled-rule union before saving or enabling conditions or committing onboarding. Use the runtime clock and timezone for production validation. Never truncate windows, fill gaps, or delete rules to meet the seven day-partitioned native monitor limit.

Hydrated schedules can still become unsupported, including after timezone changes. The runtime must remain available for repair: expose a typed schedule issue, return unknown enforcement, and preserve existing bounded native policy without publishing, renewing, or clearing it. Explicit deletion, disabled enforcement, and lapsed entitlement retain their cleanup behavior. Rule edits continue to advance the source revision and supersede in-flight JS work.

Home replaces normal lock/unlock claims with a recovery notice and Conditions navigation; Conditions offers persistent feedback and keeps pause/delete available. Do not claim that an unsupported new schedule is active.

## Context

The source previously threw for an unrepresentable hydrated schedule. That could fail startup before the user could reach Conditions. Silently clearing shields or broadening/truncating the schedule would instead apply a different policy. Unknown enforcement already preserves bounded native protection without renewal; it is the appropriate repair state, not proof of current OS shielding.

## Consequences

Existing native protection may remain active until the user repairs the schedule or its existing bounds expire. UI states this uncertainty explicitly. Actual OS state and recurrence require device verification. Mutation rejection is atomic and leaves the editor available with actionable feedback.

## References

- `app-next/src/domain/scheduleWindowPlan.ts`
- `app-next/src/domain/scheduleRepresentability.ts`
- `app-next/src/runtime/enforcement/RuntimeEnforcementSource.ts`
- `app-next/src/runtime/enforcement/EnforcementHost.ts`
- `0015-deterministic-local-time-resolution.md`
