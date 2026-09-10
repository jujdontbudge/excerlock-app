# T03 verify-ota.sh — shell + fixture checks (revision: bound IPA + dual-store proof)

- `bash -n app-next/scripts/verify-ota.sh` — syntax OK.
- `bash -n app-next/scripts/test-verify-ota.sh` — syntax OK.
- `--help` exits 0 and documents bound `--ipa` + separate `--appstore-db`/`--testflight-db` + `--appstore-evidence`/`--testflight-evidence`; no paths guessed; script never claims it observed installation.
- `test-verify-ota.sh` with mocked `asc` (no network, 10 cases, all pass):
  - PASS binds numeric-newest `1.0.10` over `1.0.9`/`1.0.2` (numeric tuple sort, ignores non-IOS/non-READY_FOR_SALE) + ASC bundle/build + IPA `CFBundleIdentifier`/`CFBundleShortVersionString`/`CFBundleVersion`/`EXUpdatesRuntimeVersion` + both DBs `successful_launch_count>0` + `runtime_version==expected`.
  - unrelated bundle / build number (`attributes.version`) / marketing version → `FAIL` (unrelated build rejected).
  - wrong DB `runtime_version` → `FAIL` (each DB compared).
  - zero launches → `FAIL` (must be > 0).
  - missing TestFlight db → `RUNTIME LIMIT` (separate stores required).
  - standalone `--expo-plist` → `FAIL` (unbound rejected).
  - single `--db-path` → `FAIL` (separate DBs required).
  - missing intended id → `FAIL` (manifest metadata is not proof).
- Missing `--ipa`/`--appstore-db`/`--testflight-db` → `RUNTIME LIMIT` (exit 2), never PASS. `--dry-run` rejected. Invalid UUID rejected.

Full device proof (App Store + TestFlight delete-install-launch-twice on physical phones with caller-provided dbs + evidence metadata) remains a T16 gate; no live artifacts claimed here. Fixture IPAs/DBs are synthetic (complete `Payload/*.app/Info.plist` + bound `Expo.plist`; real `updates(id BLOB, runtime_version, successful_launch_count)` schema via `hex(id)`).
