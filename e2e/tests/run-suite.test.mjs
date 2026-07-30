import assert from "node:assert/strict";
import { chmod, cp, mkdir, mkdtemp, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawn } from "node:child_process";
import { test } from "node:test";

const E2E_ROOT = new URL("../", import.meta.url);

test("run-suite resolves one flow and invokes Maestro with loop artifacts", async () => {
  const root = await mkdtemp(join(tmpdir(), "excerlock-e2e-runner-"));
  const e2e = join(root, "e2e");
  const bin = join(root, "bin");
  const log = join(root, "maestro-args.txt");
  await Promise.all([
    mkdir(join(e2e, "scripts"), { recursive: true }),
    mkdir(join(e2e, "flows"), { recursive: true }),
    mkdir(bin, { recursive: true }),
  ]);
  await Promise.all([
    cp(
      new URL("scripts/run-suite.sh", E2E_ROOT),
      join(e2e, "scripts", "run-suite.sh"),
    ),
    cp(
      new URL("flows/manage-condition.yaml", E2E_ROOT),
      join(e2e, "flows", "manage-condition.yaml"),
    ),
    executable(
      join(bin, "xcrun"),
      "#!/bin/sh\nprintf '{\"devices\":[]}'\n",
    ),
    executable(
      join(bin, "jq"),
      "#!/bin/sh\ncat >/dev/null\nprintf 'Booted\\n'\n",
    ),
    executable(
      join(bin, "maestro"),
      `#!/bin/sh
if [ "\${1:-}" = "--version" ]; then
  printf '2.7.0\\n'
  exit 0
fi
printf '%s\\n' "$@" > "$MAESTRO_LOG"
while [ "$#" -gt 0 ]; do
  if [ "$1" = "--output" ]; then
    printf '<testsuite failures="0"/>\\n' > "$2"
    exit 0
  fi
  shift
done
exit 0
`,
    ),
  ]);

  const result = await run(join(e2e, "scripts", "run-suite.sh"), {
    E2E_UDID: "SIM-UDID",
    MAESTRO_LOG: log,
    PATH: `${bin}:${process.env.PATH ?? ""}`,
  });
  assert.equal(result.code, 0, result.stderr);
  assert.match(result.stdout, /run-suite: GREEN/);

  const args = (await readFile(log, "utf8")).trim().split("\n");
  assert.deepEqual(args.slice(0, 2), [
    "test",
    join(e2e, "flows", "manage-condition.yaml"),
  ]);
  assert.ok(args.includes("--include-tags=manage"));
  assert.ok(args.includes("--exclude-tags=visual,wip"));
  assert.ok(args.includes(join(e2e, "out", "report.xml")));
  assert.ok(args.includes(join(e2e, "out", "artifacts")));
  assert.ok(args.includes(join(e2e, "out", "debug")));
  assert.ok(args.includes("--udid"));
  assert.ok(args.includes("SIM-UDID"));
});

async function executable(path, contents) {
  await writeFile(path, contents);
  await chmod(path, 0o755);
}

function run(script, env) {
  return new Promise((resolve, reject) => {
    const child = spawn(
      "bash",
      [script, "--flow", "flows/manage-condition.yaml", "--tags", "manage"],
      { env: { ...process.env, ...env } },
    );
    let stdout = "";
    let stderr = "";
    child.stdout.on("data", (chunk) => {
      stdout += chunk;
    });
    child.stderr.on("data", (chunk) => {
      stderr += chunk;
    });
    child.on("error", reject);
    child.on("close", (code) => resolve({ code, stdout, stderr }));
  });
}
