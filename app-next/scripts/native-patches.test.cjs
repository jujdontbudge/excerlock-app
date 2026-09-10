const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { createRequire } = require('node:module');

const repositoryRoot = path.resolve(__dirname, '../..');
const packageName = 'react-native-device-activity';

function installedPackageRoot(origin) {
  const requireFromOrigin = createRequire(path.join(repositoryRoot, origin, 'package.json'));
  return path.dirname(requireFromOrigin.resolve(`${packageName}/package.json`));
}

function verifyDeviceActivityRemoval(packageRoot) {
  const manifest = JSON.parse(fs.readFileSync(path.join(packageRoot, 'package.json'), 'utf8'));
  assert.equal(manifest.name, packageName);
  assert.equal(manifest.version, '0.6.1', 'native patch assertions must be reviewed when the dependency changes');

  const read = (relative) => fs.readFileSync(path.join(packageRoot, relative), 'utf8');
  const builtJs = read('build/index.js');
  assert.match(builtJs, /export const removeFamilyActivitySelectionId\s*=\s*\([^)]*id[^)]*\)\s*=>\s*{[\s\S]*?\.removeActivitySelection\(id\)/);
  assert.match(read('build/index.d.ts'), /export declare const removeFamilyActivitySelectionId:\s*\(id:\s*string\)\s*=>\s*void/);
  assert.match(read('build/ReactNativeDeviceActivity.types.d.ts'), /removeActivitySelection:\s*\(familyActivitySelectionId:\s*string\)\s*=>\s*void/);

  const native = read('ios/ReactNativeDeviceActivityModule.swift');
  assert.match(native, /Function\("removeActivitySelection"\)\s*{\s*\(familyActivitySelectionId:\s*String\)\s*in\s*removeFamilyActivitySelectionById\(id:\s*familyActivitySelectionId\)/);
}

test('each app resolves the patched native device-activity installation', () => {
  const roots = ['app', 'app-next'].map(installedPackageRoot);
  for (const root of roots) verifyDeviceActivityRemoval(root);
});

test('verification rejects an installed artifact missing the JS removal export', (t) => {
  const installed = installedPackageRoot('app-next');
  const temporary = fs.mkdtempSync(path.join(os.tmpdir(), 'excerlock-native-patch-'));
  t.after(() => fs.rmSync(temporary, { recursive: true, force: true }));
  fs.cpSync(installed, temporary, { recursive: true });
  const builtIndex = path.join(temporary, 'build/index.js');
  fs.writeFileSync(
    builtIndex,
    fs.readFileSync(builtIndex, 'utf8').replace(/export const removeFamilyActivitySelectionId[\s\S]*?\n};\n/, ''),
  );
  assert.throws(() => verifyDeviceActivityRemoval(temporary));
});
