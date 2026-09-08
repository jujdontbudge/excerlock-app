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
3. P2-T17's enforcement host (`startEnforcement(runtime)`, mounted above every route guard) calls
   `applyLock(decision, plan)` and re-registers schedules when rules change, at midnight, and on timezone
   change. It applies only on a change of `{ shields, selectionToken, planHash }`, and it awaits the
   `ApplyResult` so a failure fails closed and reaches Home. `useLockDecision()` stays a render selector and
   never calls a port.
4. Usage monitor + `usage_days` store; Analytics reads it (T11's model already handles unmeasured days).
5. Tests: adapter contract tests; schedule generation for weekday sets, cross-midnight, all-day; met-today
   honored by the extension logic (unit-test the Swift-side decision by mirroring it in TS and asserting the
   same table, as the old `ShieldLockWindowContext` tests did).

## Acceptance

- [ ] Simulator: picker returns a handle; `locked` applies; `unlockedMet` clears; schedules registered
      (inspect via the diagnostics log). — needs the device build; **P2-T11**.
- [x] Extension decision table tested for: interval start with met=today → no shield; met=yesterday → shield;
      walk lease live → no shield; lease expired → shield.
      `adapters/screentime/__tests__/actions.test.ts` drives each row through `resolveLock` and asserts the
      action list the monitor is configured with; `adapter.test.ts` asserts the same through `applyLock`.
- [x] Usage counter increments from a simulated threshold event — `__tests__/usage.test.ts` and the
      `observeUsage` row of `adapter.test.ts`, against the DeviceActivity double. The simulator run itself is
      **P2-T11**.
- [ ] Real enforcement, deny path and shield rendering are **not** claimed here; they belong to P2-T11.

### Built 2026-09-07 (`app-next/src/adapters/screentime/`)

`ScreenTimeAdapter` passes `describeScreenTimePort` (`__tests__/contract.test.ts`) with the native layer
doubled. 49 tests across the module; `README.md` states the two measurement limits and the device questions.

| Acceptance row added by the audit | Status |
| --- | --- |
| Overlapping windows stay shielded past the first end with the app killed | Merged monitors and the `intervalDidEnd`-clears rule are unit-tested; the app-killed half is **P2-T11**. |
| Five daily rules register within budget | `compileMonitorPlan` truncation is honoured by failing closed (`monitorBudget`); the count is domain-tested. |
| Sandbox lapse clears within one app run | Tested: the lapse branch runs before everything else and stops every monitor, usage included. |
| Clock set back an hour keeps the apps locked | `effectiveNow`/`nextWatermark` clamp the adapter's own clock reads; the device check is **P2-T11**. |
| The `lockWindow` subtitle renders | Published per monitor (B36) and asserted; rendering is **P2-T11**. |
| The third notification id taps through | **P2-T09** owns the id; the adapter publishes the cause and route the ShieldAction extension reads. |

## Audit amendments (2026-09-07; see `fix-plan.md`) — these override the Design and Steps above where they differ

- **No per-rule schedules.** Step 1 registers the monitors of `compileMonitorPlan(mergedLockIntervals(...))`
  (P2-T14 §2): merged, non-repeating, absolute, at most `LOCK_WINDOW_BUDGET = 16`, re-registered on every
  enforcer run. Overlapping and adjacent windows are one monitor, so an interval end can only mean "no rule is
  active"; monitor count no longer depends on rule count.
- **The extension decides nothing.** "The extension reads the met-today fact to decide" is not implementable
  (no OS-side arithmetic). Met-today, the earned unlock, the walking lease and a lapse are expressed by
  **reconfiguring the monitors' action lists** whenever the app runs (the old `NativeShieldScheduler`
  `blockSelection`/`unblockSelection` swap). Safe because every one of those facts can only be recorded while
  the app runs.
- **Call site.** Step 3 names P2-T17's `EnforcementHost` (`startEnforcement(runtime)` above every route
  guard), not `useLockDecision()`. It applies only on a change of `{ shields, selectionToken, planHash }`.
- **One re-arm routine.** Rule edit, midnight, timezone change, entitlement transition and lease renewal all
  call the same `rearm()`; list it once.
- **Lapse (B21).** On the transition into `expired`/`billingIssue`, clear every shield and unregister every
  monitor before anything else; re-register on the transition back. `unknown` never clears.
- **App-group facts** are `{ schemaVersion, shieldsDesired, unlockUntil, leaseUntil, watermark, entitled,
  planHash, shieldContentByMonitor }`. The walking lease is an output of P2-T15's session machine: on every
  renewal the adapter re-registers the renewable interval and rewrites `{ sessionId, leaseUntil }`; the
  extension re-shields on lapse. Enforcement time is `effectiveNow` (P2-T14 §5).
- **Shield content per monitor (B36).** Publish `Record<monitorName, ShieldContent>` on every apply; the
  `lockWindow` cause has its own subtitle. Open question carried from the audit: how often the extension may
  refresh it; measure in P2-T11.
- **Port signature.** `applyLock(decision, plan): Promise<ApplyResult>` fails closed (shield first, then
  report `applied:false` with a reason); `describeSelection()` re-verifies the handle on foreground and zeroes
  the counts when it no longer resolves; the adapter passes `describeScreenTimePort` (P2-T14 §9).
- **Minimum window** is 30 minutes (B32), so no merged interval needs the backdated-`intervalStart` hack; that
  stays scoped to the walking lease.
- Acceptance rows added: overlapping windows stay shielded past the first end with the app killed; five daily
  rules register within budget; sandbox lapse clears within one app run; clock set back an hour keeps the
  apps locked; the `lockWindow` subtitle renders; the third notification id tap-throughs.
