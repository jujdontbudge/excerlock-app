# Enforcement and the App Group schema

`EnforcementHost` publishes Lock decisions through `NativeEnforcementTransport`.
`modules/excerlock-enforcement/ios` owns the native schema. The finalized Expo
plugin copies the shared Swift sources byte-for-byte into the monitor extension;
generated copies are not source inputs. Ordinary builds use
`group.com.johansardar.excerlock`; Linked Recorder builds use their isolated group.

## Existing invariants

- `enforcement-policy-v1.json` and `enforcement-policy-v1.lock`: the version-1
  coherent policy and cross-process flock. The policy contains revisions,
  account/policy/selection generations, selection payload, watchdog registrations,
  windows and the shielded flag. Its schema and filenames stay unchanged. Ordinary policy publication does not
  clear unread Bank ticks; Bank owns its arm/disarm lifecycle.
- A revision identifies an immutable `eligibleUntil` as well as its state and context, matching Swift's `publish` guard. Open policies without a timed Unlock use zero; a clock tick never invents a new deadline or revision for them. Timed and shield policies include their deadline in the source signature.
- UserDefaults `familyActivitySelectionIds`, opaque handle
  `excerlock.selection.locked.v1`: the native-only FamilyActivitySelection payload.
- UserDefaults `excerlock.shield.copy-overrides.v1`: canonical remote shield copy,
  shared with ShieldConfiguration. The existing causes are unchanged; `bankEmpty`
  is additive and accepts the same title/subtitle overrides.
- `excerlock.shield.current-cause.v1` and `excerlock.shield.runtime-context.v1`:
  Bank drain publishes `bankEmpty` with `routeHomeAvailable: true` before applying
  an exhausted Bank shield. Successful re-arm/disarm clears only Bank-owned
  context. ShieldAction sends the existing `shield_open` notification with
  `excerlock://shop`, and the notification landing opens the Shop tab. Existing
  causes, routes and notification identifiers retain their meaning.

Bank copy has one bundled source, `bankShieldCopy.json`. The ShieldConfiguration
Expo target config copies it to the generated JSON resource the extension reads;
the simulator preview imports the same source. App Group copy overrides apply
on top through `ShieldCopyPort`. The legacy `ShieldContent.plist` is unchanged.

## Additive Bank schema (ADRs 0081, 0082)

New App Group file key: **`bank-drain-v1.json`**. No existing key is renamed or
repurposed. Reads, writes, arm/disarm and extension callbacks use the existing
policy flock. Writes are atomic and protected until first device unlock after
reboot. The file is removed on disarm.

Version-1 fields:

| Field | Meaning |
|---|---|
| `version` | `1` |
| `armId`, `armedAt` | Unique arm generation and wall-clock milliseconds |
| `bankMinutes`, `tickMinutes` | Purchased minutes at arm; 1-minute ticks (5-minute fallback) |
| `selectionPayload` | Native-only selection snapshot, never returned to JS |
| `monitorId` | Current one-shot interval generation |
| `intervalStart`, `intervalEnd` | Wall-clock milliseconds for the current 24-hour interval |
| `completedMinutes` | Sealed usage from prior intervals since this arm |
| `intervalOffsetSeconds`, `intervalReachedSeconds` | Already-booked usage at re-arm, and the highest raw reached threshold in this interval |
| `observedAt` | Wall-clock milliseconds of the latest tick or native transition |
| `phase` | `armed`, `exhausted`, or `failed` |
| `failure` | Nullable local failure classification; no selection data |
| `ticks` | Latest 32 reached ticks, each `{ usedMinutes, observedAt }` |

`usedMinutes = min(bankMinutes, completedMinutes + (intervalReachedSeconds - intervalOffsetSeconds) / 60)`.
Duplicates, lower out-of-order thresholds, warning callbacks and callbacks from
retired monitor generations never increase usage. Each new tick updates the
durable cumulative value and timestamp; only the last 32 individual ticks are
retained, so extension state remains small even for an uncapped Bank.

New monitor namespace: `excerlock.bank-drain.v1.<arm-id>.<interval-id>`.
New event namespace: `second.<threshold-seconds>`, scoped to that monitor.
New ManagedSettings store: `ExcerLockBankDrain`. Disarm clears only this store;
existing `ExcerLockEnforcement` shields remain under the existing policy owner.

## Bank drain contract

`NativeBankDrain` implements `BankDrainPort`. `arm(minutes)` stops all monitors
in the Bank namespace, resets usage to zero and registers one new monitor over
the native Locked apps selection. A fresh arm starts at the next whole second,
so activity before the Bank was armed is excluded. A re-arm with the same
selection during the current interval keeps its start/end and offsets thresholds
by the usage last read/delivered to the caller. The adapter retains the native
arm receipt behind the port; ticks arriving between that read and arm are not
mistaken for already-booked usage. `includesPastActivity: true` catches pending
past usage while excluding usage already booked by the caller. Newly reported
usage is relative to that offset, including unbooked usage from an interval that
ended between the read and arm. Diagnostic reads keep a separate receipt and do
not move the Bank caller's receipt. The ladder contains every tick plus the exact final
remaining threshold (to the next second). A zero-minute arm immediately configures the Bank shield
without a monitor. Successful positive arms clear a previous Bank shield only
after monitor registration succeeds. A refused registration fails closed and
rejects; it does not report success or steal another monitor's slot.

The final reached threshold applies the Bank shield from the extension and
stops its monitor. At interval end the extension carries the highest recorded
usage forward and registers the next 24-hour interval, with past activity from
that boundary included. This continues with the host app closed. A continuation
that arrives after the entire next interval, or registration failure, configures
the shield and records `failed` without declaring the Bank spent. That state
requires reconciliation/re-arm after reading the recorded usage.

`usage()` reads cumulative reached usage since the last arm and an ISO timestamp.
It never queries or returns per-app usage. `subscribe()` polls while the app is
foregrounded on the runtime clock and reads again on foreground. It emits only
changed readings, serializes arm/disarm, and removes polling when the last
subscriber leaves. The Bank caller reads usage before re-arm/disarm and owns disarming on removal,
account transitions or loss of Entitlement. Adapter disposal stops JS polling;
it leaves native protection armed across process teardown. Binary surfaces are optional so older
binaries still boot, but an arm requires the new native build.

Tick lag, Apple's undocumented event ceiling, missed interval-end callbacks,
unreported usage at interval boundaries (one tick plus callback lag), and the
up-to-one-second fresh arm boundary are device-spike limits, not exact usage
claims. Re-arm retains the interval's sub-tick usage and catches late ticks;
interval continuation carries only the highest recorded tick.
A long callback delay fails closed rather than inventing usage.

## Monitor budget and memory

Apple's cap is `MAX_DEVICE_ACTIVITY_MONITORS = 20` (`ports/watchdog.ts`), matched
by `excerlockMaxDeviceActivityMonitors` in shared Swift. Native Bank, watchdog and
window registration guard the cap. Bank owns at most **one** monitor; it stops
its old monitor before each arm or continuation. Existing windows can occupy
seven live plus seven staged slots, and a watchdog two during renewal: with Bank
that is **17/20** during the largest existing transition (usual maximum 9/20).
Other system activities count too; Bank refuses if the other 20 slots are full.

The ladder is bounded by one interval's possible usage: at most 1,440 events
with 1-minute ticks, or 288 with 5-minute ticks, regardless of Bank size. Extension
callbacks decode only the small state and selection. Only interval continuation
constructs a ladder; no historical event arrays or SDK action tables are loaded.
The event ceiling and extension memory under load remain physical-device gates.

## Dev diagnostic

`excerlock://diagnostics/bank-drain` is guarded by `__DEV__`; its spike arm and
snapshot bridge methods compile only in Debug. It displays native arm state,
registered monitor count, ladder size, used minutes, shield configuration and
recent tick timestamps. Demo mode receives a separate native diagnostic adapter;
its normal `runtime.bankDrain` remains fake. The diagnostic picker is real and
stores only opaque native tokens. The screen does not send readings to analytics,
incident diagnostics, logs or the server. The device procedure is in
[`docs/specs/bank-condition.md`](../../../../../docs/specs/bank-condition.md#device-spike).
