# ExpoLocalSearch (iOS)

Local Expo module, autolinked from `modules/`. `PlaceSearchService` owns MapKit completions and resolution; `PickerLocationService` owns foreground location permission and one-shot location. The module exports these through promise-returning functions on the main queue. There is no country filter, web backend, API key or background geofencing here.

`suggest` supersedes the prior autocomplete request and resolves it empty; JS ignores stale requests. The matching MapKit completion is retained for accurate resolution. Requests fail visibly on unavailable services rather than returning fabricated places.

Build with the Expo CLI following the repository's Expo MCP workflow. Native code must be rebuilt when this module changes.
