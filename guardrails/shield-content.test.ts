import { existsSync } from "node:fs";
import plist from "@expo/plist";
import { describe, expect, it } from "vitest";

import { fromRoot, readUtf8 } from "./repo-files";

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
});
