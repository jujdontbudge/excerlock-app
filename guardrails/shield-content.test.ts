import { existsSync } from "node:fs";
import plist from "@expo/plist";
import { describe, expect, it } from "vitest";

import { fromRoot, readUtf8, walkFiles } from "./repo-files";

import { shieldContent } from "../app-next/src/domain/shieldContent";
import type { UnlockHint } from "../app-next/src/domain/types";

/**
 * The plist is the extension's cold-start fallback: what a shield shows before the app has ever
 * published a snapshot into the app group. It must therefore be the same words the domain would
 * publish, which is what this derives. `balanceEmpty` belonged to the retired balance economy and
 * is never published any more, so it falls back to the plain locked copy; `lockWindow` ships no
 * secondary label because ShieldConfigurationExtension drops it for that cause.
 */
const variant = (
  cause: Parameters<typeof shieldContent>[0]["cause"],
  deepLink: string,
  secondaryActionLabel?: string,
) => {
  const content = shieldContent({ cause, goal: "pending", canNotify: true });
  return {
    deepLink,
    primaryActionLabel: content.primary,
    secondaryActionLabel: secondaryActionLabel ?? content.secondary ?? "",
    subtitle: content.subtitle,
    title: content.title,
  };
};

describe("Screen Time shield content", () => {
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

    const content = plist.parse(readUtf8(contentPath));
    expect(content).toEqual({
      balanceEmpty: variant("locked", "excerlock://"),
      fullLock: variant("locked", "excerlock://locked-apps"),
      lockWindow: variant("lockWindow", "excerlock://locked-apps", ""),
      walkAndScrollEnded: variant("walkingEnded", "excerlock://"),
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
  it("keeps every publishable subtitle past the extension's numeric-copy filter", () => {
    // ShieldContent.swift drops a subtitle containing any of these and falls back to the plist,
    // silently. The list is read from the Swift so a word added there fails here instead.
    const swift = readUtf8(
      fromRoot("app-next", "targets", "ShieldConfiguration", "ShieldContent.swift"),
    );
    const declaration = /let forbidden = \[([^\]]*)\]/.exec(swift);
    expect(declaration, "ShieldContent.swift must still declare the forbidden list").not.toBeNull();
    const forbidden = [...declaration![1].matchAll(/"([^"]+)"/g)].map((match) => match[1]);
    expect(forbidden.length).toBeGreaterThan(0);

    const units = ["steps", "minutes", "km", "mi"];
    const hints: (UnlockHint | undefined)[] = [
      undefined,
      { ruleId: "r", action: "walk", remaining: 1, goal: null, unit: null },
      { ruleId: "r", action: "arrive", remaining: null, goal: null, unit: null },
      ...units.map((unit): UnlockHint => ({
        ruleId: "r",
        action: "progress",
        remaining: 2500,
        goal: 10000,
        unit,
      })),
    ];
    const causes = ["locked", "lockWindow", "walkingEnded"] as const;

    const rejected = causes.flatMap((cause) =>
      hints.flatMap((hint) =>
        (["pending", "met"] as const).flatMap((goal) =>
          [true, false]
            .map((canNotify) => shieldContent({ cause, hint, goal, canNotify }).subtitle)
            .filter((subtitle) =>
              forbidden.some((word) => subtitle.toLowerCase().includes(word)),
            ),
        ),
      ),
    );

    expect(rejected, "a subtitle the extension would silently discard").toEqual([]);
  });
});
