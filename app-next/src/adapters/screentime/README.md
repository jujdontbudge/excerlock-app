# adapters/screentime

`ScreenTimeAdapter` is the only place that turns an enforcement decision into Screen Time state.
It decides nothing: `domain/resolveLock` produces the decision, `domain/enforcement` the policy,
`domain/monitorPlan` the windows, `domain/shieldContent` the words. This module applies them.

It sits on two collaborators. `engine/screentime` owns authorization, the system picker, the shields
and the lock-window monitors; the DeviceActivity API itself is here only for the two things that
module deliberately does not own — the app-group facts and the Analytics usage monitor.

## The apply

`applyLock(decision, plan, monitors)` runs in one order, and every early exit leaves the shields up
or leaves them where they already were:

1. **A lapse first** (B21). `plan.monitors === 'unregister'` clears the shields and retires every
   monitor before anything else is considered, including the usage monitor.
2. **Authorization, then selection.** Neither can be faked: a denied authorization or a selection the
   OS no longer resolves reports `screenTimeDenied` / `noSelection` and shields nothing, because
   there is nothing it could shield.
3. **Budget.** A plan `compileMonitorPlan` had to truncate cannot be armed truthfully, so the shield
   goes up and the result is `applied: false, reason: 'monitorBudget'`.
4. **One re-arm routine.** `reconcile` registers exactly the plan's monitors and retires the rest, and
   the lease is armed or stopped with it. A rule edit, midnight, a timezone change, an entitlement
   transition and a lease renewal all arrive here. A registration that throws shields and reports
   `monitorRegistration`.
5. **Usage last.** The usage monitor is measurement, so failing to arm it is not a failed lock.

The result is idempotent once it succeeded — a repeat call with the same decision, policy, plan and
selection returns the previous result — and a failure is never settled, which is what Home's retry
relies on. `shields` reports what the OS is doing, not what was asked for: the engine holds shields
down outside every registered window, so a decision that asks for more than that is reported honestly
rather than optimistically.

## The extension decides nothing

There is no arithmetic on the OS side. A met goal, a gym hold, a walking lease and a lapse are
expressed by **reconfiguring each monitor's action list** while the app runs, which is safe because
none of those facts can be recorded any other way. `actions.ts` holds the whole table and produces
the per-monitor `startIntents` the engine's `reconcile` takes: a monitor whose window starts before
the unlock expires opens the apps at `intervalDidStart`, every other monitor shields. Interval ends
are not in the table — a merged window ending can only mean no rule is active, so the engine always
clears at one.

## Measured usage

A DeviceActivity monitor per local day (`excerlock.usage.v1.<day>`) over the locked selection, with
cumulative threshold events every 5 minutes and `includesPastActivity`, so time spent before the app
got round to arming it still counts. No action type can add up a counter on the OS side, so the
extension's record of which thresholds fired *is* the counter: the app reads it back and stores the
highest one reached, sealing a day's total before its events are cleaned up.

Two limits, both by construction:

- **Resolution is 5 minutes**, and usage above `USAGE_CAP_MINUTES` (8 hours) reads as the cap.
- **A day with no monitor is unmeasured, not zero.** `measuredUsage(day)` returns `null` for it, and
  Analytics renders that differently. Arming happens on an apply, so a day the app never opened stays
  unmeasured for good.

## The app group

`appGroup.ts` owns the facts key and the usage record, both versioned: a record from a schema this
build does not know reads as nothing rather than as a wrong fact. Shield copy goes out through the
ported `engine/shield` transport, and `shieldPublisher.ts` adds the one thing that transport has no
concept of — a shield per monitor (B36), which the monitor extension promotes when its window starts.

The Swift extensions still key on the four cause strings of the retired economy while the domain has
three. `NATIVE_CAUSE` is that mapping, and it is load-bearing: each shield's deep link is derived
from the spelling, so `fullLock` and `lockWindow` open `excerlock://locked-apps` and everything else
`excerlock://`. `ShieldContent.plist` carries the same words as the cold-start fallback, and
`guardrails/shield-content.test.ts` derives its expectation from `domain/shieldContent` so the two
cannot drift.

## Boundaries

Nothing here imports a vendor package. `presentAppPicker` and `requestAuthorization` report their
results through `onSelection` and `onAuthorization` because screens read the selection and the
permission from their stores; `storeBindings.ts` is that half of the composition.

## What only a device can answer (P2-T11)

Whether a schedule fires and a shield renders, how often the extension re-reads the published
content, whether 96 threshold events on one monitor is within what DeviceActivity accepts, whether a
backdated `intervalStart` really starts an interval already in progress, and whether re-registering
an already-running monitor re-fires its `intervalDidStart`.
