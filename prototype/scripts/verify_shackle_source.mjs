#!/usr/bin/env node

import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const app = await readFile(new URL('../App.tsx', import.meta.url), 'utf8');

assert.match(app, /const SHACKLE_SOCKET_SPACING = 72\.5;/, 'socket shift must remain measured at 72.5 pt');
assert.match(app, /const SHACKLE_POP_HEIGHT = 75;/, 'pop height must fully clear both sockets');
assert.match(
  app,
  /shackleY\.value = withDelay\(\s*450,\s*withSequence\(\s*withSpring\(-SHACKLE_POP_HEIGHT, \{ duration: 300, dampingRatio: 0\.72 \}\),\s*withSpring\(0, \{ duration: 350, dampingRatio: 0\.76 \}\)/s,
  'vertical motion must be a 450–750 ms pop followed by a 750–1100 ms drop',
);
assert.match(
  app,
  /shackleX\.value = withDelay\(\s*550,\s*withTiming\(SHACKLE_SOCKET_SPACING, \{\s*duration: 400,/s,
  'horizontal drift must span 550–950 ms',
);
assert.match(app, /testID="shackle-layer"/, 'the shackle must render as one animated layer');

for (const removedMechanism of [
  'shackleRotation',
  'shackleSettle',
  'shackle-pivot',
  'shackle-visual',
]) {
  assert.ok(!app.includes(removedMechanism), `${removedMechanism} must stay deleted`);
}

const shackleStyle = app.slice(
  app.indexOf('const shackleStyle = useAnimatedStyle'),
  app.indexOf('const bodyStyle = useAnimatedStyle'),
);
assert.ok(!shackleStyle.includes('rotate'), 'the shackle animated style must use translation only');
assert.ok(!shackleStyle.includes('scale'), 'the shackle animated style must not hide motion in a nested scale');

console.log('Shackle regression checks passed: one upright layer, translation-only, measured three-phase timing.');
