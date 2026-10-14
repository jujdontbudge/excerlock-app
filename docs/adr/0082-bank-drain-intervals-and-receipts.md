---
status: proposed
date: 2026-10-14
---

# 0082: Bank drain carries usage through bounded native intervals and re-arm receipts

## Decision

Implement ADR 0081's Bank drain in `modules/excerlock-enforcement` and the shared
DeviceActivity monitor extension, behind the exact `BankDrainPort` contract.
One dedicated monitor covers the opaque Locked apps selection with 1-minute
thresholds (`excerlockBankDrainTickMinutes`), with a 5-minute device-spike fallback.
All events use iOS 17.4 `includesPastActivity`.

The monitor uses 24-hour one-shot intervals. At interval end the extension carries
the highest recorded usage into the next interval without opening ExcerLock.
A ladder never exceeds one interval's possible usage (1,440 events, or 288 at
5-minute resolution), even though the Bank is uncapped. The final remaining
threshold configures an independent `ExcerLockBankDrain` ManagedSettings store
and retires the monitor. Registration/continuation failures fail closed without
claiming unmeasured usage was spent.

A re-arm retains the active interval anchor and offsets thresholds by usage the
caller last read or received. A native arm receipt stays private to the adapter;
callbacks arriving between that read and arm remain chargeable. Unbooked usage
from an interval ending during that gap carries into the new arm. Diagnostic
reads keep a separate receipt. Fresh arms exclude usage before the Bank existed.

The additive App Group file `bank-drain-v1.json` uses the existing enforcement
flock and atomic protected writes. It retains cumulative usage, arm/interval
identifiers, selection payload and the latest 32 tick timestamps. No existing
App Group key or policy schema changes. Its field schema and namespaces live in
`src/packages/enforcement/README.md`.

Only explicit arm/disarm resets the meter. Normal policy publication and adapter
disposal preserve unread usage. The Bank caller reads and applies usage before
re-arm/disarm, and disarms on Condition removal, account changes or loss of
Entitlement. Disarm removes the file, stops only Bank monitors and clears only
the Bank ManagedSettings store. Existing windows/watchdogs remain independent.

## Context

The Bank never expires, so a single local-day ladder would forget the remaining
Bank at the next Day boundary. Building an event for every minute of an uncapped
Bank would have unbounded memory and encounter Apple's undocumented event limit.
Bounded native continuation keeps one monitor slot and small persistent state.

Re-arm must neither replay already-booked usage nor discard a tick delivered
between the app's usage read and native registration. Keeping the interval anchor
and the read receipt lets `includesPastActivity` cover that gap. A fresh interval
on every purchase would discard sub-tick and delayed usage.

The existing coherent enforcement policy uses a separate shield store and only
window/watchdog callbacks. Reusing or clearing that store from the meter would
couple Bank cleanup to other Conditions. A separate store keeps both owners
independent while preserving the 20-monitor budget.

## Consequences

- The usual maximum is seven windows, one watchdog and one Bank monitor (9/20).
  The largest existing staged transition is fourteen windows, two watchdogs and
  one Bank monitor (17/20). All native registrations check the cap.
- The adapter polls on foreground clock ticks and reads on foreground. No usage,
  selection, minute or Point amounts are emitted to analytics, logs or the server.
- Tick lag, the event ceiling, extension memory, re-arm continuity, native
  continuation and re-lock with ExcerLock force-quit require the real-iPhone spike
  in the Bank spec. Interval boundaries can lose unreported usage (tick resolution
  plus callback lag); that measured error gates release.
- Debug-only native methods and a `__DEV__` route support the spike. Simulator
  proofs cover bridge access, honest zero usage and existing shield preview;
  they cannot certify Screen Time enforcement or spending accuracy.
- The new native surface needs a new release runtime before shipping. This worker
  builds locally; runtime-version/release integration belongs to the release owner
  under ADR 0042 and the Bank's device gate.

## References

- [0081: Bank Condition](0081-bank-condition.md) — proposed; product authority.
- [Bank spec](../specs/bank-condition.md#device-spike).
- [DeviceActivity gaps](../research/device-activity-gaps.md) — M3, M5, G3, G4.
- [0076: One-minute watchdog](0076-relaunch-and-one-minute-watchdog.md) — accepted.
- [0010: Native target contract](0010-ship-native-target-contract.md) — accepted.
- [0042: Native sensor surface](0042-ota-ready-native-sensor-surface-and-review-port.md) — accepted; runtime precedent.
- `app-next/modules/excerlock-enforcement/ios/BankDrain.swift`.
- `app-next/src/packages/enforcement/NativeBankDrain.ts` and `README.md`.
