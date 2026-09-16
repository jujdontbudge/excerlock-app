import { describe, expect, it } from "vitest";

import {
  SHIELD_COPY_CAUSES,
  SHIELD_COPY_OVERRIDES_KEY,
} from "../app-next/src/runtime/shield/shieldCopyOverrides";
import { fromRoot, readUtf8 } from "./repo-files";

const capture = (source: string, pattern: RegExp) => pattern.exec(source)?.[1];

describe("remote shield copy rail", () => {
  it("pins one App Group key across the extension reader, the native writer and TypeScript", () => {
    const swiftReader = readUtf8(
      fromRoot(
        "app-next",
        "targets",
        "ShieldConfiguration",
        "ShieldContent.swift",
      ),
    );
    const swiftWriter = readUtf8(
      fromRoot(
        "app-next",
        "modules",
        "excerlock-enforcement",
        "ios",
        "ShieldCopyOverrides.swift",
      ),
    );
    const swiftModule = readUtf8(
      fromRoot(
        "app-next",
        "modules",
        "excerlock-enforcement",
        "ios",
        "ExcerlockEnforcementModule.swift",
      ),
    );

    const readerKey = capture(swiftReader, /copyOverridesKey = "([^"]+)"/);
    const writerKey = capture(
      swiftWriter,
      /excerlockShieldCopyOverridesDefaultsKey = "([^"]+)"/,
    );
    expect(readerKey).toBe("excerlock.shield.copy-overrides.v1");
    expect(writerKey).toBe(readerKey);
    expect(SHIELD_COPY_OVERRIDES_KEY).toBe(readerKey);

    expect(swiftModule).toContain('AsyncFunction("setShieldCopyOverrides")');
    expect(swiftModule).toContain(
      "ShieldCopyOverrides.write(json, defaults: defaults)",
    );
    expect(swiftModule).toContain("UserDefaults(suiteName: excerlockAppGroup)");
  });

  it("keeps the TypeScript cause allow-list equal to the Swift ShieldCause enum", () => {
    const swiftReader = readUtf8(
      fromRoot(
        "app-next",
        "targets",
        "ShieldConfiguration",
        "ShieldContent.swift",
      ),
    );
    const enumBody =
      /enum ShieldCause[^{]*\{([^}]*)\}/.exec(swiftReader)?.[1] ?? "";
    const swiftCauses = [...enumBody.matchAll(/case\s+(\w+)/g)]
      .map((match) => match[1])
      .sort();
    expect(swiftCauses.length).toBeGreaterThan(0);
    expect([...SHIELD_COPY_CAUSES].sort()).toEqual(swiftCauses);
  });

  it("reads the payload flag through the allow-listed controller and writes it on foreground", () => {
    const nativeInterface = readUtf8(
      fromRoot(
        "app-next",
        "modules",
        "excerlock-enforcement",
        "src",
        "ExcerlockEnforcementModule.ts",
      ),
    );
    expect(nativeInterface).toContain("setShieldCopyOverrides");
    expect(nativeInterface).toContain("ShieldCopyOverridesJson");

    const adapter = readUtf8(
      fromRoot(
        "app-next",
        "src",
        "runtime",
        "analytics",
        "PostHogAnalyticsAdapter.ts",
      ),
    );
    expect(adapter).toContain("allowedPayloadFlags = { shield_copy: true }");

    expect(
      readUtf8(fromRoot("app-next", "src", "runtime", "createRealRuntime.ts")),
    ).toContain("createShieldCopyWriter");
    expect(
      readUtf8(
        fromRoot("app-next", "src", "runtime", "NativeRuntimeEffects.tsx"),
      ),
    ).toContain("runtime.shieldCopy?.sync()");
  });
});
