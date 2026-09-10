# P2-T15 — Session and credit engine

Pure domain plus the fakes, built in Phase 1 because every Phase 2 adapter is written against it. Decisions:
B3, B8, B22, B28, B29, B31. Findings: 1, 8, 31, 32, 38, 41, 58, 62, 63, 64, 84, 87, 88, 96, 106, 114.
Per-finding detail: `docs/audit/fix-map.md` § P2-T15.

**The law:** timestamps are the source of truth. Every duration is the difference of two recorded instants,
clamped to ≥ 0 and to the interval it is attributed to, and every write is a recomputation from those instants,
never an increment. A replay, a relaunch, a background wake and a foreground tick produce the same number.

## 1. One clock

`ClockPort` gains `at(deadline, cb): Unsubscribe` (fires once at or after the deadline) and `monotonicMs()`.
Nothing outside the port calls `setTimeout`/`setInterval` for product meaning. The fake evaluates deadlines
on its tick, so a dev-menu time jump fires the gym confirmation, the lease and the framing grace together
(finding 93's hook move is P2-T21). The real adapter arms a timer **and** re-evaluates every deadline on
`AppState → active`, because a suspended app's timer does not fire. Rewind protection is P2-T14's
`effectiveNow`.

## 2. Walking session machine (findings 1, 31, 38, 63, 84, 88, 106; B29)

`WalkingSession` grows `id`, `placement`, `instanceDay`, `verifiedAt`, `creditedThrough`, `endedAt`,
`endReason`. `src/domain/sessions/walkingSession.ts` (NEW):

```ts
stepWalkingSession(session, event, config): { session; effects: SessionEffect[] }
// events: verified | unverified | tick | stop{reason}
// config: { leaseMs: 900_000, graceMs: settings.stopGrace * 1000, windowEnd, dayEnd }
// effects: creditMinutes{from,to} | leaseWarning{at} | cancelWarning | ended{reason}
```

- **Renewal.** Any `verified` event sets `leaseUntil = at + 15 min`, indefinitely, no cap. A lapsed lease is
  never revived (the three functions of `packages/ledger/src/walk.ts` copied into `domain/sessions/lease.ts`
  with attribution); only an explicit `start()` reopens access. No `renew()` on the port.
- **Propped is the same machine.** `completeProppedScan()` is a `verified` event. Per `docs/specs/treadmill-mode.md`
  the propped path has no continuous signal, so the lease is its only bound: it lapses 15 minutes after the
  last scan or handheld verification, ends the session with `leaseLapsed`, and Home and the ceremony show
  `unlockCopy.scanAgain`. A verified propped session therefore books minutes with no playback loop anywhere
  (blocker 1). The placement handoff machine stays in P2-T05.
- **Grace uses the setting.** `unverified` while `walking` → `grace` with `graceUntil = at + stopGrace`;
  `verified` during grace returns to `walking` and renews. Grace time is not walked time.
- **Credit.** On every event, if the outgoing phase was `walking`, emit `creditMinutes{from: creditedThrough,
  to: min(at, leaseUntil, windowEnd, dayEnd)}` and advance `creditedThrough`. The high-water mark makes replay
  idempotent (findings 63, 84): `resume()` recomputes from the record.
- **Teardown.** `clock.at(windowEnd)` and `clock.at(dayEnd)` fire `stop` with `windowEnded` / `dayRollover`;
  pausing, deleting or editing the rule out of today fires `stop{ruleChanged}`. Armed at the root by P2-T17.
- **Starting early.** `start()` refuses with a typed `notScheduled` when no instance contains `now` and none
  starts within one lease; Home renders the copy (P2-T19).
- Credit reaches `ruleDaysStore` through `applyProgress`, which latches `met` for `target/minutes` walking
  rules (P2-T16) and keeps `state` rules unmet. `demo/walkingProgress.ts`, `walkTiming.ts` and the three
  `900000` literals in `WalkingFake` go; the fake becomes a thin driver feeding scripted events.

## 3. Gym visits and dwell (findings 32, 58, 114; B22, B31)

`GymPort` gains a rule-agnostic visit surface:

```ts
type GymVisit = { id; placeId; enteredAt; exitedAt: string | null; source: 'geofence' | 'manual' };
visits(sinceDay): Promise<GymVisit[]>; observeVisits(cb): Unsubscribe; checkIn(placeId): Promise<GymVisit>;
```

Visits persist in `excerlock-next.gymVisits.v1` (migration entry via P2-T13). `src/domain/gymDwell.ts` (NEW)
clips every visit to the local day, merges overlaps (overlapping radii never double-count), treats an open
visit as running to `now`, and sums. Dwell is a per-day accumulator independent of the rule's window (B8
parity with steps), so a visit before the condition existed counts. `progressSync` becomes the single applier
for gym as it is for steps *(ship B38 / T07: workout progress is gone; sync is steps-only)*; `demo/gymProgress.ts` and the duplicate write in `GymFake.checkIn`
are deleted. `arrivalFor(rules, visits, now)` derives P2-T14's `gymPresence` input from the open confirmed
visit. Cooldowns, stated once and tested: `VISIT_MERGE_GAP_MS = 120_000` (exit then re-enter within two
minutes extends the same visit; also stops the arrival ceremony replaying at the door);
`CEREMONY_REPLAY_GAP_MS = 300_000`; re-arm after a walking session ends is immediate.

## 4. Day ownership, sealing, retention (findings 8, 62, 64, 114)

- `src/domain/progressDay.ts` (NEW): `progressDay(rule, at, tz): DayKey | null` — the containing instance's day,
  else today's instance day if the rule is scheduled today (B8), else `null` meaning **no row is written**.
  Every writer routes through it; the `?? dayKey(now)` fallback dies. `RuleDay` is keyed by instance day (rule
  accounting); `HistoryDay` by calendar day (activity accounting); a cross-midnight credit interval is split at
  local midnight by `splitAtMidnight`.
- History leaves the dev snapshot for a persisted `historyStore` (`excerlock-next.history.v1`).
  `src/domain/sealDay.ts` (NEW) writes an immutable row (`sealedAt`) for every day from the last sealed day
  through yesterday, bounded to 400 days, at hydration, on foreground and when `dayKey(now, tz)` changes. An
  unopened scheduled day seals as missed and the streak breaks honestly. Same pass prunes `ruleDays` beyond 35
  days and `earnedUnlocks` beyond two; `resolveLock`'s met scan is bounded to today and yesterday.

## 5. Health port (finding 87)

`Workout` carries `source: 'device' | 'manual'`; the fake and `progressSync` filter manual entries; contract
test "a manually entered workout never counts". P2-T05 inherits the suite.

## 6. DST, midnight, timezone (finding 96)

Every deadline is an instant, never a wall-clock offset. Rollover is a changed `DayKey`, not a 24-hour timer.
A session records `instanceDay` at start. `localInstant` returns `{ instant, converged }`; `windowInstances`
keeps the spring-gap clamp, lease and seal math assert convergence in `__DEV__`, with Australia/Adelaide and
Australia/Lord_Howe cases.

## 7. Port contract suites and scenarios (finding 41, scenarios half)

`src/ports/__tests__/walkingContract.ts` (verified renews; a lapsed lease cannot be revived; credit is
idempotent across replay; `start()` before the window returns `notScheduled`),
`src/ports/__tests__/gymContract.ts` (a closed visit credits enter-to-exit; overlapping visits count once;
exit + re-enter within two minutes is one visit; `checkIn` returns the visit it opened),
`src/ports/__tests__/healthContract.ts`. Scenarios, all authored against 30-minute windows:
`walking-lease-renewal`, `walking-lease-lapse`, `treadmill-propped-credit`, `treadmill-framing-expired`,
`gym-dwell-background`, `gym-visit-blip`, `window-ends-mid-walk`, `day-rollover-mid-walk`,
`dst-spring-forward`, `dst-fall-back`, `saturday-rest-day`, `clock-rewind`.

## Tests first

"a verified event inside a live lease extends it by 15 minutes"; "a verified event after the lease has lapsed
does not revive it"; "a propped scan credits minutes from the scan instant"; "credit is idempotent across a
replay"; "window end stops the session and credits through the window end"; "a closed visit credits its full
enter-to-exit interval"; "overlapping visits are counted once"; "an exit and re-enter within two minutes is one
visit"; "a scheduled day the app never opened seals as missed and breaks the streak"; "no row is written for an
unscheduled day"; "the gym ring, the lease and the framing grace all advance with the dev clock".

## Acceptance

- [ ] The three port suites pass against the fakes; `WalkingFake` and `GymFake` contain no product timers.
- [ ] `src/domain/README.md` states the timestamp law and the RuleDay/HistoryDay split.
- [ ] P2-T03/T04/T05/T08/T09 amendment sections reference this engine (already appended).
