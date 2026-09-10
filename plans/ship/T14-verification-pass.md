# T14 — Verification pass and evidence (tested like a real user)

> Scope revision (Johan, 2026-09-10): physical-device functional checks remain ACTIVE. Formal startup/battery measurements are deferred to `../post-ship/README.md` F02; crashes, hangs and severe battery defects are not deferred.


Repo rules: Maestro banned; headless simulator; `asc`/`simctl`/`idb`; screenshots record the bundle/update id.

## Steps

1. **Simulator run** (fresh device, `preview` build, StoreKit config): scripted with `idb`/`simctl` +
   screenshots at every screen: onboarding all 20 + walking and gym branches, trial screens, paywall
   (purchase, restore, cancel, offline, fetch failure), X1–X5 with real FamilyControls authorization and the
   real picker, Home in every `LockDecision` state via dev-menu fixtures, Conditions CRUD, Analytics,
   every Settings row including account deletion and export, lapse modal, sign-in all three providers.
2. **Device pass** (T00 phone): T11 acceptance, T10 force-quit watchdog, shield actually blocks a
   real app, camera scan, geofence, notifications, native Apple sign-in, sandbox purchase, OTA ritual on the
   TestFlight install.
3. **Lock-state audit**: a table of every transition in `01-detection-model.md` §7 × {foreground, backgrounded,
   force-quit, Always denied, clock rewind, timezone change, DST} with observed result. Any cell not "as
   specified" is a bug ticket before submission.
4. Accessibility and Dynamic Type XL on real screens (P2-T25 scope) — no clipped copy.

## Acceptance

- [ ] `evidence/T14/simulator/` and `/device/` complete; the lock-state table has no unexplained cell.
