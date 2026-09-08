# Diagnostics log: event vocabulary for device verification

`app-next/scripts/verify-device-run.js` decides pass or fail from the diagnostics log the phone records.
This page is the contract between the recorder (P2-T03 ports `app/src/diagnostics` into
`app-next/src/diagnostics`) and the verifier. Every adapter task that lands a native port appends the
events in its table below; the verifier never guesses at names.

## Format

`DiagnosticsLog.toText()` already writes one entry per line:

```
<atMs>	<event>	<json data>
```

`atMs` is epoch milliseconds from the app's clock. The verifier also accepts JSON Lines
(`{"atMs":…,"event":"…","data":{…}}`). Instants inside `data` are ISO 8601 strings or epoch milliseconds;
both parse. Blank lines are ignored; a malformed line is counted and reported, never fatal.

Recording stays synchronous (`append` never awaits) and the ring buffer keeps the last 5,000 entries. Every
scenario in the runbook fits inside that, but the runbook clears the log between scenarios anyway.

## What the recorder itself must add (P2-T03)

- On every cold start, `app.launch` as the first entry, with the build commit, iOS version and device model
  from `expo-application` and `expo-device`. Two `app.launch` entries prove the app was killed in between;
  several scenarios depend on that.
- On foreground, drain the extension ring buffer from the app group (`group.com.johansardar.excerlock`) into
  `extension.*` entries. The extensions cannot write the JS log, so `DeviceActivityMonitorExtension`,
  `ShieldAction` and `ShieldConfiguration` append `{ kind, name, at, … }` records to a bounded array in the
  shared `UserDefaults`; the app copies them out and clears the array. `data.at` keeps the extension's own
  timestamp; `atMs` is when the app drained it.
- The `/diagnostics` route (dev flag) with the **Share log** button, and a **Clear log** button beside it.
  Also write the same text to `Documents/diagnostics/latest.log` on every flush so
  `xcrun devicectl device copy from` can pull it without the share sheet.

## Events

Field types: `instant` is ISO or epoch ms; `status` is `granted | denied | notDetermined | restricted |
whenInUse | always`.

### App and navigation (P2-T17 root, P2-T03)

| event | data | when |
| --- | --- | --- |
| `app.launch` | `{ build, iosVersion, device, runtime: 'real' }` | first entry of every cold start |
| `app.state` | `{ state: 'active' \| 'background' \| 'inactive' }` | every AppState change |
| `app.deeplink` | `{ url }` | any URL the app opened with |
| `nav.route` | `{ route }` | every route change (`/home`, `/locked-apps`, `/settings`, `/settings/permission/screenTime`, `/unlock/gym`, `/unlock/treadmill`, `/paywall`) |

### Identity, sync (P2-T01, P2-T08)

| event | data | when |
| --- | --- | --- |
| `auth.session` | `{ kind: 'anonymous' \| 'signedIn', provider?: 'apple' \| 'google' \| 'email', userId }` | every session change; `userId` is the Supabase uid (never a token) |
| `auth.link` | `{ provider, result: 'linked' \| 'cancelled' \| 'error', userId }` | after `linkIdentity` / OTP verify |
| `sync.pull` | `{ rules, ruleDays, history, earnedUnlocks }` | after a restore pull, with row counts |
| `sync.push` | `{ rows }` | after a push batch |

### Permissions (P2-T10, P2-T17)

| event | data | when |
| --- | --- | --- |
| `permission.status` | `{ name: 'screenTime' \| 'motion' \| 'health' \| 'location' \| 'camera' \| 'notifications', status }` | after every request and on every foreground re-read, only when the value changed |
| `permission.openSettings` | `{ name }` | when a Fix action calls `Linking.openSettings()` |

### Screen Time and enforcement (P2-T04, P2-T17)

| event | data | when |
| --- | --- | --- |
| `screentime.selection` | `{ appCount, categoryCount, hasHandle }` | after the picker and after every `describeSelection()` |
| `enforcement.plan` | `{ shields: 'apply' \| 'clear', monitors: [{ name, start, end }], ruleCount, planHash, truncatedAt, horizonEnd }` | every time the host compiles a plan |
| `enforcement.apply` | `{ decision, applied, shields: 'up' \| 'down', monitors, reason?, planHash }` | every `applyLock` result; `decision` is the `LockDecision.state` |
| `screentime.facts` | `{ unlockUntil, leaseUntil, entitled, planHash, watermark }` | every app-group facts write |
| `shield.content` | `{ revision, byMonitor: { [monitorName]: { cause, subtitle } } }` | every shield-content publish; `revision` increments |
| `watermark.rewind` | `{ observed, watermark, effective }` | when `effectiveNow` clamps a rewound clock |
| `usage.threshold` | `{ day, minutes }` | every drained usage threshold event |
| `usage.day` | `{ day, minutes }` | when `usage_days` is written for a day |

### Extension records, drained on foreground (P2-T03 targets)

| event | data | written by |
| --- | --- | --- |
| `extension.event` | `{ kind: 'intervalDidStart' \| 'intervalDidEnd' \| 'intervalWillStartWarning' \| 'intervalWillEndWarning' \| 'eventDidReachThreshold', name, at }` | DeviceActivityMonitorExtension, every callback |
| `extension.shieldRead` | `{ revision, at }` | ShieldConfiguration, every time it builds a configuration from published content |
| `extension.shieldAction` | `{ action: 'primary' \| 'secondary', cause, at }` | ShieldAction, every button tap |

### Walking, gait, placement (P2-T05, P2-T15)

| event | data | when |
| --- | --- | --- |
| `walking.session` | `{ sessionId, phase: 'verifying' \| 'walking' \| 'grace' \| 'ended', placement: 'handheld' \| 'propped', leaseUntil?, reason? }` | every phase change; `reason` on `ended` is the session's end reason (`leaseLapsed`, `stopped`, `windowEnded`, `dayRollover`, `ruleChanged`, `framingExpired`) |
| `walking.lease` | `{ sessionId, event: 'renewed' \| 'lapsed', leaseUntil }` | every renewal and the lapse |
| `gait.scan` | `{ result: 'verified' \| 'failed' \| 'framingExpired', durationMs, placement }` | end of every camera scan |
| `placement` | `{ placement: 'propped' \| 'handheld' }` | every classifier transition |
| `motion.cadence` | `{ stepsPerSecond }` | optional, as the old instrumentation did |

### Progress (P2-T05 adapters through `progressSync`)

| event | data | when |
| --- | --- | --- |
| `progress.applied` | `{ ruleId, activity: 'walking' \| 'running' \| 'biking' \| 'gym', value, goal, met, source: 'steps' \| 'walking' \| 'health' \| 'gym' }` | every `applyProgress` that changed a row |
| `progress.met` | `{ ruleId, ruleName, day, metAt }` | when a row flips to met and the earned unlock is written |

### Gym (P2-T05)

| event | data | when |
| --- | --- | --- |
| `gym.autoDetect` | `{ enabled, status }` | when auto-detect is toggled, with the resulting location status |
| `gym.geofence` | `{ event: 'enter' \| 'exit', regionId, at, background }` | every task-manager region event; `background` is true when the app was not foregrounded when it fired |
| `gym.visit` | `{ id, placeId, event: 'opened' \| 'closed' \| 'claimed', source: 'geofence' \| 'manual', enteredAt, exitedAt? }` | every visit-log write; `claimed` is a background visit adopted on open |
| `gym.arrival` | `{ placeId, confirmedAt, visitId }` | when the 30-second confirmation completes |

### Health (P2-T05)

| event | data | when |
| --- | --- | --- |
| `health.workouts` | `{ activity, count, minutes, distanceKm, excludedManual }` | every `workoutsToday` read |

### Subscription and entitlement (P2-T06, P2-T18)

| event | data | when |
| --- | --- | --- |
| `entitlement.status` | `{ status, renewsAt, source: 'adapty' \| 'cache' \| 'fallback' }` | every published status change |
| `subscription.purchase` | `{ placement, productId, result: 'purchased' \| 'cancelled' \| 'error' }` | every Builder purchase outcome |
| `subscription.restore` | `{ result: 'restored' \| 'notFound' \| 'error' }` | every restore |
| `paywall.presented` | `{ placement, dismissible }` | every Builder presentation |
| `paywall.dismissed` | `{ placement }` | every dismissal |

### Notifications (P2-T09)

| event | data | when |
| --- | --- | --- |
| `notification` | `{ id, event: 'scheduled' \| 'cancelled' \| 'delivered' \| 'opened', fireAt?, route? }` | every scheduling call, delivery (from the foreground handler or the response listener) and tap; `id` is one of the three catalog ids (`excerlock.trial-reminder…`, `excerlock.walk-lease-warning…`, `excerlock.shield.open…`); the verifier matches on the fragment, so versioned suffixes are fine |

### Observability (P2-T07)

| event | data | when |
| --- | --- | --- |
| `analytics.event` | `{ name }` | every PostHog capture (name only, no properties) |
| `sentry.testCrash` | `{}` | immediately before the dev-menu test crash is thrown |

## Privacy floor

Nothing in this log may carry a token, an email address, a gym name or a coordinate. `userId` is the
Supabase uid. The support composer's privacy-floored diagnostics (`domain/supportDiagnostics.ts`) are a
different, smaller payload and are unaffected.
