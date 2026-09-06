# P2-T04 — `resolveLock` drives Screen Time; usage monitor for Analytics; shield content

This replaces the ledger's `desiredOsState` contract. The old drain ladder, holidays and walk-window
scheduling go away; window instances and met/walking states take their place.

## Design

- `ScreenTimeAdapter implements ScreenTimePort` wraps `src/engine/screentime/native/*`:
  - `applyLock(decision)`: `locked` → apply ManagedSettings shield to the stored selection; any unlocked state
    → clear shields. Idempotent; last applied decision cached in the app group.
  - Schedules: for each enabled rule's window instances over the next 7 days, register DeviceActivity
    schedules (`intervalStart`/`intervalEnd`, repeating weekly) so the monitor extension re-applies shields at
    window start and clears at window end **without the app running**. The extension reads the "met today" and
    "walking lease" facts from the app group (written by the app) to decide whether to shield at interval start.
  - Walking lease (state mode): renewable 15-minute DeviceActivity interval as today (`planWalkIncrement`,
    `extendWalkIncrement` ported); lease expiry in the extension re-shields and posts the walk-lease warning
    30 s before (P2-T09).
  - Met today: when the app records `met`, it writes `{ day, until: relockAt }` to the app group and clears
    shields; the monitor extension honors it at any later interval start on the same day.
  - `observeUsage()` (decision B15): a daily DeviceActivity monitor on the locked selection with cumulative
    threshold events every 5 minutes of usage (`includesPastActivity: true`); each event increments the
    app-group usage counter for the day; the app reads it into `usage_days`. Document the limitation: minute
    resolution is 5, and days the extension was not scheduled show as unmeasured.
- Shield content: `ShieldConfigurationExtension.swift` reads the content model published by
  `src/engine/shield/nativeShieldContentPublisher.ts` from `domain/shieldContent` (strings from Phase 1 T13).
  Causes reduced to `locked`, `lockWindow` (interval start), `walkingEnded`. `ShieldAction` keeps the
  deep-link notification workaround and the two URLs (`excerlock://`, `excerlock://locked-apps` → Home).
- Precedence lives only in `domain/resolveLock`. The engine never decides; it applies.

## Steps

1. Port `screentime/native` and adapt `NativeShieldScheduler` to window instances (tests first with the
   existing `deviceActivitySchedule.ts` helpers).
2. Implement the app-group facts (`met`, `walkLease`, `usageDay`) with versioned keys; extension Swift reads
   them (small additions to `ShieldLockWindowContext.swift`).
3. `useLockDecision()` → effect that calls `applyLock` on every change and re-registers schedules when rules
   change, at midnight, and on timezone change.
4. Usage monitor + `usage_days` store; Analytics reads it (T11's model already handles unmeasured days).
5. Tests: adapter contract tests; schedule generation for weekday sets, cross-midnight, all-day; met-today
   honored by the extension logic (unit-test the Swift-side decision by mirroring it in TS and asserting the
   same table, as the old `ShieldLockWindowContext` tests did).

## Acceptance

- [ ] Simulator: picker returns a handle; `locked` applies; `unlockedMet` clears; schedules registered
      (inspect via the diagnostics log).
- [ ] Extension decision table tested for: interval start with met=today → no shield; met=yesterday → shield;
      walk lease live → no shield; lease expired → shield.
- [ ] Usage counter increments in the simulator with a simulated threshold event (fixture path from the old
      e2e composition root).
- [ ] Real enforcement, deny path and shield rendering are **not** claimed here; they belong to P2-T11.
