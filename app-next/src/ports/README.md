# Ports

Vendor-free boundaries. Every interface has a local fake in demo/fakes; features obtain them through runtime.

- ScreenTimePort: Phase 2 implements FamilyControls authorization, opaque selection, shielding and measured usage.
- StepsPort: Phase 2 implements Core Motion authorization and midnight-based pedometer totals.
- WalkingPort: Phase 2 implements cadence/gait verification, renewable leases and treadmill framing. `start`
  accepts an enabled walking state rule or walking-minutes target; duration sessions book minutes without
  opening apps until the goal is met.
- GymPort: Phase 2 implements place search, saved locations, geofence presence and check-in.
- HealthPort: Phase 2 reads authorized running/cycling workouts.
- AuthPort: Phase 2 implements Supabase identity, OTP and deletion.
- SubscriptionPort: Phase 2 implements Adapty entitlement, paywall and restore.
- AnalyticsPort: Phase 2 emits sanitized PostHog events.
- NotificationsPort: Phase 2 schedules local trial and lease reminders.
- SyncPort: Phase 2 synchronizes rules and day facts with the VPS.
- ClockPort: Phase 2 observes system time and timezone changes.

models.ts defines shared facts. RuntimeControls is a local-only developer interface and is never a product service adapter.

`SupportPort` is a local request contract added with Settings. Its Phase 1 fake simulates latency/outcomes and sends no message over a network.
