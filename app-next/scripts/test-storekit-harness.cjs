const assert = require('node:assert/strict');
const path = require('node:path');
const test = require('node:test');
const { expected, scheme, validateCatalog } = require('./generate-storekit-harness.cjs');

test('catalog has exactly the six authoritative subscription contracts', () => {
  assert.doesNotThrow(() => validateCatalog(path.join(__dirname, '..', 'storekit', 'ExcerLock.storekit')));
  assert.equal(expected.size, 6);
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
