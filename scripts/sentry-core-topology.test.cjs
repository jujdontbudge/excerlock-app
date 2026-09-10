const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { createRequire } = require('node:module');
const { test } = require('node:test');

const root = path.resolve(__dirname, '..');
const exactVersion = /^\d+\.\d+\.\d+$/;

function readManifest(manifestPath) {
  return JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
}

function findManifest(packageName, fromManifest = path.join(root, 'package.json')) {
  const requireFromOwner = createRequire(fromManifest);
  try {
    return requireFromOwner.resolve(`${packageName}/package.json`);
  } catch (error) {
    if (error.code !== 'ERR_PACKAGE_PATH_NOT_EXPORTED') throw error;
    let directory = path.dirname(requireFromOwner.resolve(packageName));
    while (directory !== path.dirname(directory)) {
      const candidate = path.join(directory, 'package.json');
      if (fs.existsSync(candidate) && readManifest(candidate).name === packageName) return candidate;
      directory = path.dirname(directory);
    }
    throw error;
  }
}

function sentryCoreOwners(sdkName) {
  const pending = [findManifest(sdkName)];
  const visited = new Set();
  const owners = [];

  while (pending.length > 0) {
    const manifestPath = fs.realpathSync(pending.pop());
    if (visited.has(manifestPath)) continue;
    visited.add(manifestPath);
    const manifest = readManifest(manifestPath);
    if (manifest.dependencies?.['@sentry/core']) owners.push({ manifest, manifestPath });
    for (const dependency of Object.keys(manifest.dependencies ?? {})) {
      if ((dependency.startsWith('@sentry/') || dependency.startsWith('@sentry-internal/')) && dependency !== '@sentry/core') {
        pending.push(findManifest(dependency, manifestPath));
      }
    }
  }

  return owners;
}

function assertOwnersResolveExactCore(owners, expectedVersion, expectedManifestPath) {
  assert.ok(owners.length > 0, 'expected at least one Sentry package that owns @sentry/core');
  for (const { manifest, manifestPath } of owners) {
    const declaredVersion = manifest.dependencies['@sentry/core'];
    assert.match(declaredVersion, exactVersion, `${manifest.name} must own an exact core version`);
    assert.equal(declaredVersion, expectedVersion, `${manifest.name} must stay in its SDK core family`);
    const resolvedManifest = fs.realpathSync(findManifest('@sentry/core', manifestPath));
    assert.equal(readManifest(resolvedManifest).version, expectedVersion);
    if (expectedManifestPath) assert.equal(resolvedManifest, expectedManifestPath);
  }
}

test('mobile Sentry packages share one exact core while the server resolves its own exact family', () => {
  const rootManifest = readManifest(path.join(root, 'package.json'));
  const rootCoreManifest = fs.realpathSync(findManifest('@sentry/core'));
  const mobileSdkManifest = readManifest(findManifest('@sentry/react-native'));
  const mobileCoreVersion = mobileSdkManifest.dependencies['@sentry/core'];

  assert.match(mobileCoreVersion, exactVersion);
  assert.equal(rootManifest.dependencies?.['@sentry/core'], mobileCoreVersion);
  assert.equal(readManifest(rootCoreManifest).version, mobileCoreVersion);
  assertOwnersResolveExactCore(
    sentryCoreOwners('@sentry/react-native'),
    mobileCoreVersion,
    rootCoreManifest,
  );

  const serverSdkManifest = readManifest(findManifest('@sentry/node'));
  const serverCoreVersion = serverSdkManifest.dependencies['@sentry/core'];
  assert.match(serverCoreVersion, exactVersion);
  const serverOwners = sentryCoreOwners('@sentry/node');
  assertOwnersResolveExactCore(serverOwners, serverCoreVersion);

  if (serverCoreVersion !== mobileCoreVersion) {
    for (const { manifestPath } of serverOwners) {
      assert.notEqual(fs.realpathSync(findManifest('@sentry/core', manifestPath)), rootCoreManifest);
    }
  }

  const lock = readManifest(path.join(root, 'package-lock.json'));
  const coreEntries = Object.entries(lock.packages)
    .filter(([location]) => location.endsWith('node_modules/@sentry/core'))
    .map(([location, entry]) => ({ location, version: entry.version }));
  assert.deepEqual(new Set(coreEntries.map(({ version }) => version)), new Set([
    mobileCoreVersion,
    serverCoreVersion,
  ]));
  assert.equal(
    coreEntries.filter(({ version }) => version === mobileCoreVersion).length,
    1,
    'the lockfile must contain one physical mobile core copy',
  );
});
