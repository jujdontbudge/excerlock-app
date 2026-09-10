/**
 * T01 native manifest export contract.
 *
 * Root `app.config.ts` merges `nativeConfig.ios` and `nativeConfig.plugins`
 * into the Expo config. No secrets, no EAS update configuration here — root
 * owns those (T02). Every `NS*UsageDescription` is set in exactly one plugin
 * (see plugins/README.md); this file never duplicates a plugin-owned string.
 *
 * Canonical order is LIFO: first-listed runs last. The Screen Time validator
 * stays first-listed so it validates after every other Xcode mutation. B50
 * keeps push: `withNoPush` is absent and `aps-environment` is expected from
 * `expo-notifications` (provisioning must carry Push).
 */

export const NATIVE_APP_GROUP = "group.com.johansardar.excerlock";
export const NATIVE_TEAM_ID = "AX3C2B78YD";
export const NATIVE_DEPLOYMENT_TARGET = "17.4";

export const NATIVE_BUNDLE_IDS = {
  app: "com.johansardar.excerlock",
  monitor: "com.johansardar.excerlock.monitor",
  shield: "com.johansardar.excerlock.shield",
  shieldaction: "com.johansardar.excerlock.shieldaction",
  // Pending (no Xcode appex in T01; see targets/*/README.md):
  report: "com.johansardar.excerlock.report",
  appintents: "com.johansardar.excerlock.appintents",
} as const;

type ExpoPlugin = string | [string, Record<string, unknown>?];

export const healthKitPlugin: ExpoPlugin = [
  "@kingstinct/react-native-healthkit",
  {
    background: false,
    NSHealthShareUsageDescription:
      "ExcerLock reads your activity to detect completed fitness conditions on this device.",
    NSHealthUpdateUsageDescription: false,
  },
];

export const nativePlugins: ExpoPlugin[] = [
  "./plugins/withScreenTimeExtensionValidation",
  "./plugins/withMainAppEntitlements",
  "./plugins/withPrivacyManifest",
  healthKitPlugin,
  "./plugins/withHealthKitBackgroundBootstrap",
  [
    "react-native-device-activity",
    {
      appleTeamId: NATIVE_TEAM_ID,
      appGroup: NATIVE_APP_GROUP,
      // Never copy the package targets into app-next/targets: the three
      // required configs are source here; package Swift stays package-owned
      // and is materialized byte-for-byte by the validator. A copy would
      // shadow our bundle IDs with a stale ActivityMonitorExtension target.
      copyToTargetFolder: false,
    },
  ],
  "./modules/excerlock-motion/app.plugin",
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

export const nativeConfig = {
  ios: {
    bundleIdentifier: NATIVE_BUNDLE_IDS.app,
    appleTeamId: NATIVE_TEAM_ID,
    supportsTablet: false,
    usesAppleSignIn: true,
    backgroundModes: ["location", "fetch", "processing"],
    associatedDomains: ["applinks:excerlock.com"],
    entitlements: {
      "com.apple.developer.family-controls": true,
      "com.apple.developer.healthkit": true,
      "com.apple.developer.healthkit.background-delivery": true,
      "com.apple.security.application-groups": [NATIVE_APP_GROUP],
      "com.apple.developer.applesignin": ["Default"],
      "aps-environment": "development",
      "com.apple.developer.associated-domains": ["applinks:excerlock.com"],
    },
    infoPlist: {
      UIBackgroundModes: ["location", "fetch", "processing"],
      // Single-place strings with no owning plugin (never duplicate a
      // plugin-owned NS*UsageDescription here):
      NSUserTrackingUsageDescription:
        "ExcerLock does not track you across apps or websites. No tracking prompt is shown in v1.",
      NSLocationAlwaysUsageDescription:
        "Allow ExcerLock to detect arrivals at saved gyms when you opt into auto-detect.",
      CFBundleLocalizations: ["en"],
      CFBundleAllowMixedLocalizations: true,
      CFBundleAlternateIcons: {
        CFBundlePrimaryIcon: { CFBundleIconFiles: ["AppIcon"] },
        AlternateIcon: {
          CFBundleIconFiles: ["AlternateIcon"],
          UIPrerenderedIcon: false,
        },
      },
    },
  },
  plugins: nativePlugins as ExpoPlugin[],
} as const;

export type NativeConfig = typeof nativeConfig;
