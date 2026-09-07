# P2-T05 — Steps, walking, gym, health adapters

## Steps

1. **`StepsAdapter implements StepsPort`** over `modules/excerlock-motion` + `engine/signals/motion`:
   authorization via `CMMotionActivityManager` status; `stepsSince(dayStart)` via the module's historical
   pedometer query; `subscribe` via live pedometer updates while the app is foregrounded; on foreground and
   at midnight, re-query from local day start (decision B8). Progress → `ruleDaysStore.applyProgress`.
   Background: HealthKit is not used for steps (B11); accept that step-goal met detection happens when the app
   is foregrounded or when a DeviceActivity interval wakes the extension (the extension cannot read
   pedometer; document this limitation in the Home copy: "Open ExcerLock after your walk to unlock" appears
   only if the goal was reached while closed — the app checks on launch).
2. **`WalkingAdapter implements WalkingPort`** over `engine/walking/walkingSessionController.ts`,
   `engine/signals/gait`, `engine/signals/placement`, `modules/excerlock-gait-vision`: phases map 1:1 to the
   Phase 1 script (`verifying → walking → grace → ended`), lease via P2-T04, stop grace from `settingsStore`,
   treadmill propped flow (`scanning → propped → handheld → handoff`) surfaces as the framing view with the
   real camera preview (`GaitVisionPreviewView`). Keep-alive via foreground location as today.
3. **`GymAdapter implements GymPort`** over `engine/signals/location` + `engine/gym/gymPresenceController.ts`:
   saved places stored locally (max 5, iOS region cap 20); manual `checkIn` (When-in-use); `enableAutoDetect`
   is the **only** path that requests Always and registers the geofences with `expo-task-manager`, passing
   each place's saved `radiusMeters` (50–200, chosen on the picker); presence events → arrival met / dwell
   minutes progress (30-second confirmation cooldown kept).
   **Search and geocoding (decided 2026-09-07, research in `docs/research/gym-location-picker.md`):** the
   picker screen was built on `react-native-maps` (Apple provider) against the fake port per
   `docs/handoffs/gym-location-picker-build.md` and does not change here. This task replaces the fake behind
   the five search methods with one local Expo Module in Swift, `modules/expo-local-search`
   (`npx create-expo-module@latest --local`; Android stubs reject with a typed "not supported" error):
   - `suggest(query, near?)` → `MKLocalSearchCompleter`, `resultTypes = .pointOfInterest`,
     `pointOfInterestFilter` including `.fitnessCenter`, `region` centred on `near` or the device region.
     Apple debounces keystrokes; JS still cancels stale promises and keeps one query in flight.
   - `resolve(suggestion)` → `MKLocalSearch(request: .init(completion:))`, first `MKMapItem`: name, formatted
     address, coordinate.
   - `nearbyGyms(near)` → `MKLocalPointsOfInterestRequest` at 3 km, fitness-centre filter, six nearest.
   - `reverseGeocode(coord)` → `MKReverseGeocodingRequest` on iOS 26+, `CLGeocoder` below; at most one in
     flight, one per settle (Apple throttles to about one request per user action); the JS cache stays.
   - `currentLocation()` → `expo-location` `getCurrentPositionAsync`, null when not granted.
   - Saved-gym thumbnails for Settings › Gyms → `MKMapSnapshotter` at the saved coordinate, pin and ring drawn
     on the image, cached on disk per gym id.
   Cost $0, no API key, no server, no quota; search works offline-degraded (current location and drop-a-pin
   still save). Rejected: Apple Maps Server API (key must live on the VPS, 25k calls/day), Google Places (New)
   ($2.83/1k autocomplete, `displayName` Pro $17/1k, terms forbid storing name/address), Mapbox Search
   ($11.50/1k sessions). No maintained RN wrapper exposes the completer; the module is roughly 150 lines of Swift.
   Contract tests: the native adapter passes the same port-level suite the fake passed, plus: a fitness query
   in Chicago returns a result with a coordinate; an empty query returns nothing; a cancelled query never
   resolves; reverse geocode of a known coordinate returns a non-empty string.
4. **`HealthAdapter implements HealthPort`** over `engine/signals/health` (`KingstinctHealthKitClient`):
   `workoutsToday('running' | 'biking')` → summed duration and distance from device-recorded workouts started
   today (manual entries excluded as before); background delivery bootstrap kept; claim-on-open.
5. Port-level contract tests for each adapter (same suite as the fakes) plus fixture-driven tests using the
   existing recordings (`treadmillRecordings.json`, gait fixtures, geofence event fixtures).
6. Permissions health (`permissionsStore`) reads live statuses from each adapter on foreground.

## Acceptance

- [ ] Simulator: steps from a simulated pedometer fixture reach the goal and flip Home to `unlockedMet`;
      gym check-in with simulated location inside/outside; HealthKit workouts from the simulator's Health app
      count toward a run rule.
- [ ] Harness app root can start a treadmill session and export a run, exactly as before.
- [ ] Only `enableAutoDetect` requests Always location (grep + test).
- [ ] Gym search on the simulator: three letters of a real gym name return Apple suggestions filtered to
      fitness centres within a second; choosing one lands the pin on the venue with the Apple Maps address;
      panning triggers at most one geocode per settle; airplane mode shows the offline copy while
      current-location and drop-a-pin still save; the saved `radiusMeters` is the radius handed to
      `startGeofencingAsync`; zero calls to any third-party maps API in the network log.
- [ ] Settings › Gyms rows show a snapshot thumbnail with the pin and ring.

## Audit amendments (2026-09-07; see `fix-plan.md`)

- **`WalkingAdapter` emits events, not phases**: `verified` / `unverified` from `WalkVerifier` into P2-T15's
  `stepWalkingSession`; `graceMs` comes from `settingsStore.stopGrace`; there is no `renew()` (a verified event
  renews; a lapsed lease is never revived). It writes minutes for `state` and `target/minutes` walking rules;
  `StepsAdapter` never writes a minutes rule. The propped lease flows through the same lease monitor as
  handheld. Only the placement handoff machine (propped → handheld → handoff) remains this task's own design
  (finding 88); the treadmill spec's 15-minute propped lease and its re-scan semantics are already the domain's.
- **`GymAdapter` implements the visit surface** (`visits()`, `observeVisits()`, `checkIn()` returning the
  visit) over the ported `GeofenceEventProcessor` with region enter/exit timestamps, and claims background
  visits on open, so a locker-room hour with the app killed credits in full (B31). Dwell is computed by
  `domain/gymDwell.ts`; there is no adapter-side accumulator. The 30-second confirmation is unchanged.
- **Foreground refresh** of Health and steps happens in P2-T17's single `AppState` handler, not here; §1 and
  §4's claim-on-open wording points at it. Home's claim-pending line is P2-T19's.
- **`HealthPort.workoutsToday` returns `Workout.source`** and the adapter passes P2-T15's contract test "a
  manually entered workout never counts".
- **Camera permission** is requested and recorded before the scan (P2-T21 §4); `permissionsStore` reads it.
- Acceptance rows added: the adapter passes `walkingContract`, `gymContract` and `healthContract`; a renewal
  across an hour on hardware (P2-T11).
