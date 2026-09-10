# Config export contract — `app-next/config/native.ts` → root `app.config.ts`

Root merges `nativeConfig.ios` and `nativeConfig.plugins`. No secrets, no
`updates`/channel/runtimeVersion (T02 owns those).

## Exports

- `NATIVE_APP_GROUP = "group.com.johansardar.excerlock"`, `NATIVE_TEAM_ID = "AX3C2B78YD"`, `NATIVE_DEPLOYMENT_TARGET = "17.4"`.
- `NATIVE_BUNDLE_IDS`: app/monitor/shield/shieldaction (+ pending report/appintents).
- `healthKitPlugin`: vendor `@kingstinct/react-native-healthkit` (`background:false`, share string, no update string).
- `nativePlugins` (canonical LIFO order; first-listed runs last):
  1. `./plugins/withScreenTimeExtensionValidation` (first = runs last = validates after everything)
  2. `./plugins/withMainAppEntitlements`
  3. `./plugins/withPrivacyManifest`
  4. vendor HealthKit → 5. `./plugins/withHealthKitBackgroundBootstrap` (immediately after vendor; patch makes `background:false` effective)
  6. `react-native-device-activity` (`appleTeamId`, `appGroup`, `copyToTargetFolder:false`)
  7. motion → 8. gait-vision → 9. `expo-location` (bg + both Always/WhenInUse strings) → 10. `expo-notifications` (owns `aps-environment`) → 11. `expo-apple-authentication` → 12. `expo-secure-store` (owns FaceID string) → 13. `expo-image-picker` (photo string; camera/mic false) → 14. maps → 15. router → 16. dev-client → 17. splash (running-lock assets) → 18. font → 19. `react-native-adapty` → 20. `expo-build-properties` (17.4) → 21. `@sentry/react-native/expo` (edge-ix/excerlock-mobile).
  - `withNoPush` absent everywhere (B50).
- `nativeConfig.ios`: bundle/team/tablet/`usesAppleSignIn`/associatedDomains + full `entitlements` (FamilyControls, HealthKit×2, App Groups, applsignin/Default, aps-environment, associated-domains) + `infoPlist` with single-place keys only: `UIBackgroundModes [location,fetch,processing]`, `NSUserTrackingUsageDescription`, legacy `NSLocationAlwaysUsageDescription`, `CFBundleLocalizations [en]` + mixed flag, `CFBundleAlternateIcons` (primary + one alternate). Every other `NS*UsageDescription` lives in exactly one plugin (asserted by prebuild output, not by source grep).

`app-next/app.json` mirrors this contract for local prebuild until root lands `app.config.ts`.
