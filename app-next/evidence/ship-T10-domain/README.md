# T10 legacy public contract migration

Migrated the public walking and lock-decision contracts away from `WalkingSession` and UI-visible enforcement deadlines. The Home manual check delegates its bounded three-second verification to `WalkingPort.check`; automatic policy remains reducer-owned. `resolveLock` preserves earned-first ordering, permits live walking/propped relief only for active state-walking rules, prevents target-walking early relief, and checks confirmed gym relief before normal window states.

Verification on 2026-09-10:

- `npm run typecheck --workspace app-next` — pass
- `npm test --workspace app-next -- --runInBand` — 198 suites, 903 tests, 13 snapshots passed
- `git diff --check` — pass

This is unit/type evidence only. It does not prove native device enforcement, background delivery, or hardware detection behavior. T11 integration must map persisted detection reducers to `WalkingStatus`; its propped state currently lacks the persisted verified/since timestamp required to populate `unlockedPropped.since`, so root composition must add or derive that field from authoritative persisted evidence rather than inventing a timestamp.
