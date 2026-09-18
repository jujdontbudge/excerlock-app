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

Saving a gym (`GymSetupLocator.locateForGymSetup`) requests foreground (`When In Use`) permission and
takes one high-accuracy sample while the user stands in the gym; Home's `SaveGymCard` turns it into a
`SavedPlace` circle. Manual check-in requests the same permission, takes one sample, and
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
`isInsideRegion` does not wait. A separate, invisible 10-second confirmation debounce delays when the
arrival counts; an exit during that window cancels the arrival. Manual and automatic arrivals share
that processor. Confirmed arrivals append only `{regionId, atMs}` to AsyncStorage. Coordinates are used
only in memory for the OS boundary and distance calculation; they are never logged or sent to
analytics.

The app-open reconciliation also claims coordinate-free visits persisted by a background task. Ledger
event ids make replay idempotent, so reading the on-device visit log again cannot double-pay an arrival.
The E2E composition root installs its selected `FixtureLocationProvider` before runtime hosts mount;
production and scenario adapters cannot be mixed.

`registerLocationTasks` is imported at the Expo Router entry module so Task Manager can find both task
definitions during a headless launch. The geofence task owns the confirmation processor and on-device
visit log. The Walk task maps continuous background locations into `LocationSample` callbacks without
persisting them. Walk keep-alive starts foreground-authorized high-accuracy Fitness updates with the
iOS background-location indicator visible, and stops them explicitly. Expo permission and registered
task state are rehydrated after a JS reload.

Automated tests cover the shared provider contract, five-gym/radius limits, exact 10-second timing,
quick enter-exit cancellation, permission prompt timing, SDK translation, module-scope registration,
fixture-default selection, coordinate-free persistence, and native-state hydration. This lane had no
physical iPhone. Simulator tests cannot establish that iOS relaunches the app for a real region event
or grants the headless task enough execution time to finish the 10-second debounce and persist the
visit; those checks remain mandatory before claiming physical-device geofencing. If the Task Manager
window is too short, the debounce must move into a small native Swift module without widening
`LocationProvider`.

Canonical fixtures: `gym-enter-exit`, `region-blip`, and `quiet`. Test with
`npm run test --workspace app -- signals/location`.
