# adapters/notifications

The local-notification boundary (P2-T09; decisions B14, B30, B37). Two user-facing notifications
and one tap-through id, all local. No push token, no remote payload, no engagement notifications,
no per-notification toggles.

## The catalog (`catalog.ts`)

| Kind | Identifier | Who schedules it | Lands on |
| --- | --- | --- | --- |
| Trial reminder | `excerlock.trial-reminder` | `startNotificationScheduling` off the entitlement store | `/(tabs)/settings` (Settings › Subscription) |
| Walk-lease warning | `excerlock.walk-lease-warning` | `startNotificationScheduling` off the walking session | `/(tabs)/home`, plus the walking sheet |
| Shield tap-through | `SHIELD_OPEN_NOTIFICATION_ID` (`ports/NotificationsPort.ts`) | the ShieldAction extension only, optionally with a dotted cause suffix | `/locked-apps`, registered outside every guard |

Identifiers are fixed, so scheduling a kind again replaces the pending request. `landing.ts` is
the landing table; `no-push.test.ts` holds the catalog at exactly three ids and keeps every push
API out of this directory.

## Scheduling (`trialReminder.ts`, `leaseWarning.ts`, the two schedulers, `startNotifications.ts`)

- **Trial reminder.** Scheduled when the entitlement is `trial` with a known `renewsAt`, at 18:00
  local `trialReminderDays(offer)` days before the end (the offer's `reminderDaysBefore`, clamped
  like the trial screens' copy), or at `renewsAt − 24 h` when the trial is shorter than three days.
  Conversion, cancellation, a lapse or a withdrawn permission cancels it; a changed renewal date
  moves it. A fire time already in the past schedules nothing.
- **Walk-lease warning.** Scheduled at `leaseUntil − 30 s` for the live walking session and
  rescheduled on every renewal (cancel + schedule), skipped when the fire time moves by less than
  five seconds. Any end reason cancels it. Propped sessions get it too; it is their only warning,
  with the "Scan again to keep counting" variant once the session carries `placement` (P2-T15's
  session type; until then every warning reads as handheld). A session never prompts.
- Both schedulers serialize their port calls and are idempotent per `sync`, so store subscriptions
  can call them freely. Pending notifications outlive the binding on purpose: the reminder must
  survive an app kill.
- The binding lives in `AppRuntimeProvider` after the enforcement host and works against whichever
  port is bound, fake or expo.

## The expo adapter (`ExpoNotificationsAdapter.ts`, `expoNotifications.ts`)

`expoNotificationsAdapter(module)` implements `NotificationsPort` over the slice of
expo-notifications it is handed, which keeps tests native-free. `expoNotifications()` binds it in
`createRuntime` on iOS (simulator included) when the native module is present, and returns null
otherwise so a dev client built before the dependency keeps the fake.

- **Permission.** `status()` answers synchronously from the last known value and refreshes in the
  background, recording a change on the permissions store, which Settings shows as "Reminders".
  `request()` is the only prompt, reached from the trial sequence's T3 and Settings › Permissions,
  and asks for alerts and sound, never a badge. Provisional and ephemeral authorization count as
  granted; iOS has no restricted state for notifications.
- **Foreground handler policy** (`presentation.ts`): the lease warning is a banner even in the
  foreground; the trial reminder is suppressed while the paywall is open (`paywallPresence`, set
  by `PaywallSlot`); the shield id and anything outside the catalog stay silent.
- **Tap-through** (`tapThrough.ts`): the response that launched the app is handled first, then
  every later one, through the landing table. Every handled tap records `notification_opened`.
  The fake port has no response source, so the binding runs scheduling only under the fake.

`plugins/withNoPush.js` stays first in `app.json` so it runs last and strips `aps-environment`
should any plugin add it; the expo-notifications config plugin is deliberately not listed, because
it adds that entitlement.

## Known limits

- A reminder scheduled on this device is cancelled by the running app only. A trial that converts
  while the app is closed keeps its pending reminder until the app next runs and syncs.
- The dev menu's permission override is overwritten by the OS answer on the next status refresh
  when the expo adapter is bound.
