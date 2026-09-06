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
   saved places stored locally (max 5, iOS region cap 20); `searchPlaces` via MapKit local search (choose the
   package via Expo MCP: `react-native-maps` with Apple provider for the pin + `expo-location` geocoding, or a
   small local Expo module over `MKLocalSearch`; prefer the one with the smaller native surface); manual
   `checkIn` (When-in-use); `enableAutoDetect` is the **only** path that requests Always and registers the
   geofences with `expo-task-manager`; presence events → arrival met / dwell minutes progress
   (30-second confirmation cooldown kept).
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
