# TestFlight 1.0.0 (2) — 2026-09-17

Runtime 2 candidate built locally from `main` at `d8cf0973` plus the 10-second
gym confirm (`GYM_CONFIRM_MS = 10_000`) and `ios.buildNumber = "2"`.

## Apple artifact

- App `6787265352`, bundle `com.johansardar.excerlock`, team `AX3C2B78YD`.
- Build ID `f7392f37-8bca-438f-8842-22e74faa9876`, `1.0.0 (2)`, processing `VALID`,
  audience `APP_STORE_ELIGIBLE`. Upload-only: no beta groups exist, nothing was
  submitted for beta or App Review.
- What to Test (en-US) set via `asc builds test-notes create`: 10 s gym unlock,
  walking ~3 s, no blue pill.
- IPA SHA-256 `eff650e6e88c86cfd62abf96266d6031bc7447a493105525f94e29f55ff1fe2c`
  (`app-next/build/tf/ExcerLock-1.0.0-2.ipa`, untracked).
- Embedded `Expo.plist`: runtime `2`, channel `production`. `verify-binary.sh
  --distribution` passed for the main bundle and all four extensions.

## Lane (repeat for the next build)

1. `EXCERLOCK_ENV=prod NODE_ENV=production npx expo prebuild --platform ios --clean`
   (restore `ios/.xcode.env.local` afterwards), then `verify-binary.sh --prebuild-only ios`.
2. `asc builds next-build-number --app 6787265352 --version <v> --platform IOS`
   and put the result in `app.json` `ios.buildNumber` (`appVersionSource: local`;
   `CURRENT_PROJECT_VERSION` only reaches the extensions, not the Expo-written
   main `Info.plist`). Re-run prebuild without `--clean` and `npx pod-install`.
3. `asc xcode archive` with `EXCERLOCK_ENV=prod` exported (the Bundle React
   Native phase evaluates `app.config.ts`), `-allowProvisioningUpdates` and the
   `-authenticationKey*` flags for `~/.excerlock/AuthKey_<ASC_KEY_ID>.p8`.
4. `asc xcode export` under `PATH=/usr/bin:/bin:/usr/sbin:/sbin:/opt/homebrew/bin`
   (Homebrew rsync breaks the export copy step; see the pitfall ledger).
5. `verify-binary.sh --distribution <Payload>`, then under the release lock:
   `asc publish testflight --app 6787265352 --ipa <ipa> --upload-only --wait`.
   `--test-notes` cannot combine with `--upload-only`; use
   `asc builds test-notes create --build-id <id> --locale en-US --whats-new ...`.
