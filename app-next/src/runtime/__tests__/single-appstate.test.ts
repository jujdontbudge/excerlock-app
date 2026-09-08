import { readdirSync, readFileSync, statSync } from 'fs';
import { join } from 'path';

/**
 * The foreground handler is a single-owner resource. `runtime/appState.ts` holds the app's one
 * native subscription and fans it out: the enforcement host takes `active` for the permission
 * re-read, the selection re-verification and the claim-on-open refresh, and the sync host takes
 * `background` to push the day's facts. Neither reaches for `AppState` itself.
 *
 * Two exceptions. The treadmill scan pauses a camera controller, not enforcement, and lives for the
 * length of one modal. The test harness is a separate build root behind EXPO_PUBLIC_TEST_HARNESS
 * that records app-state transitions as run evidence; it never mounts the product runtime alongside
 * itself, so it cannot race the enforcement subscription.
 */
const allowed = new Set([
  'src/runtime/appState.ts',
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
/**
 * A file subscribes if it imports `AppState` from React Native and calls `addEventListener`. The two
 * need not be on one line: `appState.ts` takes `AppState` as a default argument and subscribes
 * through the parameter, which a same-line grep would miss. Naming the `AppStateSource` *type* is
 * not subscribing — that is how a host says it takes its signal from someone else.
 */
const importsAppState = /import\s*\{[\s\S]*?\bAppState\b[\s\S]*?\}\s*from\s*["']react-native["']/;
const subscribers = [...sources(join(root, 'src')), ...sources(join(root, 'app'))]
  .filter((path) => {
    const source = readFileSync(path, 'utf8');
    return importsAppState.test(source) && /\.addEventListener\(/.test(source);
  })
  .map((path) => path.slice(root.length + 1))
  .sort();

test('exactly one AppState subscription owns the foreground transition', () => {
  expect(subscribers).toEqual([...allowed].sort());
});

test('progress sync, Home, the sheets and the hosts never subscribe to AppState themselves', () => {
  for (const owner of ['src/features/home/', 'src/features/sessions/', 'src/features/sheets/', 'src/adapters/sync/'])
    expect(subscribers.filter((path) => path.startsWith(owner))).toEqual([]);
});

test('the tab layout no longer mounts progress sync', () => {
  expect(readFileSync(join(root, 'app', '(tabs)', '_layout.tsx'), 'utf8')).not.toMatch(/startProgressSync/);
});
