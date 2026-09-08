# Ports

Vendor-free boundaries. Every interface has a local fake in demo/fakes; features obtain them through runtime.

- ScreenTimePort: Phase 2 implements FamilyControls authorization, opaque selection, shielding, absolute monitor plans and measured usage. `applyLock` is idempotent. It raises the shield before reporting an apply failure, so budget or adapter errors fail closed. `describeSelection` re-verifies the opaque selection; a null handle is always an empty selection regardless of stale counts. `observeEnforcement` reports applied shield state without exposing app identities. Every `ApplyFailureReason` means shields up, never down.
- StepsPort: Phase 2 implements Core Motion authorization and midnight-based pedometer totals.
- WalkingPort: Phase 2 implements cadence/gait verification, renewable leases and treadmill framing.
- GymPort: Phase 2 implements place search, saved locations, geofence presence and check-in.
- HealthPort: Phase 2 reads authorized running/cycling workouts.
- AuthPort: Phase 2 implements Supabase identity, OTP and deletion.
- SubscriptionPort: Phase 2 implements Adapty entitlement, paywall and restore.
- AnalyticsPort: Phase 2 emits sanitized PostHog events.
- NotificationsPort: Phase 2 schedules local trial and lease reminders.
- SyncPort: Phase 2 synchronizes rules and day facts with the VPS.
- ClockPort: Phase 2 observes system time and timezone changes.

models.ts defines shared facts. RuntimeControls is a local-only developer interface and is never a product service adapter.

`SupportPort` accepts one `SupportRequest`: category, message, reply address and the privacy-floored diagnostics assembled by the domain. Its Phase 1 fake simulates latency/outcomes and sends no message over a network.
