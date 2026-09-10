# T03 verify-ota.sh — shell + fixture checks

- `bash -n app-next/scripts/verify-ota.sh` — syntax OK.
- `--help` exits 0 and documents required artifact/device args; no paths guessed.
- Missing `--db-path` exits 2 with `RUNTIME LIMIT` (not PASS).
- `--dry-run` rejected with `FAIL` (no deceptive dry-run success).
- Invalid UUID rejected with `FAIL`.
- `expo-v11.db` BLOB fixtures (real schema, 16-byte UUID BLOB):
  - success fixture (`successful_launch_count=2`) matches via `hex(id)` case-insensitive → would PASS device proof.
  - zero fixture (`successful_launch_count=0`) matches id but count 0 → correctly FAILs (must be > 0).
  - missing-id fixture (different UUID, count 5) finds no match → correctly FAILs (manifest metadata is not proof).
- ASC numeric-newest fixture (`1.0.9` vs `1.0.10` vs `1.0.2`): picks `1.0.10` (numeric, not lexicographic); ignores non-IOS and non-READY_FOR_SALE.
- `Expo.plist` fixture read (`EXUpdatesRuntimeVersion`) via plistlib → `1`.
- Live ASC (read-only, 2026-09-10): ExcerLock `6787265352` has one version `1.0` in `PREPARE_FOR_SUBMISSION`, zero `READY_FOR_SALE`, zero builds. Verifier therefore correctly FAILs “no live version” until T16 publishes; no device run attempted here.

Full device proof (App Store + TestFlight installs, launch twice, `expo-v11.db` assertion) remains a T16 gate requiring a physical phone.
