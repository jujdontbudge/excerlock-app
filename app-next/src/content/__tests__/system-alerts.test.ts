import { readFileSync } from 'fs';
import { join } from 'path';
import { setupCopy } from '../setup';

const root = join(__dirname, '..', '..', '..');
const source = (path: string) => readFileSync(join(root, path), 'utf8');
const a = setupCopy.alerts;

// The drawn alert must be covered word for word by the real one, so its message is the shipped purpose string.
test.each([
  ['config/native.ts', a.location.message],
  ['config/native.ts', a.alwaysLocation.message],
  ['config/native.ts', a.alwaysUpgrade.message],
  ['modules/excerlock-motion/app.plugin.js', a.motion.message],
  ['modules/excerlock-gait-vision/app.plugin.js', a.camera.message],
])('%s ships the message drawn on the alert: %s', (path, message) => {
  expect(source(path)).toContain(JSON.stringify(message));
});

test('every alert names a button to tap and a refusal', () => {
  for (const alert of Object.values(a)) {
    expect(alert.buttons[alert.tap]).toBeTruthy();
    expect(alert.buttons[alert.deny]).toMatch(/Don’t Allow|Keep Only While Using/);
  }
});
