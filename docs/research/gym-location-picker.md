# Gym location picker — research and recommendation

Date: 2026-09-07 · Status: decided the same day (Johan: build the whole visual functionality now) · Build handoff: `docs/handoffs/gym-location-picker-build.md` · Phase 2 native search: `plans/rebuild/phase-2-backend/P2-T05-signals-behind-ports.md` step 3 · Scope: the "choose your gym" screen (PRD §3.4, inventory SH-gym)

Decisions taken from the open questions below: centre-pin pattern, real map in Phase 1, slider only.

## The ask

A screen where the user types their gym's name, gets Google-Maps-style suggestions, and on picking one a pin lands on a map. They can move the pin and widen or narrow the arrival radius. Reference: Too Good To Go's "Choose a location" sheet.

## What exists today

- `app-next/src/features/sheets/GymPicker.tsx`: a `BottomSheet` with a search field, a static placeholder map image, a fake results list, a name field and Save. Radius is not editable; the fake `savePlace` forces 100 m.
- `SavedPlace` already carries `latitude`, `longitude`, `radiusMeters`. `GymPort` exposes `searchPlaces(query)` and `savePlace`.
- The old app never had a map. `SaveGymCard` saved a gym by "stand inside it and take one fix".
- Design system already has `Slider` (gesture-driven, stepped, haptic ticks), `BottomSheet`, `TextField`, `ChoiceRow`.
- PRD §3.4 (decided 2026-07-28): map search or dropped pin, 5-gym cap, circle starts at 100 m and drags 50–200 m, "verified gym" vs "honor system" tags.
- Inventory SH-gym says Phase 1 = fake results + static map, Phase 2 = MapKit search.

## Reference: Too Good To Go "Choose a location"

Captured from screensdesign (ts 493). One full-height sheet:

1. Map fills the top ~60%. A circle sits around the center pin. The map is dimmed outside the circle and bright inside, so the radius reads instantly.
2. Bottom card: "Select a distance" label, slider with the live value on the right ("17 km"), a pill search field showing the chosen place with an X to clear, a "Use my current location" text button, one full-width CTA.
3. The pin stays put while the slider rescales the circle live. Search opens a typeahead in place.

What to copy: single screen, map on top, controls in one card, one CTA, live circle, current-location shortcut. What to change: their radius is a browse distance in km; ours is a geofence in metres, so the map must be zoomed to street level and the copy must explain what the circle does.

## Options researched

### Map view

| | react-native-maps 1.29 | expo-maps 57.0.2 |
| --- | --- | --- |
| Status | Mature, Fabric done, peer RN ≥ 0.76 | Alpha, "breaking changes expected" |
| Apple Maps on iOS, no key | Yes (default provider) | Yes (SwiftUI `Map`) |
| Circle with live radius | `Circle` `center`/`radius` | `circles[]` `center`/`radius`/`color`/`lineColor` |
| Draggable marker | `draggable`, `onDrag`, `onDragEnd` | No drag on iOS at all |
| Tap / long-press coords | `onPress`, `onLongPress` | `onMapClick` only |
| Camera | `animateToRegion` | `setCameraPosition` (no duration) |
| Region tracking | `onRegionChange` continuous | `onCameraMove` |
| Marker/overlay click | Yes | iOS 18+ only |
| Expo Go | Yes | No, dev build only |
| Known risks | Google provider markers broken on RN 0.86 (issue 5973); Apple provider unverified | iOS floor unclear (podspec 16.4, README says 18, Swift has 17 and 18 paths) |

Verified by reading the expo-maps 57.0.2 tarball types and the react-native-maps docs and release notes.

### Place search (name → coordinates)

| Backend | Cost | Key / server | Gym filter | RN wrapper |
| --- | --- | --- | --- | --- |
| Apple MapKit on-device: `MKLocalSearchCompleter` + `MKLocalSearch` | Free, no published quota | None | `MKPointOfInterestCategory.fitnessCenter`, `resultTypes: .pointOfInterest` | None maintained for the completer. `react-native-nearby-places` 0.4.3 wraps `MKLocalSearch` only. Write a local Expo Module in Swift (~100–150 lines). |
| Apple Maps Server API `searchAutocomplete` | Free to 25,000 calls/day per team | Maps ID + ES256 key, must live on our server | `includePoiCategories=FitnessCenter` | REST from our Fastify server |
| Google Places API (New) Autocomplete + Details | $2.83/1k autocomplete (10k free/mo), Details Essentials $5/1k (10k free), `displayName` is Pro $17/1k | Key; Google recommends a proxy from mobile | `includedPrimaryTypes: gym, fitness_center` | `react-native-google-places-autocomplete` targets the legacy endpoints |
| Mapbox Search Box | 500 sessions free then $11.50/1k | Key | Category filter | No RN search package; REST only |

### Reverse geocoding (pin → address line)

`expo-location.reverseGeocodeAsync` still works on iOS (CLGeocoder), native only. Apple deprecates CLGeocoder in iOS 26 in favour of `MKReverseGeocodingRequest`; both are rate-limited to roughly one request per user action. Call it once when the pin settles, never during a drag.

### Thumbnails for the saved-gyms list

`MKMapSnapshotter` is free and needs no key; it does not draw overlays, so the pin and circle are drawn on top. Google Static Maps costs $2/1k.

### How other apps do "place + radius"

- Life360 Add a Place: search, draggable pin, radius slider under the map, circle scales live.
- Apple Reminders location alerts: drag handle on the circle edge. Works for km-scale circles, too fiddly for a 100 m circle.
- Google Keep: no radius control at all.
- Too Good To Go: distance slider under the map, pin fixed at center, map pans.
- Uber / Bolt / Airbnb pickup: pin fixed at screen center, "move the map to adjust", address updates when the map settles.

## Recommendation

**Map: react-native-maps 1.29, Apple provider.** It has every interaction the screen needs today, runs in Expo Go and the simulator, and needs no key. expo-maps is alpha, cannot drag a marker on iOS, gates click events on iOS 18, and its iOS floor is unclear against our 17.4 deployment target. Keep expo-maps as a later swap; nothing in the screen depends on which library draws the tiles.

**Search: on-device MapKit in a local Expo Module (Swift).** `MKLocalSearchCompleter` for as-you-type suggestions filtered to fitness centres, `MKLocalSearch` to resolve a suggestion to coordinates and address, `MKLocalPointsOfInterestRequest` for "gyms near you" before the user types. Free, no key, no server, no quota, and it respects the local-first law. This is exactly the "custom Swift modules where needed" path the PRD already allows. If Android ships later, put Apple Maps Server API or Google Places (New) behind the same port on the VPS.

**Pin movement: pin fixed at the screen centre, the map moves.** This is the Uber and Too Good To Go pattern. The user's finger never covers the pin, no long-press-to-drag has to be discovered, and the circle stays perfectly centred while panning. Draggable markers remain available in react-native-maps if Johan prefers a literal drag; on MapKit a drag begins with a press-and-hold, which most people never find.

**Radius: the existing `Slider`, 50–200 m, step 10, default 100.** Live value label, the circle rescales as the thumb moves, the camera keeps the whole circle in view. No edge handle: at 100 m the circle is too small to grab reliably.

**Reverse geocode once when the map settles** (debounced ~400 ms after the last `onRegionChangeComplete`), cached per rounded coordinate.

**Cost at 5,000 DAU: $0.** Everything runs on the device. Google would be roughly $85 one-off for 5k setups and near-zero monthly after that, but adds a key, a proxy and caching terms.

## Screen design

Entry points: setup step X3, Settings › Gyms, the gym rule card. Opens as a full-screen modal (the map needs the height; a half sheet is too small for a street-level circle).

### State 1 — Find

- Search field at the top, auto-focused, keyboard up. Placeholder "Search for your gym".
- Before typing: a "Use my current location" row with the arrow icon, then "Gyms near you" (up to 6 fitness centres from the POI request around the user). Most users tap their gym here without typing.
- While typing: suggestions update per keystroke from the completer. Row = dumbbell icon, gym name in bold, address in secondary. Query matches are highlighted.
- Empty: "No matches. Try the street name, or drop a pin on the map." with a "Drop a pin instead" button that opens State 2 at the user's location.
- Location denied: search still works, biased to the device region. The current-location row is hidden.

### State 2 — Place

- Map takes the top ~60%, street-level zoom that fits the circle with margin. Camera animates from the previous view.
- Pin fixed at screen centre with a small label under it showing the gym name. The circle is centred on the pin; outside the circle the map is lightly dimmed (the Too Good To Go mask), inside stays bright.
- A one-time hint "Move the map to adjust the pin" fades in on first pan and never returns.
- Bottom card, top to bottom: gym name field (prefilled, editable, required) · address line that updates when the map settles · "Arrival radius" slider with live "100 m" value · one-line helper "Bigger circle: detects you sooner, may include the parking lot" · "Save gym" CTA.
- Haptics: light tick on each slider step (already in `Slider`), one selection tick when the map settles after a pan.
- Moving the pin more than ~250 m from the searched place flips the badge from "Verified gym" to "Custom spot" (PRD honor-system tag) without blocking the save.
- Cap: at 5 saved gyms the CTA is disabled with the existing copy. Offline: search shows "You're offline", the current-location path still works.
- Save writes `SavedPlace` with the chosen `radiusMeters`; the fake port stops forcing 100.

### Motion

Sheet entry and the map camera animation already have presets; the circle radius change uses `spring.control`. The pin gets a small lift (translateY −6, scale 1.05) while the map is moving and settles back with the same spring, which is the cue that the position is being edited.

## Port and module shape

Extend `GymPort` (Phase 1 fake and Phase 2 native share it):

```ts
suggest(query: string, near?: Coordinates): Promise<PlaceSuggestion[]>;   // completer
resolve(suggestion: PlaceSuggestion): Promise<PlaceCandidate>;             // MKLocalSearch
nearbyGyms(near: Coordinates): Promise<PlaceCandidate[]>;                  // POI request, fitnessCenter
reverseGeocode(coord: Coordinates): Promise<string | null>;                // address line
```

Phase 2 implements these in one local Expo Module (`modules/expo-local-search`): `MKLocalSearchCompleter`, `MKLocalSearch`, `MKLocalPointsOfInterestRequest`, `MKReverseGeocodingRequest` with CLGeocoder fallback below iOS 26, and `MKMapSnapshotter` for list thumbnails.

## Phase placement

The map view is UI and renders real Apple tiles in the simulator, so the screen can be built now in Phase 1 with react-native-maps and the fake search port, and Phase 2 swaps in the Swift search module without touching the screen. This adds one native dependency to a phase labelled "no native"; react-native-maps works in Expo Go and app-next already ships a dev client, so the build cost is a prebuild. Johan's call.

## First spike before committing

1. Install react-native-maps in app-next, prebuild, confirm Apple-provider markers and `Circle` render on the RN 0.86 simulator (Google-provider markers are broken on 0.86; Apple is unverified).
2. Confirm `onRegionChange` fires continuously during pan so the circle mask stays glued to the centre.

## Open questions for Johan

- Centre-pin pattern (recommended) or a literally draggable marker?
- Build the real map in Phase 1 now, or keep the static image until Phase 2?
- Slider only, or slider plus 50/100/150/200 chips?

## Sources

- expo-maps 57.0.2 tarball types (`build/apple/AppleMaps.types.d.ts`, `build/shared.types.d.ts`, `ios/*.swift`, `ExpoMaps.podspec`)
- https://docs.expo.dev/versions/latest/sdk/maps/ · https://docs.expo.dev/versions/latest/sdk/map-view/ · https://docs.expo.dev/versions/latest/sdk/location/
- https://github.com/react-native-maps/react-native-maps/releases · issue 5973 · docs/marker.md · docs/mapview.md
- https://developer.apple.com/documentation/mapkit/mklocalsearchcompleter · mkpointofinterestcategory · mklocalsearch · mkmapsnapshotter · mkreversegeocodingrequest
- https://developer.apple.com/documentation/applemapsserverapi (quota 25,000 calls/day)
- https://developers.google.com/maps/billing-and-pricing/pricing · places/web-service/session-pricing · place-types
- https://www.mapbox.com/pricing
- npm: react-native-nearby-places 0.4.3 README
- screensdesign.com Too Good To Go, ts 493 (captured screenshot in the session)
