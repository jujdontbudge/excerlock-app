import { existsSync } from "node:fs";
import plist from "@expo/plist";
import { describe, expect, it } from "vitest";

import { fromRoot, readUtf8, walkFiles } from "./repo-files";

describe("Screen Time shield content", () => {
  it("ships the four cause-keyed variants with their matching app surfaces", () => {
    const contentPath = fromRoot(
      "app",
      "targets",
      "ShieldConfiguration",
      "ShieldContent.plist",
    );
    expect(existsSync(contentPath), "ShieldContent.plist must be bundled in the target").toBe(
      true,
    );

    const content = plist.parse(readUtf8(contentPath));
    expect(content).toEqual({
      balanceEmpty: {
        deepLink: "excerlock://",
        primaryActionLabel: "Open ExcerLock",
        secondaryActionLabel: "Close",
        subtitle: "A 20-min walk gets you 30 more minutes.",
        title: "Time’s up — for now.",
      },
      fullLock: {
        deepLink: "excerlock://locked-apps",
        primaryActionLabel: "Open ExcerLock",
        secondaryActionLabel: "Close",
        subtitle: "A 20-min walk gets you 30 more minutes.",
        title: "Move first, scroll after.",
      },
      lockWindow: {
        deepLink: "excerlock://locked-apps",
        primaryActionLabel: "Open ExcerLock",
        secondaryActionLabel: "Close",
        subtitle: "Back at 7:00 AM.",
        title: "Apps are asleep.",
      },
      walkAndScrollEnded: {
        deepLink: "excerlock://",
        primaryActionLabel: "Open ExcerLock",
        secondaryActionLabel: "Close",
        subtitle: "Start walking again to pick up where you left off.",
        title: "You stopped walking.",
      },
    });
  });

  it("renders only cause content with the approved light treatment", () => {
    const targetRoot = fromRoot("app", "targets", "ShieldConfiguration");
    const swift = walkFiles(targetRoot, new Set([".swift"]))
      .map(readUtf8)
      .join("\n");

    expect(swift).toContain("ShieldContent.plist");
    expect(swift).toContain("excerlock.shield.current-cause.v1");
    expect(swift).toContain("excerlock.shield.runtime-context.v1");
    expect(swift).toContain("excerlock.shield.copy-overrides.v1");
    expect(swift).toContain("F4F1F5");
    expect(swift).toContain("C9C4CC");
    expect(swift).toContain("F98529");
    expect(swift).toContain("ClayLockBody");
    expect(swift).toContain("ClayLockShackle");
    expect(swift).not.toMatch(
      /localizedDisplayName|application\.token|webDomain\.domain/,
    );
  });

  it("routes only the primary shield action through a silent local notification", () => {
    const targetRoot = fromRoot("app", "targets", "ShieldAction");
    const swift = walkFiles(targetRoot, new Set([".swift"]))
      .map(readUtf8)
      .join("\n");

    expect(swift).toContain("UNUserNotificationCenter");
    expect(swift).toContain('"url": deepLink');
    expect(swift).toContain("action == .primaryButtonPressed");
    expect(swift).toContain("content.sound = nil");
    expect(swift).not.toContain("interruptionLevel = .passive");
    expect(swift).not.toMatch(
      /localizedDisplayName|Application\(token:|WebDomain\(token:|application\.token|webDomain\.domain/,
    );
  });
});
