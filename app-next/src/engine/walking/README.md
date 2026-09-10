# Walking engine (T01 stub)

T11 owns `MotionAdapter`, `PlacementAdapter`, the walking/propped state
machines and the awake session (`01-detection-model.md` §1, §3, §4, §7).
Here this directory only selects providers so the port compiles:

- native iOS build → `NativeMotionProvider` + `NativePhonePlacementProvider`
- tests / Expo Go / other runtimes → fixture providers

Do not add thresholds here; the native layer stays threshold-free so tuning
remains JS-OTA-able.
