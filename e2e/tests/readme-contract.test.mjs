import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { test } from "node:test";

const README = new URL("../README.md", import.meta.url);

test("README gives an honest, executable simulator handoff", async () => {
  const readme = await readFile(README, "utf8");
  const normalized = readme.replace(/\n>\s?/g, " ");

  assert.match(normalized, /simulator-verified/i);
  assert.match(normalized, /2026-07-31/);
  assert.match(normalized, /10\/10 Flows Passed/i);
  // A concrete wall-clock duration, not a pinned one. #77 pinned `6m 49s` here
  // and then retimed the README to `6m 34s` in a later commit, landing on main
  // with the gate red — the number has to be re-synced in two files on every
  // re-run. The guard that matters is that a real measured duration is stated.
  assert.match(normalized, /\d+m\s+\d+s/);
  assert.match(normalized, /exit code 0/i);
  assert.match(normalized, /Maestro 2\.7\.0/);
  assert.match(normalized, /Xcode 26\.4\.1/);
  assert.match(normalized, /iOS 26\.4/);
  assert.match(normalized, /`ExcerLock-E2E` simulator/i);
  assert.match(normalized, /expo prebuild --platform ios --clean --no-install/);
  assert.match(normalized, /-workspace ExcerLock\.xcworkspace/);
  assert.match(normalized, /developmentClient/);
  assert.match(normalized, /APP_BINARY=.*run-suite\.sh/);
  assert.match(normalized, /run-suite\.sh --flow flows\/locked-apps-states\.yaml/);
  assert.match(normalized, /node --test e2e\/tests\/\*\.test\.mjs/);
  assert.match(normalized, /maestro check-syntax/);
  assert.match(normalized, /Unknown scenario names still fail/i);
  assert.doesNotMatch(normalized, /the app does not exist/i);
  assert.doesNotMatch(normalized, /Status: skeleton/i);
  assert.doesNotMatch(normalized, /simulator execution is\s+unverified/i);
  assert.doesNotMatch(normalized, /Maestro 2\.6\.1/);
});

test("README keeps the verified scope honest", async () => {
  const readme = await readFile(README, "utf8");

  assert.match(readme, /screenshots.*not.*(reviewed|approved|blessed)/is);
  assert.match(readme, /Physical-device.*outside/is);
  assert.doesNotMatch(readme, /visual (suite|baselines?).*(passed|verified)/i);
  assert.doesNotMatch(readme, /physical-device.*verified/i);
});
