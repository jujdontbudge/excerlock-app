# P2-T14 — Enforcement domain

Pure TypeScript, no native code, built against the fakes before any Swift moves. This task owns
`src/domain/types.ts`, `resolveLock.ts`, `validateRule.ts`, `shieldContent.ts` and the `ScreenTimePort`
contract for the whole hardening milestone; later tasks add to these files only in the order given in
`fix-plan.md`. Decisions: B2, B5, B21, B22, B23, B30, B32, B36. Findings: 3, 7, 15, 16, 17, 18, 37, 39, 40,
43, 44, 45, 52, 65, 94, 95, 97, 105, 111. Per-finding detail: `docs/audit/fix-map.md` § P2-T14.

Why P2-T04 as written is not enough: per-rule DeviceActivity intervals unshield during an overlapping window;
per-rule-per-day registration blows Apple's 20-monitor cap at three daily rules; the extension cannot "read
the met-today fact and decide" (there is no OS-side arithmetic; met-today must be expressed by reconfiguring
the monitors' actions, the old `NativeShieldScheduler` pattern); nothing models instant relief, a lapse, a
clock rewind, a null selection or a per-cause shield.

## 1. Precedence law

The sole normative precedence statement is `01-product-model.md` §3. The enforcement gate sits above
`resolveLock`: `enforcementPlan({ entitlement, decision })` decides whether shields may exist at all (§7)
without changing the domain decision.

## 2. Lock intervals and the monitor plan (findings 17, 18, 97)

- `src/domain/lockIntervals.ts` (NEW): `mergedLockIntervals(rules, fromDay, days, tz): LockInterval[]` expands
  every enabled rule with `windowInstances` over `fromDay − 1 … fromDay + days` (the −1 catches a
  cross-midnight instance), sorts, and merges overlapping **and adjacent** intervals, unioning `ruleIds`. An
  `intervalDidEnd` can then only ever mean "no rule is active". P2-T19's day timeline is this function over
  one day; there is no second union implementation.
- `src/domain/monitorPlan.ts` (NEW): `compileMonitorPlan(intervals, now, budget): MonitorPlan` produces
  non-repeating, chronological, absolute monitors with hashed names (port `monitorNameForLockWindow`), a
  `horizonEnd`, a `truncatedAt` when the budget is exhausted, and a `planHash` covering intervals and timezone.
  `LOCK_WINDOW_BUDGET = 16` (20 minus usage monitor, walking lease, one-shot relock, one spare). Monitor count
  no longer depends on rule count. Beyond the budget the plan truncates and the adapter re-registers on every
  run; `assertMonitorBudget` fails **closed** (`applied: false, reason: 'monitorBudget'`, shields up).
- `MIN_WINDOW_MINUTES = 30` exported from `validateRule.ts` (B32); merged intervals therefore clear Apple's
  15-minute floor with 2× margin. `migrateRule` (hydration, via P2-T13's migration table) widens any persisted
  15–29-minute window to 30 minutes, cross-midnight safe, and never drops a rule. A test asserts no fixture in
  `domain/__tests__/fixtures.ts` and no scenario in `demo/scenarios/` violates the constant.

## 3. Earned unlock (B23; findings 15, 16, 37, 52, 111)

```ts
type EarnedUnlock = { day: DayKey; ruleId: string; ruleName: string; metAt: string; windowEnd: string };
```

A separate persisted record in `ruleDaysStore` (`earnedUnlocks`, absent = empty, pruned to two days at
rollover), written by `domain/earnedUnlock.ts` the moment `applyProgress` flips a row to met. `resolveLock`
takes `earnedUnlocks` and reads **no rule** for the met branch, so pausing, deleting or re-scheduling a
condition cannot revoke today's unlock; a Friday earn carries `day: Friday`, so Saturday falls through;
attribution is by earliest `metAt`, never store order. `unlockedMet` gains `byName` and `metAt`. Acceptance for
finding 111: a record whose rules are all gone yields `relockAt: null` and renders `homeCopy.noNext`. Product
model line 139 ("pausing removes a rule from every branch above immediately") is rewritten.

## 4. Instant relief (B22; finding 7)

`LockDecision` gains `{ state: 'unlockedProvisional'; byRuleId; placeId; holdsUntil }`. `LockInput` gains
`gymPresence: { placeId; confirmedAt; holdsUntil } | null`, a **live** fact derived by P2-T15's
`arrivalFor(rules, visits, now)` from the visit surface, never persisted as presence. It applies only after the
30-second confirmation (B31) and only while an enabled gym rule has a current instance. For an `event` rule the
confirmed visit books `met` with `metAt = enteredAt`; for a `minutes` rule presence holds the unlock and `met`
books when dwell reaches the goal. Losing presence lets the state lapse to `locked`; no punishment.

## 5. Clock watermark (finding 40)

`src/domain/watermark.ts` (NEW): `effectiveNow(observed, watermark)` and `nextWatermark(observed, watermark)`.
One module, three callers: the enforcer (P2-T17), the credit engine and the lease check (P2-T15). A backwards
jump greater than 26 hours is a legitimate restore and resets the watermark. Not disabled under the fake
runtime; the dev menu uses `RuntimeControls.setClock({ rewind: true })` so the `clock-rewind` scenario still
exercises the guard.

## 6. Can-enforce and selection integrity (finding 43)

`src/domain/canEnforce.ts` (NEW) returns `{ ok: true } | { ok: false; reason: 'screenTimeDenied' | 'noSelection' }`;
`handle === null` is no selection regardless of counts. `statusContent` and the enforcer consume the same
function so Home and the engine never disagree. The "N apps · M categories" line comes from
`describeSelection()` (§9).

## 7. Enforcement plan for a lapse (B21; finding 3)

`src/domain/enforcement.ts` (NEW): `enforcementPlan({ entitlement, decision })` returns
`{ shields: 'apply' | 'clear'; monitors: 'keep' | 'unregister'; reason }`. `trial` and `active` follow the
decision; `expired`, `billingIssue` and `none` always clear and unregister; `unknown` keeps the last applied
state inside the 3-second budget, then the last persisted known-good status, never a clear (an Adapty outage
must not unshield the user base). Routing and copy are P2-T18; the call site is P2-T17.

## 8. LockDecision fields for Home (findings 39, 94, 95)

`noRulesToday` gains `nextLockAt: string | null` (same shape as `afterWindow`; two pinned examples in the
test file explain the split). `beforeWindow` gains `getAheadRuleId: string | null`, set only when an enabled
**target** rule can be progressed before its window.

## 9. Shield content per cause and the port contract (B30, B36; findings 44, 45, 65, 105)

`shieldContent({ cause, hint, goal, canNotify })`, in this order of landing: staleness-safe copy that names the
goal and never a live remainder, with a claim variant for a goal met while closed (65) → `lockWindow` gets its
own subtitle naming the cheapest unlock for that interval's rules, published as `Record<monitorName,
ShieldContent>` to the app group on every apply (44) → `canNotify: false` collapses to a single Close button,
and the third notification id `excerlock.shield.open` exists, enqueued only by ShieldAction (45; B14's
wording in `00-decisions.md` is amended to "two user-facing notifications plus the shield tap-through id").
The dev-menu `ShieldPreview` shows all three causes and picks its hint with `unlockHint`'s ordering law (105).

Port: `applyLock(decision, plan): Promise<ApplyResult>` where
`ApplyResult = { applied; shields: 'up' | 'down'; monitors: number; reason? }`; `describeSelection(): Promise<LockedApps>`;
`observeEnforcement(cb)`. `src/ports/README.md` states the fail-closed law (shield first, then report) and
idempotency. `src/ports/__tests__/screenTimeContract.ts` (NEW) exports `describeScreenTimePort(make)`;
`ScreenTimeFake` passes it now, the adapter passes it in P2-T04. `04-architecture.md` port table updated.

## Tests first (in order)

`lockIntervals.test.ts`: two overlapping windows merge; adjacent windows merge; cross-midnight; all-day runs;
DST day. `monitorPlan.test.ts`: five daily rules compile to at most sixteen monitors; truncation reports the
first uncovered interval; no compiled interval is shorter than thirty minutes; stable hash.
`validateRule.test.ts`: a 20-minute window is rejected; a persisted 20-minute window hydrates as 30 and no
rule is dropped. `resolveLock.test.ts`: a met Friday does not unlock Saturday; the earned unlock survives
pausing, deleting and re-scheduling; two rows credit the earliest `metAt` whatever the store order; a
snapshot with all rules gone yields `relockAt: null`; a confirmed gym arrival unlocks provisionally and an
unconfirmed one does not; a session outside its window does not unlock; a duration session does not unlock;
rewinding the clock does not revive an expired lease. `watermark.test.ts`, `canEnforce.test.ts`,
`enforcement.test.ts` (expired clears while `resolveLock` says locked; unknown keeps the last state),
`shieldContent.test.ts` (lockWindow has its own subtitle; no subtitle contains a live remainder; no
notification permission collapses to one button). Then the port contract suite against the fake.

## Doc edits owned here

`01-product-model.md` §2 (RuleMode unchanged here; `EarnedUnlock`, `LockDecision`, `LockInput`), §3
(precedence law above, consequences list), §9 (lapse text); `04-architecture.md` port row; `00-decisions.md`
B14 wording; `src/domain/README.md` (nullability of `relockAt`/`nextLockAt`, the RuleDay-vs-history split from
P2-T15).

## Acceptance

- [ ] Domain coverage floor holds; every test above exists and passes.
- [ ] `ScreenTimeFake` passes the contract suite; `RuntimeControls.invalidateSelection()` exists.
- [ ] Product model §3 is the single statement of precedence; no task file restates it.
