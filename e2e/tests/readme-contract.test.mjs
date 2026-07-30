import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { test } from "node:test";

const README = new URL("../README.md", import.meta.url);

test("README gives an honest, executable simulator handoff", async () => {
  const readme = await readFile(README, "utf8");

  assert.match(readme, /authored and statically validated/i);
  assert.match(readme, /not.*executed.*simulator/i);
  assert.match(readme, /Maestro 2\.6\.1/);
  assert.match(readme, /no `ExcerLock-E2E` simulator/i);
  assert.match(
    readme,
    /eas build --profile e2e --platform ios --local/,
  );
  assert.match(readme, /developmentClient/);
  assert.match(readme, /APP_BINARY=.*run-suite\.sh/);
  assert.match(readme, /run-suite\.sh --flow flows\/locked-apps-states\.yaml/);
  assert.match(readme, /node --test e2e\/tests\/\*\.test\.mjs/);
  assert.match(readme, /maestro check-syntax/);
  assert.match(readme, /Unknown scenario names still fail/i);
  assert.doesNotMatch(readme, /the app does not exist/i);
  assert.doesNotMatch(readme, /Status: skeleton/i);
});
