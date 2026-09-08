import { existsSync } from "node:fs";
import plist from "@expo/plist";
import { describe, expect, it } from "vitest";

import { fromRoot, readUtf8, walkFiles } from "./repo-files";


const CAUSES = [
  "balanceEmpty",
  "fullLock",
  "lockWindow",
  "walkAndScrollEnded",
] as const;

const DEEP_LINKS: Readonly<Record<(typeof CAUSES)[number], string>> = {
  balanceEmpty: "excerlock://",
  fullLock: "excerlock://locked-apps",
  lockWindow: "excerlock://locked-apps",
  walkAndScrollEnded: "excerlock://",
};

describe("Screen Time shield content", () => {
  /**
   * The plist is the extension's cold-start fallback: what a shield shows before the app has ever
   * published a snapshot into the app group. This asserts it is bundled and complete; that its
   * words are the words `domain/shieldContent` would publish is asserted in
   * `app-next/src/adapters/screentime/__tests__/shieldPlist.test.ts`, which can import the domain.
   */
  it("ships the four cause-keyed variants with their matching app surfaces", () => {
    const contentPath = fromRoot(
      "app-next",
      "targets",
      "ShieldConfiguration",
      "ShieldContent.plist",
    );
    expect(existsSync(contentPath), "ShieldContent.plist must be bundled in the target").toBe(
      true,
    );

    const content = plist.parse(readUtf8(contentPath)) as Record<
      string,
      Record<string, string> | undefined
    >;
    expect(Object.keys(content).sort()).toEqual([...CAUSES].sort());

    CAUSES.forEach((cause) => {
      const variant = content[cause];
      expect(Object.keys(variant ?? {}).sort()).toEqual([
        "deepLink",
        "primaryActionLabel",
        "secondaryActionLabel",
        "subtitle",
        "title",
      ]);
      expect(variant?.deepLink).toBe(DEEP_LINKS[cause]);
      // Only lockWindow ships an empty secondary label; the extension drops it for that cause.
      expect(variant?.title).not.toBe("");
      expect(variant?.subtitle).not.toBe("");
      expect(variant?.primaryActionLabel).not.toBe("");
      expect(variant?.secondaryActionLabel === "").toBe(cause === "lockWindow");
    });
  });

  it("renders only cause content with the approved light treatment", () => {
    const targetRoot = fromRoot("app-next", "targets", "ShieldConfiguration");
    const swift = walkFiles(targetRoot, new Set([".swift"]))
      .map(readUtf8)
      .join("\n");

    expect(swift).toContain("ShieldContent.plist");
    expect(swift).toContain("excerlock.shield.current-cause.v1");
    expect(swift).toContain("excerlock.shield.runtime-context.v1");
    expect(swift).toContain("excerlock.shield.copy-overrides.v1");
    expect(swift).toContain(
      "let contextual = applyingRuntimeContext(to: fallback, cause: cause)",
    );
    expect(swift).toContain(
      "let copyOverridden = applyingCopyOverride(to: contextual, cause: cause)",
    );
    expect(swift).toContain("F4F1F5");
    expect(swift).toContain("C9C4CC");
    expect(swift).toContain("F98529");
    expect(swift).toContain("ClayLockBody");
    expect(swift).toContain("ClayLockShackle");
    expect(swift).not.toContain("resolved.primaryActionLabel =");
    expect(swift).not.toContain("resolved.secondaryActionLabel =");
    expect(swift).not.toContain("resolved.deepLink =");
    expect(swift).toContain('primaryActionLabel: "Close"');
    expect(swift).toContain("secondaryActionLabel: nil");
    expect(swift).not.toMatch(
      /localizedDisplayName|application\.token|webDomain\.domain/,
    );
  });

  it("routes only the primary shield action through a silent local notification", () => {
    const targetRoot = fromRoot("app-next", "targets", "ShieldAction");
    const swift = walkFiles(targetRoot, new Set([".swift"]))
      .map(readUtf8)
      .join("\n");
    const route = readUtf8(
      fromRoot("app-next", "targets", "ShieldAction", "ShieldActionRoute.swift"),
    );

    expect(swift).toContain("UNUserNotificationCenter");
    expect(swift).toContain(
      'forInfoDictionaryKey: "REACT_NATIVE_DEVICE_ACTIVITY_APP_GROUP"',
    );
    expect(swift).not.toContain('forInfoDictionaryKey: "EXPO_APP_GROUP"');
    expect(swift).toContain('"url": deepLink');
    expect(swift).toContain("action == .primaryButtonPressed");
    expect(swift).toContain("route.routeHomeAvailable");
    expect(swift).toContain('route.cause != "lockWindow"');
    expect(swift).toContain("content.sound = nil");
    expect(swift).not.toContain("interruptionLevel = .passive");
    expect(route).not.toContain("copyOverridesDefaultsKey");
    expect(route).not.toContain('context["deepLink"]');
    expect(swift).not.toMatch(
      /localizedDisplayName|Application\(token:|WebDomain\(token:|application\.token|webDomain\.domain/,
    );
  });

  it("keeps the app-group writer and the monitor hook wired to the extensions", () => {
    // ScreenTimeAdapter is the writer, over engine/shield's transport. This
    // asserts the transport, the plugin hook and the per-monitor key, which are
    // what the extensions actually read.
    const publisher = readUtf8(
      fromRoot(
        "app-next",
        "src",
        "engine",
        "shield",
        "native",
        "nativeShieldContentPublisher.ts",
      ),
    );
    const keys = readUtf8(
      fromRoot(
        "app-next",
        "src",
        "engine",
        "shield",
        "ShieldContentPublisher.ts",
      ),
    );
    const screenTimePlugin = readUtf8(
      fromRoot("app-next", "plugins", "withScreenTimeExtensionValidation.js"),
    );

    expect(publisher).toContain("react-native-device-activity");
    expect(keys).toContain("excerlock.shield.current-cause.v1");
    expect(keys).toContain("excerlock.shield.runtime-context.v1");
    expect(keys).toContain("excerlock.shield.copy-overrides.v1");
    expect(screenTimePlugin).toContain(
      "publishLockWindowShieldContext(activityName: activity.rawValue)",
    );

    // One shield per monitor (B36) is the adapter's to publish, from the domain's copy: the
    // scheduler registers windows and writes no content of its own.
    const perMonitor = readUtf8(
      fromRoot("app-next", "src", "adapters", "screentime", "appGroup.ts"),
    );
    const scheduler = readUtf8(
      fromRoot(
        "app-next",
        "src",
        "engine",
        "screentime",
        "native",
        "NativeShieldScheduler.ts",
      ),
    );
    expect(perMonitor).toContain("excerlock.shield.lock-window-contexts.v1");
    expect(scheduler).not.toContain("excerlock.shield.");

    const monitor = readUtf8(
      fromRoot(
        "app-next",
        "targets",
        "DeviceActivityMonitorExtension",
        "DeviceActivityMonitorExtension.generated.swift",
      ),
    );
    const lockWindowContext = readUtf8(
      fromRoot(
        "app-next",
        "targets",
        "DeviceActivityMonitorExtension",
        "ShieldLockWindowContext.swift",
      ),
    );
    expect(monitor).toContain("publishLockWindowShieldContext(activityName:");
    expect(lockWindowContext).toContain(
      '"excerlock.shield.current-cause.v1"',
    );
    expect(lockWindowContext).toContain(
      '"excerlock.shield.runtime-context.v1"',
    );
  });
});
