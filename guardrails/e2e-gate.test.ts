import { spawnSync } from "node:child_process";
import {
  mkdtempSync,
  readFileSync,
  rmSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

import { fromRoot, readJson, walkFiles } from "./repo-files";

const E2E_SURFACE_MARKER = "screen-e2e-error";

type EasConfig = {
  build?: {
    development?: {
      developmentClient?: boolean;
      distribution?: string;
      env?: Record<string, string>;
      ios?: { simulator?: boolean };
      withoutCredentials?: boolean;
    };
    e2e?: {
      developmentClient?: boolean;
      env?: Record<string, string>;
      ios?: { simulator?: boolean };
      withoutCredentials?: boolean;
    };
  };
};

function exportIosBundle(e2e: boolean): string {
  const output = mkdtempSync(
    join(tmpdir(), `excerlock-${e2e ? "e2e" : "production"}-`),
  );
  const environment = { ...process.env };
  delete environment.EXPO_PUBLIC_E2E;
  if (e2e) {
    environment.EXPO_PUBLIC_E2E = "1";
  }
  environment.CI = "1";
  environment.EXPO_NO_DOTENV = "1";

  try {
    const result = spawnSync(
      fromRoot("node_modules", ".bin", "expo"),
      [
        "export",
        "--platform",
        "ios",
        "--output-dir",
        output,
        "--clear",
        "--no-bytecode",
        "--max-workers",
        "2",
      ],
      {
        cwd: fromRoot("app"),
        encoding: "utf8",
        env: environment,
      },
    );

    expect(
      result.status,
      [result.stdout, result.stderr].filter(Boolean).join("\n"),
    ).toBe(0);
    return walkFiles(output, new Set([".js"]))
      .map((path) => readFileSync(path, "utf8"))
      .join("\n");
  } finally {
    rmSync(output, { recursive: true, force: true });
  }
}

describe("E2E build gate", () => {
  it("keeps physical-device smoke on a signed native development client", () => {
    const config = readJson<EasConfig>(
      fromRoot("app", "eas.json"),
    );

    expect(config.build?.development).toEqual({
      developmentClient: true,
      distribution: "internal",
      env: { EXPO_PUBLIC_E2E: "0" },
      ios: { simulator: false },
    });
    expect(config.build?.development?.withoutCredentials).not.toBe(true);
  });

  it("pins a release-style simulator profile to the build-time flag", () => {
    const config = readJson<EasConfig>(
      fromRoot("app", "eas.json"),
    );

    expect(config.build?.e2e).toEqual({
      env: { EXPO_PUBLIC_E2E: "1" },
      ios: { simulator: true },
      withoutCredentials: true,
    });
    expect(config.build?.e2e?.developmentClient).not.toBe(true);
  });

  it(
    "eliminates the E2E surface from a production bundle",
    () => {
      const productionBundle = exportIosBundle(false);
      const e2eBundle = exportIosBundle(true);

      expect(
        e2eBundle.includes(E2E_SURFACE_MARKER),
        "The E2E export did not contain its scenario error surface",
      ).toBe(true);
      expect(
        productionBundle.includes(E2E_SURFACE_MARKER),
        "The production export retained the E2E scenario surface",
      ).toBe(false);
    },
    // Each assertion exports a full iOS bundle; two sequential Expo exports
    // can exceed three minutes on a cold Metro cache.
    600_000,
  );
});
