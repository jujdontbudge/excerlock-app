# ExcerLock — Phase 1

A separate Expo SDK 57 app using local fake data. The original app and server are read-only references. Product copy belongs in src/content; presentation tokens in src/design-system; IO contracts in src/ports. Real services are unavailable in Phase 1.

From the repo root run `npm install`. From this folder run `npm test`, `npm run typecheck`, `npm run lint`. `npm start` uses IPv4 localhost port 8091. Build with `sh scripts/simulator.sh build`, then `boot`, `install`, and `launch`. This uses Expo build-only mode plus simctl so Simulator.app stays closed. Finish with `sh scripts/simulator.sh shutdown`.

Task evidence lives in evidence/T00 through evidence/T16; indexes are committed, generated media and logs stay local. Open `excerlock://dev` for 24 scenarios, clock controls, permission/session/entitlement toggles, prompt behavior, event log and component previews. `excerlock://dev?scenario=home-locked-walking` loads a scenario and follows the boot gate. “Load and keep edits” preserves validated store data. Gemini gates were deferred by Johan; final acceptance records that limitation.

Phase 1 Home retains tab scroll position and reads live local progress. Capture links `excerlock://home?steps=5000` and `excerlock://home?advance=3600000` preserve Home while changing fake steps or clock. Adapter context is persisted separately from the eight product stores, so a cold launch resumes the same scenario and signals. Setup branch capture uses `excerlock://dev?scenario=runner-distance&setup=X3` (or a gym/walking scenario).
