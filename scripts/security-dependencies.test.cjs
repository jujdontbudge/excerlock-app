const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const root = JSON.parse(
  fs.readFileSync(path.join(__dirname, "..", "package-lock.json"), "utf8"),
);
const server = JSON.parse(
  fs.readFileSync(
    path.join(__dirname, "..", "server", "package-lock.json"),
    "utf8",
  ),
);
const ciWorkflow = fs.readFileSync(
  path.join(__dirname, "..", ".github", "workflows", "ci.yml"),
  "utf8",
);
const deployScript = fs.readFileSync(
  path.join(__dirname, "..", "deploy", "deploy.sh"),
  "utf8",
);

function versionAtLeast(version, minimum) {
  const parse = (value) => value.split(".").map((part) => Number(part));
  const actual = parse(version);
  const expected = parse(minimum);
  return expected.every(
    (part, index) =>
      actual[index] > part ||
      (actual[index] === part &&
        actual.slice(index + 1).some((value, offset) => value > expected[index + 1 + offset])),
  ) || version === minimum;
}

test("production URL parsing dependency is patched", () => {
  const version = root.packages["node_modules/decode-uri-component"]?.version;
  assert.ok(version, "decode-uri-component must be present in the lockfile");
  assert.equal(versionAtLeast(version, "0.5.0"), true, version);
});

test("backend production URI dependencies are patched", () => {
  const versions = [
    server.packages["node_modules/fast-uri"]?.version,
    server.packages["node_modules/fast-json-stringify/node_modules/fast-uri"]?.version,
  ];
  assert.deepEqual(versions, ["3.1.8", "4.2.1"]);
});

test("all Vitest packages include the patched mocker", () => {
  for (const [label, lockfile] of [
    ["root", root],
    ["server", server],
  ]) {
    const vulnerable = Object.entries(lockfile.packages)
      .filter(([packagePath]) =>
        /(?:^|\/)(?:vitest|@vitest\/mocker)$/.test(packagePath),
      )
      .filter(([, packageInfo]) => !versionAtLeast(packageInfo.version, "4.1.11"))
      .map(([packagePath, packageInfo]) => `${label}:${packagePath}@${packageInfo.version}`);
    assert.deepEqual(vulnerable, []);
  }
});

test("all locked Nano ID copies include the zero-size loop fix", () => {
  for (const [label, lockfile] of [
    ["root", root],
    ["server", server],
  ]) {
    const versions = Object.entries(lockfile.packages)
      .filter(([packagePath]) => packagePath.endsWith("node_modules/nanoid"))
      .map(([, packageInfo]) => packageInfo.version);
    assert.ok(versions.length > 0, `${label} must lock nanoid`);
    assert.equal(
      versions.every((version) => versionAtLeast(version, "3.3.18")),
      true,
      `${label}: ${versions.join(", ")}`,
    );
  }
});

test("no locked JSON-RPC client resolves the quadratic stream-json parser", () => {
  for (const [label, lockfile] of [
    ["root", root],
    ["server", server],
  ]) {
    const entries = Object.entries(lockfile.packages);
    const streamJson = entries
      .filter(([packagePath]) => packagePath.endsWith("node_modules/stream-json"))
      .map(([packagePath, packageInfo]) => `${label}:${packagePath}@${packageInfo.version}`);
    assert.deepEqual(streamJson, []);

    const jayson = entries.filter(([packagePath]) =>
      packagePath.endsWith("node_modules/jayson"),
    );
    if (label === "root") {
      assert.ok(jayson.length > 0, "root must lock jayson");
    }
    const vulnerable = jayson
      .filter(([, packageInfo]) => Number(packageInfo.version.split(".")[0]) < 5)
      .map(([packagePath, packageInfo]) => `${label}:${packagePath}@${packageInfo.version}`);
    assert.deepEqual(vulnerable, []);
  }
});

test("every locked uuid copy has the v3/v5/v6 buffer bounds check", () => {
  const versions = Object.entries(root.packages)
    .filter(([packagePath]) => packagePath.endsWith("node_modules/uuid"))
    .map(([, packageInfo]) => packageInfo.version);
  assert.ok(versions.length > 0, "root must lock uuid");
  assert.deepEqual(
    versions.filter((version) => Number(version.split(".")[0]) < 11),
    [],
    versions.join(", "),
  );
});

test("no lockfile nests the pre-0.25 esbuild development server", () => {
  for (const [label, lockfile] of [
    ["root", root],
    ["server", server],
  ]) {
    const stale = Object.entries(lockfile.packages)
      .filter(([packagePath]) => /(?:^|\/)node_modules\/esbuild$/.test(packagePath))
      .filter(([, packageInfo]) => {
        const [major, minor] = packageInfo.version.split(".").map(Number);
        return major === 0 && minor < 25;
      })
      .map(([packagePath, packageInfo]) => `${label}:${packagePath}@${packageInfo.version}`);
    assert.deepEqual(stale, []);
  }
});

test("CI actions are pinned to reviewed immutable commits", () => {
  assert.match(
    ciWorkflow,
    /actions\/checkout@11bd71901bbe5b1630ceea73d27597364c9af683/g,
  );
  assert.match(
    ciWorkflow,
    /actions\/setup-node@49933ea5288caeca8642d1e84afbd3f7d6820020/g,
  );
  assert.doesNotMatch(ciWorkflow, /actions\/(?:checkout|setup-node)@v\d+/);
});

test("production deploy SSH requires a pre-verified host key", () => {
  assert.match(deployScript, /StrictHostKeyChecking=yes/g);
  assert.doesNotMatch(deployScript, /StrictHostKeyChecking=accept-new/);
});
