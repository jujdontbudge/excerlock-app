import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { readFile } from "node:fs/promises";
import { test } from "node:test";
import { fileURLToPath } from "node:url";

const script = new URL("../scripts/run-suite.sh", import.meta.url);

test("retired UI runner fails closed without resolving any simulator or driver", async () => {
  const source = await readFile(script, "utf8");
  // Only shell builtins are permitted: no tool discovery, driver, or device calls.
  const commands = source.split("\n").filter((line) => line.trim() && !line.startsWith("#"));
  assert.equal(commands.length, 3);
  assert.equal(commands[0], "set -euo pipefail");
  assert.match(commands[1], /^printf /);
  assert.equal(commands[2], "exit 2");
  for (const args of [[], ["--flow", "flows/manage-condition.yaml"], ["--help"]]) {
    const result = spawnSync("/bin/bash", [fileURLToPath(script), ...args], {
      env: { PATH: "/nonexistent" }, encoding: "utf8",
    });
    assert.equal(result.status, 2);
    assert.equal(result.stdout, "");
    assert.match(result.stderr, /Maestro is banned/);
    assert.match(result.stderr, /headless xcrun simctl \+ idb/);
  }
});
