# adapters/screentime

`ScreenTimeAdapter` is the only place that turns an enforcement decision into Screen Time state.
It decides nothing: `domain/resolveLock` produces the decision, `domain/enforcement` the policy,
`domain/monitorPlan` the windows, `domain/shieldContent` the words. This module applies them.

## The apply

`applyLock(decision, plan, monitors)` runs in one order, and every early exit leaves the shields up
or leaves them where they already were:

1. **A lapse first** (B21). `plan.monitors === 'unregister'` clears the shields and stops every
   monitor before anything else is considered, including the usage monitor.
2. **Authorization, then selection.** Neither can be faked: a denied authorization or a selection the
   OS no longer resolves reports `screenTimeDenied` / `noSelection` and shields nothing, because
   there is nothing it could shield.
3. **Budget.** A plan `compileMonitorPlan` had to truncate cannot be armed truthfully, so the shield
   goes up and the result is `applied: false, reason: 'monitorBudget'`.
4. **Shield, then arm, then clear.** Applying shields first; clearing them only after the monitors
   that will raise them again are registered. A `startMonitoring` that throws shields and reports
   `monitorRegistration`.
5. **Usage last.** The usage monitor is measurement, so failing to arm it is not a failed lock.

The result is idempotent once it succeeded — a repeat call with the same decision, policy, plan and
selection returns the previous result — and a failure is never settled, which is what Home's retry
relies on.

## The extension decides nothing

There is no arithmetic on the OS side. A met goal, a gym arrival, a walking lease and a lapse are
expressed by **reconfiguring each monitor's action list** while the app runs, which is safe because
none of those facts can be recorded any other way. `actions.ts` holds the whole table: a monitor
whose window starts before the unlock expires opens the apps at `intervalDidStart`, every other
monitor shields, and every `intervalDidEnd` clears — merged windows mean an interval ending can only
mean no rule is active.

Monitor names come from the window itself (`monitorNameForLockWindow`), so a name already running is
an unchanged window: it is reconfigured, never restarted.

## The walking lease

One renewable 15-minute interval, `excerlock.lease.v1`, whose `intervalDidEnd` blocks. Its start is
backdated to `leaseUntil - 15 minutes` so a mid-flight renewal still asks for the minimum interval
DeviceActivity accepts. This is the only place the backdated start survives; B32's 30-minute minimum
window removed the need for it everywhere else.

## Measured usage

A DeviceActivity monitor per local day (`excerlock.usage.v1.<day>`) over the locked selection, with
cumulative threshold events every 5 minutes and `includesPastActivity`, so time spent before the app
got round to arming it still counts. No action type can add up a counter on the OS side, so the
extension's record of which thresholds fired *is* the counter: the app reads it back and stores the
highest one reached.

Two limits, both by construction:

- **Resolution is 5 minutes**, and usage above `USAGE_CAP_MINUTES` (8 hours) reads as the cap.
- **A day with no monitor is unmeasured, not zero.** `measuredUsage(day)` returns `null` for it, and
  Analytics renders that differently. Arming happens on an apply, so a day the app never opened stays
  unmeasured for good.

## The app group

`appGroup.ts` owns the keys and their versions. `EnforcementFacts` is the whole snapshot, written on
every apply; a record from a schema this build does not know reads as nothing rather than as a wrong
fact. `shieldPublisher.ts` writes the three keys the shipped extensions actually read, plus one
shield per monitor (B36) that the monitor extension promotes when its window starts.

## Boundaries

The native surface is declared in `deviceActivity.ts` and nothing here imports a vendor package.
`presentAppPicker` and `requestAuthorization` report their results through `onSelection` and
`onAuthorization` because screens read the selection and the permission from their stores.

## What only a device can answer (P2-T11)

Whether a schedule fires, whether a shield renders, how often the extension re-reads the published
content, whether 96 threshold events on one monitor is within what DeviceActivity accepts, and
whether a backdated `intervalStart` really starts an interval already in progress.
