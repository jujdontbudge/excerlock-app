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
test('the bundled Adapty fallback asset stays bundle-visible', () => {
 const config = require('../metro.config');
 const patterns = [].concat(config.resolver.blockList);
 const blocked = relative => patterns.some(pattern => pattern.test(path.resolve(__dirname, '..', relative)));
 // B3 ships the fallback file as a native iOS bundle resource through the
 // react-native-adapty config plugin, so setFallback resolves it in Bundle.main
 // and an EAS Update can never replace it. Metro must still not block the path:
 // a JS-side reference keeps bundling, and no blockList entry may ever prune
 // the asset from a build.
 assert.equal(blocked('assets/adapty-fallback.json'), false);
 // The evidence block still rejects captured output next to it.
 assert.equal(blocked('evidence/T02/capture.png'), true);
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
  if (enabled) process.env.EXCERLOCK_LINKED_RECORDER_TRACE = '1';
  else delete process.env.EXCERLOCK_LINKED_RECORDER_TRACE;
  delete require.cache[configPath];
  const config = require(configPath);
  const context = { resolveRequest: (_context, moduleName) => ({ type: 'sourceFile', filePath: moduleName }) };
  return {
   filePath: config.resolver.resolveRequest(context, '@linked-trace', 'ios').filePath,
   clientServices: config.resolver.resolveRequest(context, '@client-services', 'ios').filePath,
   cacheVersion: config.cacheVersion,
  };
 };
 try {
  const ordinary = resolve(false);
  const research = resolve(true);
  assert.match(ordinary.filePath, /LinkedTrace\.disabled\.ts$/);
  assert.match(research.filePath, /LinkedTrace\.research\.ts$/);
  assert.match(ordinary.clientServices, /runtime\/createClientServices\.ts$/);
  assert.match(research.clientServices, /linkedTrace\/createClientServices\.research\.ts$/);
  assert.notEqual(ordinary.cacheVersion, research.cacheVersion);
 } finally {
  if (original === undefined) delete process.env.EXCERLOCK_LINKED_RECORDER_TRACE;
  else process.env.EXCERLOCK_LINKED_RECORDER_TRACE = original;
  delete require.cache[configPath];
 }
});
