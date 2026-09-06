# ExcerLock — Phase 1

A separate Expo SDK 57 app using local fake data. The original app and server are read-only references. Product copy belongs in src/content; presentation tokens in src/design-system; IO contracts in src/ports. Real services are unavailable in Phase 1.

From the repo root run `npm install`. From this folder run `npm test`, `npm run typecheck`, `npm run lint`. `npm start` uses IPv4 localhost port 8091. Build with `sh scripts/simulator.sh build`, then `boot`, `install`, and `launch`. This uses Expo build-only mode plus simctl so Simulator.app stays closed. Finish with `sh scripts/simulator.sh shutdown`.

Task evidence lives in evidence/T00 through evidence/T16; indexes are committed, generated media and logs stay local. Scenarios and the dev menu arrive in T03. Gemini gates were deferred by Johan; final acceptance records that limitation.
