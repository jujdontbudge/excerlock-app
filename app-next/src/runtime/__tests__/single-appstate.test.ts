import { readdirSync, readFileSync, statSync } from 'fs';
import { join } from 'path';

/**
 * The foreground handler is a single-owner resource: enforcement, the permission re-read, the
 * selection re-verification and the claim-on-open refresh all hang off one subscription in the
 * runtime host. Two exceptions. The treadmill scan pauses a camera controller, not enforcement, and
 * lives for the length of one modal. The test harness is a separate build root behind
 * EXPO_PUBLIC_TEST_HARNESS that records app-state transitions as run evidence; it never mounts the
 * product runtime alongside itself, so it cannot race the enforcement subscription.
 */
const allowed = new Set([
  'src/runtime/EnforcementHost.ts',
  'src/features/unlock/TreadmillUnlockScreen.tsx',
  'src/harness/HarnessApp.tsx',
]);

function sources(dir: string, found: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    const path = join(dir, entry);
    if (statSync(path).isDirectory()) {
      if (entry !== '__tests__' && entry !== '__previews__' && entry !== 'node_modules') sources(path, found);
    } else if (/\.tsx?$/.test(entry)) found.push(path);
  }
  return found;
}

const root = join(__dirname, '..', '..', '..');
const subscribers = [...sources(join(root, 'src')), ...sources(join(root, 'app'))]
  .filter((path) => /\bAppState\b[^\n]*\.addEventListener\(/.test(readFileSync(path, 'utf8')))
  .map((path) => path.slice(root.length + 1))
  .sort();

test('exactly one AppState subscription owns the foreground transition', () => {
  expect(subscribers).toEqual([...allowed].sort());
});

test('progress sync, Home and the sheets never subscribe to AppState themselves', () => {
  for (const owner of ['src/features/home/', 'src/features/sessions/', 'src/features/sheets/'])
    expect(subscribers.filter((path) => path.startsWith(owner))).toEqual([]);
});

test('the tab layout no longer mounts progress sync', () => {
  expect(readFileSync(join(root, 'app', '(tabs)', '_layout.tsx'), 'utf8')).not.toMatch(/startProgressSync/);
});
