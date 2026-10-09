---
status: accepted
date: 2026-10-08
---

# 0071: A gym Condition counts only visits confirmed after it was created

## Decision

- A gym Condition credits only gym visits confirmed at or after its `createdAt` (`progress/gymCreditFloor.ts`). This applies to:
  - arrival and minutes progress (`projectInstanceProgress`, `projectGymHistory`);
  - "Be at the gym" relief (`resolveLock`);
  - the "already credited" check on the gym unlock screen.
- Deleting a gym Condition and adding it again therefore resets it for the day: a visit from earlier today no longer meets it.
- Editing keeps `createdAt`, so an edit does not reset anything.
- "I'm at the gym" now always starts a fresh visit: it records an exit 1 ms before its enter. After a re-add, the user can check in again without leaving the gym, and confirmation takes `PRESENCE_CONFIRM_MS`.
- Walking Conditions are unchanged; they come from step and motion history.

## Context

The owner deleted and re-added an arrival Condition to test it again, and it showed as met at once: today's confirmed visit credited every gym Condition, whenever it was created. Clearing stored visits on delete would not hold, because the visit is re-derived from location records on each reconcile. Counting from creation is pure and needs no new state.

## Consequences

- A Condition created while the user is inside a gym needs a check-in or a new arrival before it counts.
- A manual check-in in the middle of a visit splits that visit into two intervals. Minutes lose only the confirmation time.

## References

- `app-next/src/packages/progress/gymCreditFloor.ts`, `progress/projectInstanceProgress.ts`, `progress/lib/projectGymHistory.ts`, `lock/resolveLock.ts`, `unlock/GymUnlockScreen.tsx`, `activity/GymCheckIn.ts`.
- ADR 0069 (3 s gym check-in).
