# LocationProvider

Contract: geofence regions, presence checks, and walk-session keep-alive behavior behind one provider
interface. Consumers do not import Expo Location or Task Manager directly. Manual check-in is an
additive `ManualGymCheckIn` capability so the shared `LocationProvider` interface remains unchanged.

`FixtureLocationProvider` consumes `location.enterRegion`, `location.exitRegion`, `location.update`,
and `location.authChanged`. History establishes presence synchronously; future region events notify
only regions the caller is monitoring. It remains the singleton default in Jest, Expo Go, and non-iOS
runtimes. A non-Expo-Go iOS runtime fails toward native, including development clients, Standalone
releases, bare builds, and future execution-environment values.

`NativeLocationProvider` preserves the contract over `ExpoLocationClient`, which is the only module
that translates `expo-location` calls. Constructing the provider never requests permission or starts
monitoring.

Manual check-in requests foreground (`When In Use`) permission, takes one high-accuracy sample, and
checks that sample against the saved circle on device. Starting auto-detect is the explicit opt-in
boundary: it requests foreground permission first, then background (`Always`) permission, and only
then registers regions. At most five gyms are accepted. The public radius constants are 100 m default,
50 m minimum, and 200 m maximum.

Production ownership lives in Home's `GymPresenceController`. An Arrive-at-gym card calls `checkIn`
only after the user presses **Check in**. Settings is the only surface that calls `enableAutoDetect`;
the app-lifetime signal host merely restores a persisted opt-in when `Always` is already granted and
quietly does nothing otherwise. Turning auto-detect off stops registered monitoring while leaving
manual check-in intact. With no enabled location condition, the host neither selects this provider nor
reads location.

Raw presence changes immediately when a region event arrives: there is no dwell state and
`isInsideRegion` does not wait. A separate, invisible 30-second dwell delays when the arrival counts;
an exit inside that window cancels the arrival. Manual and automatic arrivals share that processor.
Confirmed arrivals append only `{regionId, atMs}` to AsyncStorage. Coordinates are used only in memory
for the OS boundary and distance calculation; they are never logged or sent to analytics.

**The dwell is two timestamps, never a running timer.** iOS gives a background-launched app roughly ten
seconds to handle a region event, so a 30-second `setTimeout` inside that wake would never fire for a
killed or suspended app and the visit would be lost. `GeofenceEventProcessor` therefore writes the raw
enter to `AsyncStoragePendingRegionEntryLog` (`{regionId, atMs}`, no coordinates) before anything else,
and the visit is booked by whichever path first *takes* that entry back:

- the matching exit, when `exit.atMs - enter.atMs >= PRESENCE_CONFIRMATION_MS` — this works in a
  relaunched process that has no in-memory presence at all;
- the foreground timer, while the app happens to stay alive through the whole dwell;
- the next claim, when `ConfirmedGymVisits.readAll()` settles every enter that reached the dwell and no
  exit closed.

`PendingRegionEntryLog.take` hands an entry to exactly one caller, so those three paths cannot
double-book the same arrival. An exit that beats the dwell simply discards the entry, and a region that
is already open keeps its first enter time, so a re-delivered enter cannot push the dwell out forever.

The processor has two entry points for the two execution budgets. `receive` is the background path: it
resolves as soon as the event is durable, so a headless wake returns in milliseconds instead of holding
the Task Manager window open for thirty seconds it will not get. `process` is the foreground path and
still resolves only once the dwell has been decided, which is what manual check-in awaits.

The app-open reconciliation claims coordinate-free visits persisted by a background task, and reading
them settles any dwell that elapsed while the app was suspended: `GymPresenceController.reconcileAutoDetect`
calls `claimConfirmedVisits`, which reads `ConfirmedGymVisits`. Ledger event ids make replay idempotent,
so reading the on-device visit log again cannot double-pay an arrival. The E2E composition root installs
its selected `FixtureLocationProvider` before runtime hosts mount; production and scenario adapters
cannot be mixed.

`registerLocationTasks` is imported at the Expo Router entry module so Task Manager can find both task
definitions during a headless launch. The geofence task owns the confirmation processor, the pending
enter log, and the on-device visit log. The Walk task maps continuous background locations into
`LocationSample` callbacks without persisting them. Walk keep-alive starts foreground-authorized
high-accuracy Fitness updates with the iOS background-location indicator visible, and stops them
explicitly. Expo permission and registered task state are rehydrated after a JS reload.

Automated tests cover the shared provider contract, five-gym/radius limits, exact 30-second timing,
quick enter-exit cancellation, dwell settlement in a relaunched process, claim-time settlement of a
dwell the app slept through, permission prompt timing, SDK translation, module-scope registration,
fixture-default selection, coordinate-free persistence of both logs, and native-state hydration. This
lane had no physical iPhone. Simulator tests cannot establish that iOS actually relaunches the app for
a real region event; that check remains mandatory before claiming physical-device geofencing. It no
longer has to establish that the headless task gets 30 seconds of execution, because the dwell no
longer runs inside it — only the enter write does.

Canonical fixtures: `gym-enter-exit`, `region-blip`, and `quiet`. Test with
`npm run test --workspace app -- signals/location`.
