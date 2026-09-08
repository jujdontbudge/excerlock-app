import { describe, expect, it } from "vitest";

import { fromRoot, readUtf8, repoRelative, walkFiles } from "./repo-files";

const CODE_EXTENSIONS = new Set([".ts", ".tsx"]);

const LEGACY_NAMES =
  /\b(LEGACY_FLOW_SCREENS|isLegacyFlowScreen|LegacyFlowScreen|LegacyPropsOf|LegacyTrackOnboardingScreen|LegacyTrackOnboardingAnswer)\b/;

/** The module itself, its one re-export, and this test. Everything else must be under `app/`. */
const ALLOWED_OUTSIDE_APP = new Set([
  "packages/analytics-events/src/legacy.ts",
  "packages/analytics-events/index.ts",
  "guardrails/legacy-analytics.test.ts",
]);

/** The rail `app/` renders, which the rebuilt registry deliberately no longer describes. */
const RETIRED_SCREENS = [
  "value-prop",
  "confession",
  "mirror",
  "permissions-primer",
  "pick-apps",
  "paywall",
  "sign-up",
];

/**
 * `packages/analytics-events/src/legacy.ts` exists for one reason: the legacy `app/` workspace
 * renders the retired seven-screen onboarding rail and must keep compiling against the registry
 * P2-T07 rebuilt around the new one. It is deleted with `app/` (see `P2-T12-cutover.md`), so
 * nothing outside `app/` may grow a dependency on it in the meantime, and the shipping union must
 * never absorb the retired ids instead.
 */
describe("the retired FLOW rail stays inside app/", () => {
  it("is used by app/ and by nothing else", () => {
    const strays = walkFiles(fromRoot(), CODE_EXTENSIONS)
      .map(repoRelative)
      .filter((path) => !path.startsWith("app/"))
      .filter((path) => !ALLOWED_OUTSIDE_APP.has(path))
      .filter((path) => LEGACY_NAMES.test(readUtf8(fromRoot(path))));

    expect(
      strays,
      "only app/ may import the legacy rail — it is deleted with that workspace",
    ).toEqual([]);
  });

  it("did not widen the shipping screen union", () => {
    const flow = readUtf8(fromRoot("packages/analytics-events/src/flow.ts"));
    const absorbed = RETIRED_SCREENS.filter((screen) => flow.includes(`'${screen}'`));

    expect(absorbed, "FLOW_SCREENS is the shipping rail only").toEqual([]);
  });
});
