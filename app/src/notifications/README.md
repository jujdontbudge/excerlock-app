# Notifications

Local notification policy, user controls, permission flow, scheduling, and the
production Expo adapter. This module never requests a push token, sends a remote
payload, calls the server, or decides anything about earning and locking.
Ledger facts come in; local schedules come out.

## The closed push set

PRD §3.14 keeps exactly three notification types. All three default OFF.

| Type | Local trigger | Time | Route |
| --- | --- | --- | --- |
| Afternoon nudge | Active day, no qualifying activity, app unopened | User-adjustable; 15:00 default | Home |
| Weekly recap | Last day of the configured week | 18:00 | Analysis |
| Streak last call | Requirement unmet, app unopened, streak exists | 21:00 | Home |

The catalog in `model/catalog.ts` is the closed list and the route map. Balance
low, balance empty/shields up, presence cooldown, and milestone unlock remain
in-app surfaces only. Earn verified and day-boundary notifications do not exist.
A fourth push type requires a PRD change before a code change.

The treadmill walk lease has one operational exception: while a propped
session is active, it replaces a deterministic local warning scheduled for 30
seconds before lease expiry. This is session infrastructure, not a catalog
engagement type: it has no Settings toggle, does not count toward delivery
caps, and is cancelled when the lease renews or the session stops. It schedules
only when notification permission is already approved and never prompts from a
walking session.

`model/copy.ts` owns every lock-screen line. It carries the live reclaimed-time
and streak numbers and enforces the binding voice rules: payoff first, no guilt,
no exclamation hype, title at most 35 characters, body at most 90.

## Ship silent and stay independently silenceable

`store/notificationPreferencesStore.ts` persists one boolean for each catalog
type under `excerlock.notifications.preferences.v1`. The map is rebuilt from the
current catalog during hydration, so removed types disappear and any value not
literally `true` falls back to OFF.

There is no master switch. Changing one key never reads or changes another.
The afternoon time is a separate persisted choice; it starts at 15:00 and may
be set from 13:00 through 18:00 on the hour. That default never makes the nudge
audible by itself: its type toggle is still OFF.

Settings mounts `NotificationSettingsCard`. Every type has its own switch and
the nudge has its own time picker.

## Permission flow

Notification permission is never requested during onboarding. The first
OFF-to-ON gesture while authorization is `notDetermined` opens the one-line
benefit primer. Only its **Allow notifications** action calls the boundary.

- `approved`: enable only the type that initiated the flow.
- `denied`: keep that type OFF and offer **Open Settings**.
- already `approved`: enable directly; do not repeat the primer.

The status dot reuses `PERMISSION_COPY`'s shared `Not set up`, `On`, and `Off`
labels from the Screen Time flow. A preference is never enabled speculatively
while the OS decision is pending.

## Planning and delivery rules

`NotificationScheduler` reconciles one ledger day. Its input is only current
day/week facts, live copy facts, and persisted preferences. Its two injected
system boundaries are `NotificationModule` and `NotificationClock`; planning
logic never reads `Date.now()`. The caller remains responsible for supplying
those facts at its existing reconciliation points; the native adapter does not
guess future eligibility or freeze future recap numbers.

Schedules use the deterministic ID `typeId:dayIndex`. Re-planning the same day
updates that schedule rather than duplicating it, and a type that is silenced or
no longer eligible is cancelled without touching the others.

The pure rules enforce:

- quiet hours from 22:00 inclusive until 07:00 exclusive;
- one daily capped notification, with recap ranked above nudge;
- streak last-call's explicit daily-cap exception;
- no exception to the maximum of five deliveries in a rolling seven days;
- go-quiet-on-openers for the two engagement pushes.

## Boundary and native adapter

Callers import `index.ts` and obtain the adapter only through
`getNotificationModule()`. `accessor.ts` remains the single native composition
point: app builds receive `ExpoNotificationModule`; Jest receives the persistent
`MockNotificationModule` by default.

The Expo adapter maps each resolved plan to a one-off local date trigger using
the deterministic plan ID as the native request identifier. Its data contains
only the closed notification type, delivery time, and allow-listed local route.
It requests alert and sound permission only when the Settings permission flow
calls `requestAuthorization`; constructing the adapter, onboarding, and
scheduling do not request permission.

Pending plan intent and settled delivery evidence persist locally under
`excerlock.notifications.native.v1`. This lets the planner enforce the rolling
seven-day ceiling after an app restart. Foreground alerts use an explicit Expo
handler, and taps are accepted only when a deterministic notification ID and
catalog route agree. No push token API, remote payload, analytics event, or
server call exists in the adapter.

`app/plugins/withNoPush` remains first in `app.json`. The clean-prebuild
guardrail inspects the generated host entitlements and fails if
`aps-environment` reappears.

Ticket #80 adds one narrow native boundary ahead of that full adapter:
`NativeShieldNotificationResponseHost` owns the supported notification-tap
fallback from ShieldAction. It accepts only extension request identifiers and
the two ticket-owned URLs (`excerlock://` and `excerlock://locked-apps`), so
unrelated notification data cannot become a route. Its injected response source
keeps Jest native-free. The mock remains the default scheduling module in tests.

## Tests

From the repository root:

```sh
npm run test:app -- --runTestsByPath \
  src/notifications/__tests__/catalog.test.ts \
  src/notifications/__tests__/copy.test.ts \
  src/notifications/__tests__/deliveryRules.test.ts \
  src/notifications/__tests__/triggers.test.ts \
  src/notifications/__tests__/notificationPreferencesStore.test.ts \
  src/notifications/__tests__/MockNotificationModule.test.ts \
  src/notifications/__tests__/ExpoNotificationModule.test.ts \
  src/notifications/__tests__/accessor.test.ts \
  src/notifications/__tests__/NotificationScheduler.test.ts \
  src/notifications/__tests__/NotificationSettingsCard.test.tsx \
  src/notifications/__tests__/ShieldNotificationResponseHost.test.tsx
```

Screen tests mock AsyncStorage at the native boundary. In RNTL 14 both `render`
and `fireEvent.press` are async and must be awaited.
