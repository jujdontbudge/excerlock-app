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
- StepsPort: Phase 2 implements Core Motion authorization and midnight-based pedometer totals.
- WalkingPort: Phase 2 implements cadence/gait verification, renewable leases and treadmill framing. `start`
  accepts an enabled walking state rule or walking-minutes target; duration sessions book minutes without
  opening apps until the goal is met.
- GymPort: Phase 2 implements place search, saved locations, geofence presence and check-in.
- HealthPort: Phase 2 reads authorized running/cycling workouts.
- AuthPort: Phase 2 implements Supabase identity, OTP and deletion.
- SubscriptionPort: Phase 2 implements Adapty entitlement, paywall and restore.
- AnalyticsPort: Phase 2 emits sanitized PostHog events.
- NotificationsPort: Phase 2 schedules local trial and lease reminders through `adapters/notifications` over
  expo-notifications. Two laws: `status()` is synchronous and agrees with the last `request()` result, and
  `cancel(id)` never throws for an id it does not know. `scheduleTrialReminder(at, daysBefore?)` and
  `scheduleWalkLeaseWarning(at, variant?)` are the only schedulable kinds; the third catalog id
  (`SHIELD_OPEN_NOTIFICATION_ID`) is enqueued by the ShieldAction extension alone. `__tests__/notificationsContract.ts`
  runs against the fake and the adapter.
- SyncPort: Phase 2 synchronizes rules and day facts with the VPS.
- ClockPort: Phase 2 observes system time and timezone changes.
- ReachabilityPort: network-backed screens distinguish offline failures; local-first flows never consult it.

models.ts defines shared facts. RuntimeControls is a local-only developer interface and is never a product service adapter.

`SupportPort` accepts one `SupportRequest`: category, message, reply address and the privacy-floored diagnostics assembled by the domain. Its Phase 1 fake simulates latency/outcomes and sends no message over a network.
