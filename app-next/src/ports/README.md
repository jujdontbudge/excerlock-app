# Ports

Vendor-free boundaries. Every interface has a local fake in demo/fakes; features obtain them through runtime.

- ScreenTimePort: Phase 2 implements FamilyControls authorization, opaque selection, shielding and measured usage.
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

`SupportPort.send` returns `{ via: 'server' | 'mail' }`. The Phase 1 fake returns `server` after simulated latency and sends nothing over a network. On device, `supportDelivery` opens a `mailto:` handoff after the inner port succeeds.
