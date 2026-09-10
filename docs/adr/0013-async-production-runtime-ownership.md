---
status: accepted
date: 2026-09-10
---

# 0013: Async production runtime ownership across UI and background tasks

## Decision

Construct the real native/client graph asynchronously after successful hydration of every owned store.
One VM-owned singleflight instance serves both the React provider and cold TaskManager bootstrap.
The provider renders an explicit startup/retry surface until construction succeeds; it never substitutes
fake ports. UI unmount does not dispose the VM's background owner. Explicit teardown awaits startup and
resource disposal before allowing a replacement. The custom Expo entry registers bootstrap/tasks before
Expo Router, following Expo's documented custom-entry contract.

## Context

The previous production constructor deliberately threw rather than shipping demo services. Native,
identity, billing, detection and policy ports now exist and the async graph is wired. Competing startup
paths would duplicate sensors/SDK identity and handler ownership. Zustand rehydrate failures can resolve
rather than reject, so the hydration barrier also checks hasHydrated. Native policy reads use durable
revision seeding and committed detection snapshots; clock ticks do not requery pedometer history.

## Consequences

Production and preview use the same graph even under Metro development mode. Fake runtime requires a
compile-time __DEV__ branch; actual iOS export verifies no demo source graph. Failures are visible/retryable,
not a clean-install reset. Confirmed deletion has a separate durable local-erasure hook; pre-request cleanup
only suspends enforcement/tracking and failed deletion can resume. OS permission grants survive local erase.
OTA/notification root activation, walking-minute progress, day sealing/retention, physical device behavior,
and signed/store acceptance still require verification; async construction and unsigned builds do not prove them.

## References

- `0012-persisted-detection-and-conditional-watchdog.md` (accepted, complementary).
- `app-next/src/runtime/createRealRuntime.ts`, `RuntimeSingleton.ts`, `productionRuntime.ts`.
- `app-next/src/runtime/AppRuntimeProvider.tsx`, `app-next/index.js`.
- https://docs.expo.dev/router/installation/ (custom entry; retrieved original HTML because Readability omitted that section).
- `plans/ship/T10-enforcement-domain-watchdog-root.md`.
