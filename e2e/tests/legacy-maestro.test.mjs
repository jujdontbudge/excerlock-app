import assert from "node:assert/strict";
import { readdir, readFile } from "node:fs/promises";
import { test } from "node:test";

const LEGACY_ROOT = new URL("../../.maestro/", import.meta.url);

test(".maestro cannot launch the retired development-client suite", async () => {
  const [entries, readme] = await Promise.all([
    readdir(LEGACY_ROOT),
    readFile(new URL("README.md", LEGACY_ROOT), "utf8"),
  ]);

  assert.deepEqual(
    entries.filter((entry) => entry.endsWith(".yaml")),
    [],
  );
  assert.match(readme, /canonical suite lives in `e2e\/`/i);
  assert.match(readme, /e2e\/scripts\/run-suite\.sh/);
  assert.match(readme, /release-style simulator build/i);
  assert.doesNotMatch(readme, /development client/i);
  assert.doesNotMatch(readme, /scripts\/e2e-loop\.sh/);
});
