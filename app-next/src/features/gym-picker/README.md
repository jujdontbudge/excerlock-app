# Gym location picker

`GymPickerScreen` is the full-screen `/gym-picker` route, with its own header and Cancel. The shared sheets export is only a route opener; setup, Settings → Gyms, and the condition summary share the same picker. The builder has no gym step: a gym condition matches any saved gym (B24), so the binding lives on the plan summary's Gyms row. A `placeId` reaches the picker only from a saved-gym row in Settings; every other entry adds a gym. Saving one reconciles the gym conditions paused for a missing gym (B25).

`usePicker` owns the map-first place screen, the search overlay, saving, debounced search, stale-response protection, a rounded-coordinate reverse-geocode cache, radius and validation. UI components depend only on `GymPort`. `geometry` converts real metres into overlay points and fits the map camera.

`PickerMap` uses the default **Apple** provider in react-native-maps. The centre pin, orange ring and outside dimming mask are screen-space overlays. Continuous region updates drive shared values; radius and pin lift use the control spring, without spatial animation under Reduce Motion. The map is un-controlled after the initial camera fit so a pan never snaps back. Save stays in the keyboard-aware fixed footer; content can scroll at larger text sizes.

## Real worldwide discovery

On iOS the runtime composes `nativePlaceSearch` over existing gym persistence. The local `ExpoLocalSearch` Expo module calls Apple MapKit autocomplete and place resolution, Core Location for the optional current-location shortcut and reverse geocoding. Search includes **addresses and all POIs**, with no country restriction. A nearby coordinate is only a ranking hint; only the nearby-gyms shortcut filters fitness centres. Apple coverage and connectivity determine which results are available. No API keys or external search backend are required.

The interface intentionally shows no verification badge or gym branding. Saving always stores the actual coordinate and the selected 50–200 m radius. Existing gym IDs are preserved during edits, including at the five-gym cap.

Tests use the deterministic GymFake; app screens never import it. The wider runtime still simulates exercise signals/geofencing—real discovery does not activate real background arrival detection.

Native changes require `npx expo prebuild --platform ios`, pods and a new development build. A stale binary reports unavailable search; it never silently substitutes fictional results. Expo Go is not supported by this local native module. Test with `npm test -- --runTestsByPath src/features/gym-picker/__tests__/picker.test.tsx`.
