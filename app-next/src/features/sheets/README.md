# Shared sheets

`FakeAppPicker` is the Phase 1 replacement for Apple's private app-selection UI. It exports only counts and an opaque handle; generic selection keys stay inside the fake picker. `GymPicker` reads fake search results, validates a name and the five-place limit, and displays the bundled fictional map. Both sheets are exported for setup, Home, Conditions and Settings.

BottomSheet's fixed footer keeps Done/Save reachable while search results scroll. It owns entry, scrim, drag and dismissal motion. Saved gym persistence belongs to the local fake adapter through settings; no location/map service is called.
