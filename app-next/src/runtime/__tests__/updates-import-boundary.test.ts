/**
 * One-owner boundary: only `src/runtime/updates.ts` may import `expo-updates`.
 * The coordinator also never reads paywall-gated flags (static import check).
 */
import * as fs from 'fs';
import * as path from 'path';

function listSourceFiles(dir: string, out: string[] = []): string[] {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === 'node_modules' || entry.name === '__tests__') continue;
      listSourceFiles(full, out);
    } else if (entry.isFile() && (full.endsWith('.ts') || full.endsWith('.tsx'))) {
      out.push(full);
    }
  }
  return out;
}

const IMPORT_RE = /(?:from\s+['"]expo-updates['"]|require\(\s*['"]expo-updates['"])/;

describe('OTA import boundary', () => {
  test('only updates.ts imports expo-updates', () => {
    const srcRoot = path.resolve(__dirname, '..', '..');
    const files = listSourceFiles(srcRoot);
    const offenders: string[] = [];
    for (const file of files) {
      // updates.ts is the single owner; its tests may mock the module.
      if (file.endsWith('/src/runtime/updates.ts')) continue;
      if (file.includes('/src/runtime/__tests__/')) continue;
      const content = fs.readFileSync(file, 'utf8');
      if (IMPORT_RE.test(content)) offenders.push(path.relative(srcRoot, file));
    }
    expect(offenders).toEqual([]);
  });

  test('updates.ts is the owner and uses only modern SDK57 calls', () => {
    const owner = path.resolve(__dirname, '..', 'updates.ts');
    const content = fs.readFileSync(owner, 'utf8');
    expect(IMPORT_RE.test(content)).toBe(true);
    // Modern surface used by the coordinator.
    expect(content).toMatch(/checkForUpdateAsync/);
    expect(content).toMatch(/fetchUpdateAsync/);
    expect(content).toMatch(/reloadAsync/);
    expect(content).toMatch(/useUpdates/);
    // Obsolete recovery mode must never be used (Recovi: native check never ran).
    expect(content).not.toMatch(/ON_ERROR_RECOVERY/);
  });

  test('coordinator never imports paywall-gated guards', () => {
    const owner = path.resolve(__dirname, '..', 'updates.ts');
    const content = fs.readFileSync(owner, 'utf8');
    const importLines = content.split('\n').filter((line) => /^\s*import\b/.test(line));
    const joined = importLines.join('\n').toLowerCase();
    expect(joined).not.toMatch(/onboarding/);
    // The store module name for access state must not be imported here.
    expect(joined).not.toMatch(/subscriptionport/);
    expect(joined).not.toMatch(/paywall/);
    // Identifier-level guard: the coordinator input surface is primitives only.
    expect(content).not.toMatch(/onboardingComplete/);
  });
});
