# Prebuild evidence (two clean runs, EXIT 0 both)

Command (both runs): `EXPO_NO_GIT_STATUS=1 expo prebuild --platform ios --clean --no-install` in `app-next/`.

## Run 3 (after copyToTargetFolder + Beta-validator fixes)

```
- Clearing ios
✔ Cleared ios code
- Creating native directory (./ios)
✔ Created native directory
- Updating package.json
✔ Updated package.json | no changes
- Running prebuild

Using experimental Config Plugin @bacons/apple-targets that is subject to breaking changes.
✔ Finished prebuild
```

## Run 4 (determinism repeat)

Identical output, EXIT 0.

## Determinism diff (`diff -rq /tmp/t01-ios-run3 ios`)

Only one file differs: `ExcerLock.xcodeproj/project.pbxproj`. Every other
generated file (Info.plist, entitlements, PrivacyInfo, Podfile, sources) is
byte-identical.

Raw pbxproj diff hunks touch only 24-hex Xcode object UUIDs for:
- `HealthKitBackgroundBootstrap.mm` PBXBuildFile/PBXFileReference (our ported
  `withHealthKitBackgroundBootstrap` uses `addBuildSourceFileToGroup`, which
  mints random UUIDs — inherited behavior from `app/plugins`, not introduced),
- `Upload Debug Symbols to Sentry` and `[Expo Dev Launcher] Strip Local Network
  Keys for Release` build phases (vendor plugins mint random UUIDs).

Normalization (narrow, semantic-preserving):
1. `s/[0-9A-F]{24}/<XCODE_UUID>/g` on both files → remaining diff is only LINE
   ORDER within unordered pbxproj sections (one hunk: HealthKit build-file line
   position).
2. Sort normalized lines → diff EMPTY.

Conclusion: the two clean prebuilds are semantically identical. Normalization
touched only proven-nondeterministic build metadata (random object IDs + unordered
section ordering); all keys, values, bundle IDs, team, deployment target,
entitlements paths, file memberships and build settings are identical. No
semantic difference hidden: any changed bundle ID, string, key or membership
would survive both normalizations as a differing line.
