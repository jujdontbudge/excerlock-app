## Phase 1: Analyze the project

Read the project structure to identify platform and existing code patterns:

| File/signal found | Platform |
|---|---|
| `*.xcodeproj`, `Package.swift`, `.swift` files | iOS |
| `build.gradle`, `AndroidManifest.xml` | Android |
| `pubspec.yaml` | Flutter |
| `package.json` with `react-native` dep | React Native |
| `package.json` with `@capacitor/core` dep | Capacitor |
| `*.unity`, `Assets/` with `.cs` files | Unity |
| `shared/build.gradle.kts` (KMP structure) | Kotlin Multiplatform |

Also check for:
- Existing authentication system (affects user identification step)
- Existing purchase code (triggers the migration branch below)
- Target iOS/Android version (affects SDK compatibility)

**Pre-existing purchase system — the migration trigger.** Grep the dependency manifests that exist (`package.json`, `pubspec.yaml`, `Podfile`, `Package.swift`, the gradle files, `Packages/manifest.json`) and the Xcode project file for any purchase or paywall SDK, store plugin, or direct StoreKit / Google Play Billing use. Answer one question here: does this project already sell purchases through something? Do not classify the source in this phase.

On a hit, load `references/migration.md` in addition to the platform reference and identify the source there with its section 2 table, which owns the signals, the first-match order, and where the version comes from. Then set `migrationSource` to one of `revenuecat`, `superwall`, `qonversion`, `store-plugin`, `native-store`, set `migrationSourceVersion` to the source's installed version, and load `references/migration-<migrationSource>.md` too when that file exists. You are the setter for both variables; the migration reference records them only if you did not. No hit → leave both empty, load no migration reference, and treat the integration as greenfield.

If a launcher (for example the Adapty CLI) already told you the source, take it and skip the detection grep — but still load `references/migration.md` and still resolve `migrationSourceVersion` from the project, since a launcher never supplies the version.

**State update:** Set `platform` to the detected platform (`ios`, `android`, `flutter`, `react-native`, `unity`, `kmp`, or `capacitor`). Set `migrationSource` and `migrationSourceVersion` as above, or leave both empty for a greenfield project. Set `phasesCompleted = 1`.

Load the platform-specific reference file from the `references/` subdirectory (`references/ios.md`, `references/android.md`, etc.).

