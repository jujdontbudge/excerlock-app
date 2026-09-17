const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const test = require('node:test');
const {
  enableEmbeddedDebugBundle,
  expected,
  preflightSchemeDirectory,
  scheme,
  validateCatalog,
  writeOwnedScheme,
} = require('./generate-storekit-harness.cjs');

test('catalog has exactly the 51 authoritative subscription contracts', () => {
  assert.doesNotThrow(() => validateCatalog(path.join(__dirname, '..', 'storekit', 'ExcerLock.storekit')));
  assert.equal(expected.size, 51);
});

test('catalog price or trial drift fails validation', () => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'storekit-catalog-'));
  const catalog = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'storekit', 'ExcerLock.storekit'), 'utf8'));
  const grid = catalog.subscriptionGroups.find(group => group.name === 'Premium Grid').subscriptions;
  grid.find(product => product.productID.endsWith('premium.annual.2999.t3')).introductoryOffer.subscriptionPeriod = 'P1W';
  const file = path.join(directory, 'ExcerLock.storekit');
  fs.writeFileSync(file, JSON.stringify(catalog));
  assert.throws(() => validateCatalog(file), /catalog mismatch for com\.johansardar\.excerlock\.premium\.annual\.2999\.t3/);
});

test('embedded Debug bundling changes only the main app React Native phase and is idempotent', () => {
  const unrelated = { name: 'Other phase', shellScript: 'export SKIP_BUNDLING=1' };
  const bundle = { name: '"Bundle React Native code and images"', shellScript: 'before\\nexport SKIP_BUNDLING=1\\nafter' };
  const project = { hash: { project: { objects: { PBXShellScriptBuildPhase: { BUNDLE: bundle, OTHER: unrelated } } } } };
  const app = { value: { buildPhases: [{ value: 'BUNDLE' }] } };
  enableEmbeddedDebugBundle(project, app);
  assert.equal(bundle.shellScript, 'before\\nexport FORCE_BUNDLING=1\\nafter');
  assert.equal(unrelated.shellScript, 'export SKIP_BUNDLING=1');
  assert.doesNotThrow(() => enableEmbeddedDebugBundle(project, app));
});

test('unexpected main app bundling phase fails instead of mutating the project', () => {
  const bundle = { name: 'Bundle React Native code and images', shellScript: 'custom script' };
  const project = { hash: { project: { objects: { PBXShellScriptBuildPhase: { BUNDLE: bundle } } } } };
  const app = { value: { buildPhases: [{ value: 'BUNDLE' }] } };
  assert.throws(() => enableEmbeddedDebugBundle(project, app), /unexpected Debug bundling stanza/);
  assert.equal(bundle.shellScript, 'custom script');
});

test('owned scheme writes idempotently and rejects an unrelated existing scheme', () => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'storekit-scheme-'));
  const file = path.join(directory, 'ExcerLock-StoreKit.xcscheme');
  writeOwnedScheme(file, '<owned/>');
  assert.doesNotThrow(() => writeOwnedScheme(file, '<owned/>'));
  fs.writeFileSync(file, '<unrelated/>');
  assert.throws(() => writeOwnedScheme(file, '<owned/>'), /not owned by this generator/);
  assert.equal(fs.readFileSync(file, 'utf8'), '<unrelated/>');
});

test('scheme directory preflight rejects a file before project mutation', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'storekit-scheme-dir-'));
  const sharedData = path.join(root, 'xcshareddata');
  const schemeDir = path.join(sharedData, 'xcschemes');
  fs.mkdirSync(sharedData);
  fs.writeFileSync(schemeDir, 'not a directory');
  assert.throws(() => preflightSchemeDirectory(schemeDir), /is not a directory/);
});

test('scheme is opt-in Debug-only and never archives or profiles', () => {
  const xml = scheme({ uuid: 'APP' }, { uuid: 'TEST' });
  assert.match(xml, /LaunchAction buildConfiguration="Debug"/);
  assert.match(xml, /TestAction buildConfiguration="Debug"/);
  assert.match(xml, /StoreKitConfigurationFileReference/);
  assert.match(xml, /ExcerLockStoreKitUITests\.xctest/);
  assert.doesNotMatch(xml, /ArchiveAction|ProfileAction|buildConfiguration="Release"/);
  assert.match(xml, /buildForArchiving="NO"/);
});
