# Ports

Vendor-free boundaries. Every interface has a local fake in demo/fakes; features obtain them through runtime.

- ScreenTimePort: Phase 2 implements FamilyControls authorization, opaque selection, shielding, absolute monitor plans and measured usage. `describeSelection` re-verifies the opaque selection; a null handle is always an empty selection regardless of stale counts. `observeEnforcement` reports applied shield state without exposing app identities.
  Two laws bind `applyLock(decision, plan, monitors): Promise<ApplyResult>`, where `plan` is the enforcement
  policy (shields, monitors) the domain decided and `monitors` is the absolute window plan to register:
  - **Fail closed.** If registering the renewal monitor fails, the adapter applies the shield before it
    reports the failure, so a broken monitor never leaves apps open (ported from
    `app/src/screentime/native/NativeShieldScheduler.ts:196-199,232-242`). The result carries
    `applied: false` and a `reason`; the runtime host publishes it and Home says blocking is not on.
    Every `ApplyFailureReason` means shields up, never down.
  - **Idempotent once applied.** A repeat call with an unchanged decision, policy and plan is a no-op that
    returns the previous result, so a frequent caller costs nothing. A failed apply is not a settled state:
    the next call re-runs it, which is what the Home retry action relies on.
- StepsPort: `adapters/steps/StepsAdapter` over Core Motion. The day total is a historical pedometer query anchored at local midnight plus the live delta since updates began; steps never come from HealthKit (B11), so a goal reached with the app closed is noticed on the next launch.
- WalkingPort: `adapters/walking/WalkingAdapter` over `WalkVerifier`, the phone-placement classifier and the
  foreground location keep-alive. It emits `verified` / `unverified` into the domain's session machine and
  owns neither time nor credit; `adapters/walking/placementHandoff` is the treadmill machine
  (scanning → propped → handheld → handoff) and decides only whether a motion verdict is the user or the
  console shaking. `start` accepts an enabled walking state rule or walking-minutes target; duration sessions
  book minutes without opening apps until the goal is met.
- GymPort: `adapters/gym/GymAdapter` over geofence transitions and Apple Maps search. A visit is an enter and an exit, so dwell is the domain's arithmetic and never an adapter accumulator. `enableAutoDetect` and the reconcile that restores it are the only paths allowed to request Always location.
- HealthPort: `adapters/health/HealthAdapter` over `adapters/health/kingstinctWorkouts`, which keeps the activity type, the distance and `HKWasUserEntered` that the Phase 1 HealthKit client dropped. Manual entries are reported with `source: 'manual'`; the domain decides they never count.
- AuthPort: Phase 2 implements Supabase identity, OTP and deletion.
- SubscriptionPort: Phase 2 implements Adapty entitlement, paywall and restore.
- AnalyticsPort: Phase 2 emits sanitized PostHog events.
- NotificationsPort: Phase 2 schedules local trial and lease reminders.
- SyncPort: Phase 2 synchronizes rules and day facts with the VPS.
- ClockPort: Phase 2 observes system time and timezone changes.
- ReachabilityPort: network-backed screens distinguish offline failures; local-first flows never consult it.

models.ts defines shared facts. RuntimeControls is a local-only developer interface and is never a product service adapter.

`SupportPort` accepts one `SupportRequest`: category, message, reply address and the privacy-floored diagnostics assembled by the domain. Its Phase 1 fake simulates latency/outcomes and sends no message over a network.
