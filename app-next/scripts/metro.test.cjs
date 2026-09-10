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
});
test('native crash reporting excludes unused browser replay packages', () => {
 const config = require('../metro.config');
 const context = { resolveRequest: () => ({ type: 'sourceFile', filePath: '/kept.js' }) };
 for (const name of ['@sentry/replay', '@sentry-internal/replay-canvas']) {
  assert.deepEqual(config.resolver.resolveRequest?.(context, name, 'ios'), { type: 'empty' });
 }
 assert.deepEqual(config.resolver.resolveRequest(context, 'required-app-module', 'ios'), { type: 'sourceFile', filePath: '/kept.js' });
});
