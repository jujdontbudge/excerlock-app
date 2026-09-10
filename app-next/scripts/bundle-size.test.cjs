const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { verifyBundleSize } = require('./verify-bundle-size.cjs');
const magic = Buffer.from('c61fbc03c103191f', 'hex');
test('removed size budget does not reject valid Hermes artifacts above the historical cap', () => {
 const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'ship-bundle-size-'));
 try {
  const file = path.join(dir, 'main.jsbundle');
  fs.writeFileSync(file, magic);
  fs.truncateSync(file, 8_000_000);
  assert.deepEqual(verifyBundleSize(file), { bytes: 8_000_000, limit: null });
 } finally { fs.rmSync(dir, { recursive: true, force: true }); }
});
test('missing, JS text, truncated header and linked artifacts cannot pass as Hermes bytecode', () => {
 const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'ship-bundle-size-'));
 try {
  const file = path.join(dir, 'main.jsbundle');
  assert.throws(() => verifyBundleSize(file));
  fs.writeFileSync(file, 'console.log("not bytecode")');
  assert.throws(() => verifyBundleSize(file), /Hermes/);
  fs.writeFileSync(file, magic);
  assert.throws(() => verifyBundleSize(file), /Hermes/);
  fs.truncateSync(file, 128);
  const link = path.join(dir, 'linked');
  fs.symlinkSync(file, link);
  assert.throws(() => verifyBundleSize(link), /regular unlinked file/);
 } finally { fs.rmSync(dir, { recursive: true, force: true }); }
});
