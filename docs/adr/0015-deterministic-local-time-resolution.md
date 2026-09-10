---
status: accepted
date: 2026-09-10
---

# 0015: Resolve local schedule times deterministically

## Decision

Resolve wall-clock minutes from the actual nearby IANA timezone offsets. Repeated minutes select the earliest instant, while nonexistent spring-forward minutes shift forward by the transition gap and are marked nonconverged. Keep `localInstant` as the string-returning compatibility API and expose `resolveLocalInstant` for callers that must inspect convergence.

`windowInstances` deliberately accepts the spring-gap shift. If independently resolved endpoints collapse or reverse, it returns no instance instead of expanding or creating a negative window.

## Context

The previous three-step offset correction silently returned its final guess when it oscillated across a DST gap. It happened to shift forward in American timezones, but shifted backward in Australia/Adelaide and Australia/Lord_Howe; fold selection was similarly dependent on the timezone's offset sign. P2-T15 requires deterministic gap, fold, midnight, and timezone behavior.

## Consequences

Schedule resolution now has consistent behavior for one-hour and half-hour DST transitions. Critical deadline and sealing callers can migrate to the explicit result and assert convergence; that follow-up is outside this decision's schedule-instance scope. Offset enumeration adds a small bounded pure-computation cost when expanding schedules.

## References

- `app-next/src/domain/calendar.ts`
- `app-next/src/domain/schedule.ts`
- `plans/rebuild/phase-2-backend/P2-T15-session-credit-engine.md`, section 6
