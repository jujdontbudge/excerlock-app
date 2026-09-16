/**
 * T01 native manifest export contract.
 *
 * Root `app.config.ts` merges `nativeConfig.ios` and `nativeConfig.plugins`
 * into the Expo config and is the SOLE plugin-list owner downstream: this
 * `nativePlugins` array is the complete list (no additions in app.json or
 * app.config beyond this export). No secrets, no EAS update configuration
 * here — root owns those (T02). Every `NS*UsageDescription` is set in exactly
 * one plugin (see plugins/README.md); this file never duplicates a
 * plugin-owned string.
 *
 * Ordering note: the Screen Time validator and the main-app entitlements
 * guard both use `withFinalizedMod` and therefore validate the GENERATED
 * postconditions regardless of list position. First-listed placement of the
 * validator is a readability convention, not an ordering mechanism (Expo
 * does not guarantee global LIFO across interceptor kinds).
 *
 * Push (B50): `withNoPush` is absent. `aps-environment` is intentionally NOT
 * set here: `expo-notifications` supplies the development default at
 * prebuild and signing/EAS supplies the release value. Hardcoding
 * `development` would mislabel a release binary.
 */

import type { ExpoConfig } from "expo/config";

export const NATIVE_APP_GROUP = "group.com.johansardar.excerlock";
export const NATIVE_TEAM_ID = "AX3C2B78YD";
export const NATIVE_DEPLOYMENT_TARGET = "17.4";

export const NATIVE_BUNDLE_IDS: Record<string, string> = {
  app: "com.johansardar.excerlock",
  monitor: "com.johansardar.excerlock.monitor",
  shield: "com.johansardar.excerlock.shield",
  shieldaction: "com.johansardar.excerlock.shieldaction",
  report: "com.johansardar.excerlock.report",
};

type ExpoPlugin = NonNullable<ExpoConfig["plugins"]>[number];

export const healthKitPlugin: ExpoPlugin = [
  "@kingstinct/react-native-healthkit",
  {
    background: false,
    NSHealthShareUsageDescription:
      "ExcerLock reads your activity to detect completed fitness conditions on this device.",
    // The SDK links HealthKit write APIs even though ExcerLock requests only
    // read access, so App Store static validation still requires this key.
    NSHealthUpdateUsageDescription:
      "ExcerLock uses Health access only to read completed activities and does not write data to Health.",
  },
];

export const nativePlugins: ExpoPlugin[] = [
  "./plugins/withScreenTimeExtensionValidation",
  "./plugins/withMainAppEntitlements",
  "./plugins/withPrivacyManifest",
  "./plugins/withMainAppIntent",
  healthKitPlugin,
  "./plugins/withHealthKitBackgroundBootstrap",
  "./modules/excerlock-startup/app.plugin",
  [
    "react-native-device-activity",
    {
      appleTeamId: NATIVE_TEAM_ID,
      appGroup: NATIVE_APP_GROUP,
      // Never copy the package targets into app-next/targets: the required
      // configs are source here; package Swift stays package-owned and is
      // materialized byte-for-byte by the validator. A copy would shadow our
      // bundle IDs with a stale ActivityMonitorExtension target.
      copyToTargetFolder: false,
    },
  ],
  "./modules/excerlock-motion/app.plugin",
  "./modules/excerlock-enforcement/app.plugin",
  "./modules/excerlock-gait-vision/app.plugin",
  [
    "expo-location",
    {
      isIosBackgroundLocationEnabled: true,
      locationWhenInUsePermission:
        "Allow ExcerLock to check whether you are at a saved gym and keep a Walk Session active.",
      locationAlwaysAndWhenInUsePermission:
        "Allow ExcerLock to detect arrivals at saved gyms when you opt into auto-detect.",
    },
  ],
  "expo-notifications",
  "expo-apple-authentication",
  "expo-secure-store",
  [
    "expo-image-picker",
    {
      photosPermission: "Allow ExcerLock to use a photo as a condition banner.",
      cameraPermission: false,
      microphonePermission: false,
    },
  ],
  "react-native-maps",
  "expo-router",
  "expo-dev-client",
  [
    "expo-splash-screen",
    {
      image: "./assets/running-lock.png",
      imageWidth: 140,
      backgroundColor: "#FFFFFF",
    },
  ],
  "expo-font",
  "react-native-adapty",
  ["expo-build-properties", { ios: { deploymentTarget: NATIVE_DEPLOYMENT_TARGET } }],
  ["@sentry/react-native/expo", { organization: "edge-ix", project: "excerlock-mobile" }],
];

export const nativeConfig: {
  ios: ExpoConfig["ios"];
  plugins: ExpoPlugin[];
} = {
  ios: {
    bundleIdentifier: NATIVE_BUNDLE_IDS.app,
    appleTeamId: NATIVE_TEAM_ID,
    supportsTablet: false,
    usesAppleSignIn: true,
    // Background execution is declared via infoPlist.UIBackgroundModes (the
    // real mechanism; ExpoConfig.ios has no backgroundModes key): location
    // for geofence arrivals + Walk Session tracking (real TaskManager tasks
    // in src/engine/signals/location), fetch for headless task execution.
    // No processing mode: nothing registers a BGProcessingTask.
    associatedDomains: ["applinks:excerlock.com"],
    entitlements: {
      "com.apple.developer.family-controls": true,
      "com.apple.developer.healthkit": true,
      "com.apple.developer.healthkit.background-delivery": true,
      "com.apple.security.application-groups": [NATIVE_APP_GROUP],
      "com.apple.developer.applesignin": ["Default"],
      "com.apple.developer.associated-domains": ["applinks:excerlock.com"],
    },
    infoPlist: {
      UIBackgroundModes: ["location", "fetch"],
      // Export compliance: every network path is HTTPS/TLS terminated by the OS
      // and the app adds no custom crypto, so it qualifies for the exempt
      // declaration. Declaring it up front stops App Store Connect from
      // flagging the build with MISSING_EXPORT_COMPLIANCE.
      ITSAppUsesNonExemptEncryption: false,
      // Single-place strings with no owning plugin (never duplicate a
      // plugin-owned NS*UsageDescription here). No NSUserTrackingUsageDescription:
      // v1 shows no ATT prompt and declares NSPrivacyTracking=false.
      // No CFBundleAlternateIcons: v1 bundles no alternate icon assets, so any
      // declaration would be a phantom reference. Primary icon stays Expo-owned.
      NSLocationAlwaysUsageDescription:
        "Allow ExcerLock to detect arrivals at saved gyms when you opt into auto-detect.",
      CFBundleLocalizations: ["en"],
      CFBundleAllowMixedLocalizations: true,
    },
  },
  plugins: nativePlugins,
};

export type NativeConfig = typeof nativeConfig;

// Compile-time contract: the export must remain assignable to the Expo
// config surface root `app.config.ts` consumes (mutable arrays, Expo plugin
// entries, iOS options). Breaks the build here — not at prebuild — on drift.
const __expoPluginList: NonNullable<ExpoConfig["plugins"]> = nativePlugins;
const __expoIos: ExpoConfig["ios"] = nativeConfig.ios;
void __expoPluginList;
void __expoIos;
