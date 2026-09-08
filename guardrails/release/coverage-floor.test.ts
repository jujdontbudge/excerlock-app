import { describe, expect, it } from "vitest";

import { fromRoot, readJson, readUtf8 } from "../repo-files";
import {
  fromReleaseApp,
  readReleasePackageJson,
  releaseAppDir,
  type PackageJson,
} from "./release-app";

describe("Domain coverage floor is enforced, not advisory", () => {
  const rootPackage = readJson<PackageJson>(fromRoot("package.json"));
  const appPackage = readReleasePackageJson();
  const jestConfig = readUtf8(fromReleaseApp("jest.config.js"));
  const workflow = readUtf8(fromRoot(".github", "workflows", "ci.yml"));

  it("declares 100 % branch coverage on src/domain in jest.config.js", () => {
    expect(jestConfig).toMatch(/coverageThreshold:\s*\{\s*'\.\/src\/domain\/':\s*\{\s*branches:\s*100\s*\}\s*\}/);
  });

  it("collects coverage on every test run of the release app", () => {
    expect(appPackage.scripts?.test).toMatch(/\bjest\b.*--coverage/);
  });

  it("runs the release app's suite first in the root unit script", () => {
    const script = rootPackage.scripts?.["test:unit"] ?? "";
    const appTarget = releaseAppDir === "app-next" ? "test:app-next" : "test:app";

    expect(script.startsWith(`npm run ${appTarget}`), script).toBe(true);
    expect(rootPackage.scripts?.[appTarget]).toBe(`npm run test --workspace ${releaseAppDir}`);
  });

  it("is exercised by CI on every push and pull request", () => {
    expect(workflow).toMatch(/pull_request:/);
    expect(workflow).toMatch(/run: npm run typecheck/);
    expect(workflow).toMatch(/run: npm run test:unit/);
    expect(workflow).toMatch(/run: npm run test:release-guardrails/);
    expect(workflow).toMatch(/run: npm run test:guardrails/);
  });
});
