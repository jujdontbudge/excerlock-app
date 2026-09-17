import { describe, expect, it } from "vitest";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

import {
  ExpoLocationClient,
  type ExpoLocationModule,
} from "../src/engine/signals/location/ExpoLocationClient";
import { LocationTaskRuntime } from "../src/engine/signals/location/LocationTaskRuntime";
import { WALK_LOCATION_TASK_NAME } from "../src/engine/signals/location/locationTaskNames";

const appNextRoot = join(dirname(fileURLToPath(import.meta.url)), "..");

const MAIN_KEYS = [
  "com.apple.developer.family-controls",
  "com.apple.developer.healthkit",
  "com.apple.developer.healthkit.background-delivery",
  "com.apple.security.application-groups",
  "com.apple.developer.applesignin",
  "aps-environment",
  "com.apple.developer.associated-domains",
];

const APPEX = [
  {
    dir: "DeviceActivityMonitorExtension",
    bundle: "com.johansardar.excerlock.monitor",
  },
  {
    dir: "ShieldConfiguration",
    bundle: "com.johansardar.excerlock.shield",
  },
  {
    dir: "ShieldAction",
    bundle: "com.johansardar.excerlock.shieldaction",
  },
  {
    dir: "DeviceActivityReportExtension",
    bundle: "com.johansardar.excerlock.report",
  },
];

function need(path: string, why: string): string {
  if (!existsSync(path)) {
    throw new Error(
      `Missing generated ${path}. Run: npx expo prebuild --clean --no-install in app-next/ (no simulator, no EAS). ${why}`,
    );
  }
  return readFileSync(path, "utf8");
}

function locationTaskRuntime(): LocationTaskRuntime {
  return new LocationTaskRuntime({
    append: async () => undefined,
    readAll: async () => [],
  });
}

/**
 * The blue background-location pill is chosen at runtime, so it cannot be
 * asserted from the generated ios/ project. Pin the shipping adapter itself:
 * the lock-window keep-alive must ask Expo for the hidden indicator and for
 * coarse accuracy, while the foreground fix keeps high accuracy
 * (ADR 0036; decision recorded from the blue-arrow investigation report).
 */
describe("walk keep-alive background-location guardrail (runtime options, not generated ios/)", () => {
  it("keeps the indicator off and coarse accuracy on the keep-alive start", async () => {
    const record = recordingExpoLocationModule();
    const client = new ExpoLocationClient(record.module, locationTaskRuntime());

    await client.startLocationUpdates();

    expect(record.startCalls).toEqual([
      {
        taskName: WALK_LOCATION_TASK_NAME,
        options: {
          accuracy: "low",
          activityType: "other",
          distanceInterval: 500,
          pausesUpdatesAutomatically: false,
          showsBackgroundLocationIndicator: false,
        },
      },
    ]);
  });

  it("stops the keep-alive outside the window and keeps foreground fixes high accuracy", async () => {
    const record = recordingExpoLocationModule();
    const client = new ExpoLocationClient(record.module, locationTaskRuntime());

    await client.startLocationUpdates();
    await client.stopLocationUpdates();
    await client.getCurrentLocation();

    expect(record.stopCalls).toEqual([WALK_LOCATION_TASK_NAME]);
    expect(record.foregroundCalls).toEqual([{ accuracy: "high" }]);
    // No start option may ever request the blue indicator.
    expect(
      record.startCalls.every(
        ({ options }) => options.showsBackgroundLocationIndicator === false,
      ),
    ).toBe(true);
  });

  it("keeps the location background mode and Always plugin flag the keep-alive needs", () => {
    const nativeSource = readFileSync(
      join(appNextRoot, "config", "native.ts"),
      "utf8",
    );
    // Read from the config source, not the generated ios/ project: the keep-alive
    // cannot run at all without the `location` background mode or the Always
    // capability, and production loses residency entirely without either (#140).
    expect(nativeSource).toMatch(/UIBackgroundModes:\s*\["location",\s*"fetch"\]/);
    expect(nativeSource).toContain("isIosBackgroundLocationEnabled: true");
  });
});

type KeepAliveStartCall = {
  taskName: string;
  options: Record<string, unknown>;
};

function recordingExpoLocationModule(): {
  module: ExpoLocationModule;
  startCalls: KeepAliveStartCall[];
  stopCalls: string[];
  foregroundCalls: { accuracy: unknown }[];
} {
  const startCalls: KeepAliveStartCall[] = [];
  const stopCalls: string[] = [];
  const foregroundCalls: { accuracy: unknown }[] = [];
  const module = {
    Accuracy: { High: "high", Low: "low" },
    ActivityType: { Other: "other" },
    startLocationUpdatesAsync: async (
      taskName: string,
      options: Record<string, unknown>,
    ) => {
      startCalls.push({ taskName, options });
    },
    stopLocationUpdatesAsync: async (taskName: string) => {
      stopCalls.push(taskName);
    },
    getCurrentPositionAsync: async (options: { accuracy: unknown }) => {
      foregroundCalls.push(options);
      return {
        coords: { latitude: 40.741, longitude: -73.989, accuracy: 8 },
        timestamp: 2_000,
      };
    },
  } as unknown as ExpoLocationModule;
  return { module, startCalls, stopCalls, foregroundCalls };
}

describe("T01 entitlements guardrail (generated ios/, not config source)", () => {
  it("main app carries every §1 entitlement", () => {
    const text = need(
      join(appNextRoot, "ios", "ExcerLock", "ExcerLock.entitlements"),
      "The executable signature is the truth; config source alone proves nothing.",
    );
    for (const key of MAIN_KEYS) {
      expect(text, `main entitlements missing ${key}`).toContain(key);
    }
    expect(text).toContain("group.com.johansardar.excerlock");
    expect(text).toContain("applinks:excerlock.com");
  });

  it("each required appex carries exactly Family Controls + App Groups", () => {
    for (const { dir, bundle } of APPEX) {
      const text = need(
        join(appNextRoot, "targets", dir, "generated.entitlements"),
        "Written by the apple-targets config phase; the Xcode target signs this file.",
      );
      expect(text, `${dir} missing Family Controls`).toContain(
        "com.apple.developer.family-controls",
      );
      expect(text, `${dir} missing App Groups`).toContain(
        "com.apple.security.application-groups",
      );
      expect(text, `${dir} missing app group value`).toContain(
        "group.com.johansardar.excerlock",
      );
      for (const privileged of [
        "com.apple.developer.healthkit",
        "com.apple.developer.applesignin",
        "aps-environment",
        "com.apple.developer.associated-domains",
      ]) {
        expect(
          text,
          `${dir} must not carry main-only ${privileged}`,
        ).not.toContain(privileged);
      }
      // The Xcode target points at this file with the canonical bundle/team/deployment.
      const pbx = need(
        join(appNextRoot, "ios", "ExcerLock.xcodeproj", "project.pbxproj"),
        "Generated by prebuild.",
      );
      expect(pbx, `${dir} target missing bundle ${bundle}`).toContain(
        `PRODUCT_BUNDLE_IDENTIFIER = ${bundle};`,
      );
    }
    const pbx = readFileSync(
      join(appNextRoot, "ios", "ExcerLock.xcodeproj", "project.pbxproj"),
      "utf8",
    );
    expect(pbx).toContain("DEVELOPMENT_TEAM = AX3C2B78YD;");
    // No stale copy-pollution target may exist.
    expect(pbx).not.toContain("com.johansardar.excerlock.ActivityMonitorExtension");
    expect(
      existsSync(join(appNextRoot, "targets", "ActivityMonitorExtension")),
      "targets/ActivityMonitorExtension must not exist (copyToTargetFolder:false)",
    ).toBe(false);
  });

  it("main+4 appex exist with canonical bundles and no fifth appex", () => {
    const pbx = need(
      join(appNextRoot, "ios", "ExcerLock.xcodeproj", "project.pbxproj"),
      "Generated by prebuild.",
    );
    for (const bundle of [
      "com.johansardar.excerlock",
      "com.johansardar.excerlock.monitor",
      "com.johansardar.excerlock.shield",
      "com.johansardar.excerlock.shieldaction",
      "com.johansardar.excerlock.report",
    ]) {
      expect(pbx, `missing canonical bundle ${bundle}`).toContain(
        `PRODUCT_BUNDLE_IDENTIFIER = ${bundle};`,
      );
    }
    // The App Intent lives in the main app target: no fifth appex, no
    // pending appex directory, no Siri entitlement solely for AppIntent.
    expect(pbx).not.toContain("com.johansardar.excerlock.appintents");
    expect(
      existsSync(join(appNextRoot, "targets", "app-intents")),
      "targets/app-intents must not exist (intent is a main-app source)",
    ).toBe(false);
    expect(
      existsSync(
        join(
          appNextRoot,
          "targets",
          "DeviceActivityReportExtension",
          "expo-target.config.pending.js",
        ),
      ),
      "report is a live target now (expo-target.config.js), not pending",
    ).toBe(false);
    expect(readdirSync(join(appNextRoot, "ios")).sort()).toEqual(
      expect.arrayContaining(["ExcerLock", "ExcerLock.xcodeproj"]),
    );
  });

  it("main app links the OpenExcerLock intent source", () => {
    const pbx = need(
      join(appNextRoot, "ios", "ExcerLock.xcodeproj", "project.pbxproj"),
      "Generated by prebuild (withMainAppIntent).",
    );
    expect(pbx, "main target missing OpenExcerLockIntent.swift").toContain(
      "OpenExcerLockIntent.swift",
    );
    expect(pbx, "main target missing AppIntents.framework").toContain(
      "AppIntents.framework in Frameworks",
    );
  });

  it("packages the report as ExtensionKit under the dedicated embed phase", () => {
    const pbx = need(
      join(appNextRoot, "ios", "ExcerLock.xcodeproj", "project.pbxproj"),
      "Generated by prebuild.",
    );
    expect(pbx).toContain(
      'productType = "com.apple.product-type.extensionkit-extension";',
    );
    expect(pbx).toContain(
      'explicitFileType = "wrapper.extensionkit-extension";',
    );
    expect(pbx).toContain("DeviceActivityReportExtension.appex in Embed ExtensionKit Extensions");
    const info = need(
      join(appNextRoot, "targets", "DeviceActivityReportExtension", "Info.plist"),
      "The report uses EXAppExtensionAttributes, not legacy NSExtension packaging.",
    );
    expect(info).toContain("com.apple.deviceactivityui.report-extension");
    expect(info).not.toContain("NSExtension");
  });
});
