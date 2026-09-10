const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { verifyBundleSize, MAX_BUNDLE_BYTES } = require('./verify-bundle-size.cjs');
const magic = Buffer.from('c61fbc03c103191f', 'hex');
test('release budget is decimal 4 MB, accepts exact cap and rejects one byte over', () => {
 const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'ship-bundle-size-'));
 try {
  const file = path.join(dir, 'main.jsbundle');
  fs.writeFileSync(file, magic);
  assert.equal(MAX_BUNDLE_BYTES, 4_000_000);
  fs.truncateSync(file, MAX_BUNDLE_BYTES);
  assert.equal(verifyBundleSize(file).bytes, MAX_BUNDLE_BYTES);
  fs.truncateSync(file, MAX_BUNDLE_BYTES + 1);
  assert.throws(() => verifyBundleSize(file), /exceeds 4000000 bytes/);
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
