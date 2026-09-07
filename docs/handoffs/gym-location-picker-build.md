# Handoff to Codex — Gym location picker (build now: real map, centre pin, arrival radius)

Standalone task. It is **not** part of the Phase 1 plan in `plans/rebuild/` and must not be added to it.
Johan runs it when he says so. Decided 2026-09-07: build the whole visual functionality on a real map now.
Search results and addresses stay fake behind the port; everything the user sees and touches is real.
The Phase 2 counterpart (real on-device search) is step 3 of `plans/rebuild/phase-2-backend/P2-T05-signals-behind-ports.md`.

## Inputs (read first)

- `docs/research/gym-location-picker.md` — research, reference breakdown, every decision below.
  Shareable version with the two-state mockup: https://claude.ai/code/artifact/e00bf0fa-eba5-47dc-b10a-b10b1e3a63ff
- PRD `excerlock-app-prd.md` §3.4 (gym setup: map search or dropped pin, 5-gym cap, circle 50–200 m, default 100 m).
- Existing code to replace or extend: `app-next/src/features/sheets/GymPicker.tsx`, `src/ports/GymPort.ts`,
  `src/ports/models.ts` (`SavedPlace`), `src/demo/fakes/GymFake.ts`, `src/demo/places.ts`, `src/content/pickers.ts`.
  Callers: `src/features/setup/SetupRoute.tsx`, `src/features/settings/GymsScreen.tsx`.
- Design system to reuse: `Slider` (stepped, haptic ticks), `TextField`, `ChoiceRow`, `PrimaryButton`,
  `SecondaryButton`, `Label`, `Heading`; motion presets in `src/motion/presets.ts`, springs in `tokens.motion.spring`.
- Working rules are the same as every app-next task: TDD, small modules with a README, tokens only, copy in
  `src/content/`, evidence screenshots and recordings, the standard checks at the end.

## Decisions (not open; do not ask)

| Topic | Decision |
| --- | --- |
| Map library | `react-native-maps` (latest 1.x, currently 1.29), default Apple provider, no Google key. Install with `npx expo install react-native-maps`, add its config plugin to `app.json`, prebuild. expo-maps is rejected (alpha, no marker drag on iOS, click events need iOS 18). |
| Pin interaction | Pin fixed at the screen centre, the map pans underneath (Too Good To Go / Uber). The pin is a React Native view over the map, not a native marker. |
| Radius | `Slider`, min 50, max 200, step 10, default 100, unit "m". Circle rescales live. No chips, no edge handle. |
| Circle | Screen-space overlay over the map: a ring centred on the pin plus a dimming mask outside it (the reference's look). Radius in metres is converted to points from the current region (`metresPerPoint = longitudeDelta × 111,320 × cos(latitude) / mapWidthPoints`). Never a native `Circle` (it lags the pan). |
| Presentation | Full-screen modal route, not a half sheet. |
| Search | Through the port only. The fake returns the fictional Chicago places in `src/demo/places.ts` plus a few more fictional entries so "gyms near you" has six rows. No network, no real API. |
| Address under pin | Through the port (`reverseGeocode`). The fake returns a fictional street derived deterministically from the coordinate so it visibly changes as the pin moves. |
| Verified vs custom | Pin moved more than 250 m from the picked search result flips the badge from "Verified gym" to "Custom spot". A pin from "current location" or "drop a pin" is "Custom spot". Saving is never blocked by the badge. |
| Cap and name | Existing rules stay: max five saved gyms, name required, edits of an existing gym allowed. |
| Radius persistence | `radiusMeters` is saved as chosen. `GymFake.savePlace` stops forcing 100. |

## Steps (TDD, one commit)

1. **Geometry, pure and tested first.** `src/features/gym-picker/geometry.ts`: `metresToPoints(region, mapWidth, metres)`,
   `distanceMetres(a, b)` (haversine), `regionForRadius(centre, radiusMetres, mapSize)` (a region that shows the
   circle with ~35% margin), `roundCoordinate` for the geocode cache key. Tests with known values (100 m at
   Chicago latitude, 1 km between two fixed points, a region delta that fits 200 m).
2. **Port.** Extend `GymPort`:
   ```ts
   suggest(query: string, near?: Coordinates): Promise<PlaceSuggestion[]>;
   resolve(suggestion: PlaceSuggestion): Promise<PlaceCandidate>;
   nearbyGyms(near: Coordinates): Promise<PlaceCandidate[]>;
   reverseGeocode(coord: Coordinates): Promise<string | null>;
   currentLocation(): Promise<Coordinates | null>;   // null when permission is not granted
   ```
   `PlaceSuggestion = { id, title, subtitle }`, `PlaceCandidate = { id, name, address, latitude, longitude }`.
   Keep `searchPlaces` until nothing calls it, then delete it. Update `GymFake` and `src/demo/README.md`.
   Fake `currentLocation` returns the scenario's gym coordinate when location permission is `whenInUse` or `always`,
   otherwise null. Port-level tests next to `src/features/sheets/__tests__/gym.test.ts`.
3. **Content.** All copy in `src/content/gymPicker.ts` (typed). Strings: title "Find your gym", search
   placeholder "Search for your gym", "Use my current location", section "Gyms near you", empty
   "No matches. Try the street name, or drop a pin on the map.", "Drop a pin instead", hint
   "Move the map to adjust the pin", "Gym name", "Arrival radius", helper "Bigger circle: detects you sooner,
   may include the parking lot.", badges "Verified gym" / "Custom spot", CTA "Save gym", offline
   "You're offline. Search is unavailable, but you can still use your current location.", plus the existing
   limit, name and save-error strings moved over from `pickers.ts`.
4. **State machine.** `src/features/gym-picker/usePicker.ts`: `find` → `place` → saving. Holds query,
   suggestions, nearby list, chosen candidate, pin coordinate, radius, name, address, badge, and the settle
   debounce (400 ms after the last region change → `reverseGeocode`, cached per rounded coordinate).
   Tests with the fake port: typing filters, choosing a suggestion enters `place` with the pin on the result,
   moving the pin 300 m flips the badge, radius clamps to 50–200, save calls `savePlace` with the chosen radius,
   the five-gym cap disables save, denied location hides the current-location row.
5. **Find screen.** `src/features/gym-picker/FindStep.tsx`: `TextField` auto-focused with the keyboard up,
   "Use my current location" row (arrow icon, hidden when `currentLocation` resolves null), "Gyms near you"
   section before typing, suggestion rows while typing with the matched prefix highlighted, empty state with
   the "Drop a pin instead" secondary button. Rows stagger in (`stagger.list`), the list re-filters with a
   layout transition, nothing pops.
6. **Place screen.** `src/features/gym-picker/PlaceStep.tsx`: `MapView` (Apple provider, `showsUserLocation`
   when granted, `showsPointsOfInterest`, no compass) filling the top ~60%; the pin view fixed at the centre with
   the name label under it; the ring + dim mask overlay driven by `onRegionChange` (continuous) through a
   shared value so it stays glued during the pan; the one-time hint pill on first pan; bottom card with the
   name `TextField` (prefilled, required), address line, the badge, `Slider` with the live "100 m" value and
   the helper line, and the `PrimaryButton` CTA. Camera animates from the find step with `animateToRegion`
   using `regionForRadius`. The pin lifts 6 pt and scales 1.05 while the map moves and settles with
   `spring.control`; one selection haptic when it settles. Radius changes animate the ring with
   `spring.control`. Reduce Motion: crossfades only.
7. **Route and callers.** `app/gym-picker.tsx` as a full-screen modal (`presentation: 'fullScreenModal'` in the
   root stack); keep the `GymPicker` export in `src/features/sheets/` as a thin opener so `SetupRoute`,
   `GymsScreen` and the gym rule card keep working. Delete `assets/images/map-placeholder.png` and its FOUNDRY
   row only after nothing references it.
8. **Jest.** Mock `react-native-maps` in `jest.setup.ts` (MapView as a View that records `animateToRegion`
   calls and exposes a way to fire `onRegionChange`). Screen tests drive: pick a suggestion → place step shows
   the name and "Verified gym"; fire region changes 300 m away → "Custom spot" and a new address after the
   debounce; drag the slider to 150 → the value label reads "150 m" and save persists 150.
9. **Native check.** `npx expo prebuild --platform ios` and a dev-client run on the simulator. Verify Apple tiles,
   the user-location dot with the `gym-arrival-user` scenario, and that `onRegionChange` fires continuously
   during a pan. react-native-maps has an open Google-provider marker bug on RN 0.86; the Apple provider must be
   confirmed here, and any breakage is reported to Johan, not worked around with the Google provider.
10. **Evidence** in `app-next/evidence/gym-picker/`: screenshots of find (empty, nearby, typing, no results,
    offline, location denied), place (verified, custom spot, radius 50 / 100 / 200, cap reached), and a recording
    of search → place → pan → radius → save from the `gym-arrival-user` scenario at `setup:X3` and from Settings ›
    Gyms. Motion notes in `evidence/gym-picker/MOTION.md`. Update `src/features/sheets/README.md`, add
    `src/features/gym-picker/README.md`.
11. **Checks**: `npm run typecheck`, `npm test`, `npm run lint`, `npx expo-doctor`, `npx expo install --check`,
    `npx expo export --platform ios`, then `xcrun simctl shutdown all`.

## Acceptance

- [ ] From `gym-arrival-user` at `setup:X3` and from Settings › Gyms, the picker opens as a full-screen modal on a real Apple map.
- [ ] Typing "West" lists West Loop Fitness with the match highlighted; choosing it lands the pin on 41.884, −87.652 with "Verified gym".
- [ ] Panning the map moves the pin's coordinate; after settling, the address line changes and a haptic fires once.
- [ ] Panning more than 250 m flips the badge to "Custom spot"; saving still works.
- [ ] The slider goes 50–200 in steps of 10, the ring rescales live, and the saved gym carries the chosen `radiusMeters`.
- [ ] "Use my current location" is hidden when location is denied; search still works.
- [ ] No results shows the empty copy and "Drop a pin instead" opens the place step at the current or default location.
- [ ] Five saved gyms disable the CTA with the limit copy; editing an existing gym is still allowed.
- [ ] Reduce Motion shows every state change as a crossfade; Dynamic Type XL keeps the CTA reachable.
- [ ] No colour, spacing, radius or duration literals in `src/features/gym-picker/`; all copy in `src/content/gymPicker.ts`.
- [ ] Nothing in the screen imports the fake directly; only the port.
- [ ] Evidence folder and motion notes exist; all checks green; simulator shut down.

## Out of scope here

Real search, real reverse geocoding, map thumbnails, geofence registration. See the Phase 2 handoff.
