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
  `adapters/screentime` implements it (P2-T04): merged windows become absolute DeviceActivity schedules,
  and a met goal, a walking lease or a lapse is expressed by reconfiguring each monitor's action list while
  the app runs, never by arithmetic in the extension. `observeUsage` reports minutes at 5-minute resolution
  and `null` for a day no monitor covered.
- StepsPort: Phase 2 implements Core Motion authorization and midnight-based pedometer totals.
- WalkingPort: Phase 2 implements cadence/gait verification, renewable leases and treadmill framing. `start`
  accepts an enabled walking state rule or walking-minutes target; duration sessions book minutes without
  opening apps until the goal is met.
- GymPort: Phase 2 implements place search, saved locations, geofence presence and check-in.
- HealthPort: Phase 2 reads authorized running/cycling workouts.
- AuthPort: `src/auth` implements it on Supabase (identity only, D1). One user id runs from the
  anonymous session at first launch through every sign-in: Apple and Google link a native id token
  onto that user, email links an address to it, and only a provider account that already belongs to
  somebody else switches the id. A sign-in is reported after the VPS `PUT /v1/user` succeeds, so the
  screens never show an account the server has not seen, while the anonymous bootstrap publishes
  first because earning and locking never wait on a network. `__tests__/authContract.ts` is the
  suite the fake and the adapter both pass.
- SubscriptionPort: Phase 2 implements Adapty entitlement, paywall and restore.
- AnalyticsPort: `adapters/analytics` implements it against PostHog. `track` and `screen` accept any string
  and any bag; the adapter drops what `@excerlock/analytics-events` does not register, so a caller never
  branches on whether an event is legal. `setPersonProperties` is `$set` on the current person — the four
  onboarding answers, never an event payload. `identify` is called for every session, the anonymous one
  included; the adapter is what decides that an anonymous placeholder is not an identity.
- NotificationsPort: Phase 2 schedules local trial and lease reminders through `adapters/notifications` over
  expo-notifications. Two laws: `status()` is synchronous and agrees with the last `request()` result, and
  `cancel(id)` never throws for an id it does not know. `scheduleTrialReminder(at, daysBefore?)` and
  `scheduleWalkLeaseWarning(at, variant?)` are the only schedulable kinds; the third catalog id
  (`SHIELD_OPEN_NOTIFICATION_ID`) is enqueued by the ShieldAction extension alone. `__tests__/notificationsContract.ts`
  runs against the fake and the adapter.
- SyncPort: backup and restore of rules (with explicit deletion tombstones), rule days, usage days, earned
  unlocks, sealed history and the profile, every row stamped with `updatedAt` (D5). Never a source of truth
  for enforcement; the app selection never travels. Real adapter in `src/adapters/sync`; the fake is an
  in-memory server so the sign-in restore can be exercised locally.
- ClockPort: Phase 2 observes system time and timezone changes.
- ReachabilityPort: network-backed screens distinguish offline failures; local-first flows never consult it.

models.ts defines shared facts. RuntimeControls is a local-only developer interface and is never a product service adapter.

`SupportPort` accepts one `SupportRequest`: category, message, reply address and the privacy-floored diagnostics assembled by the domain. Its Phase 1 fake simulates latency/outcomes and sends no message over a network; the real port is `adapters/api`'s `POST /v1/support` client.
