/* global __dirname */
const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
test('captured evidence cannot trigger Metro refreshes or enter a bundle', () => {
 const config = require('../metro.config');
 const patterns = [].concat(config.resolver.blockList);
 const blocked = relative => patterns.some(pattern => pattern.test(path.resolve(__dirname, '..', relative)));
 assert.equal(blocked('evidence/T02/capture.png'), true);
 assert.equal(blocked('evidence/T02/state.json'), true);
 assert.equal(blocked('src/features/launch/BootScreen.tsx'), false);
 assert.equal(blocked('app/linked-trace.tsx'), true);
});
test('native crash reporting excludes unused browser replay packages', () => {
 const config = require('../metro.config');
 const context = { resolveRequest: () => ({ type: 'sourceFile', filePath: '/kept.js' }) };
 for (const name of ['@sentry/replay', '@sentry-internal/replay-canvas']) {
  assert.deepEqual(config.resolver.resolveRequest?.(context, name, 'ios'), { type: 'empty' });
 }
 assert.deepEqual(config.resolver.resolveRequest(context, 'required-app-module', 'ios'), { type: 'sourceFile', filePath: '/kept.js' });
});
test('linked-recorder virtual modules resolve to the selected compile boundary', { concurrency: false }, () => {
 const configPath = require.resolve('../metro.config');
 const original = process.env.EXCERLOCK_LINKED_RECORDER_TRACE;
 const resolve = enabled => {
  process.env.EXCERLOCK_LINKED_RECORDER_TRACE = enabled ? '1' : '0';
  delete require.cache[configPath];
  const config = require(configPath);
  const context = { resolveRequest: (_context, moduleName) => ({ type: 'sourceFile', filePath: moduleName }) };
  return config.resolver.resolveRequest(context, '@linked-trace', 'ios').filePath;
 };
 try {
  assert.match(resolve(false), /LinkedTrace\.disabled\.ts$/);
  assert.match(resolve(true), /LinkedTrace\.research\.ts$/);
 } finally {
  if (original === undefined) delete process.env.EXCERLOCK_LINKED_RECORDER_TRACE;
  else process.env.EXCERLOCK_LINKED_RECORDER_TRACE = original;
  delete require.cache[configPath];
 }
});
