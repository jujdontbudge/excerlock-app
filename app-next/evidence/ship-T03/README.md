# ship-T03 evidence

Runtime coordinator + verifier (branch ship/T03). T00 device/screenshots remain release gates.

- `updates-jest.md` — targeted Jest (41 tests) for safe boundaries, loop guard, first-launch ownership, 6h policy, separate budgets, authority revocation, import boundary.
- `updates-typecheck.md` — `tsc --noEmit` (clean).
- `verify-ota-shell.md` — `bash -n` + ASC numeric-newest + `expo-v11.db` BLOB fixture checks.
- `verify-ota-fixtures.json` — sqlite/plist/version-sort fixture results.
- `scope.md` — ownership + limits (Free account: no signing keys, no tamper claim; no device run here).

Physical-device activation (`expo-v11.db` with intended id + `successful_launch_count > 0` on App Store + TestFlight installs) and tamper-manifest proof were not run here (no device use in this task) and remain T16 gates. Missing artifact is a runtime limit, not a pass.
