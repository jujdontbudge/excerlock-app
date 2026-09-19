import fs from 'node:fs';
import path from 'node:path';

/**
 * `app.json` enables the React Compiler, which only treats `use*`-named calls as hooks. A zustand
 * store called as `fooStore((s) => …)` inside a component is a hook the compiler cannot see, so it
 * may memoize it conditionally and the release build dies with "Should have a queue" on the first
 * state change (Home Report chips, 2026-09-19T0209Z run). Components must alias: `fooStore as useFooStore`.
 */
const root = path.resolve(__dirname, '../..');
function files(directory: string): string[] {
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const target = path.join(directory, entry.name);
    if (entry.isDirectory()) return entry.name === '__tests__' || entry.name === 'node_modules' ? [] : files(target);
    return /\.tsx$/.test(entry.name) ? [target] : [];
  });
}

test('components never call a zustand store selector without a use-prefixed alias', () => {
  const bare = /(?<![A-Za-z0-9_.])(?!use[A-Z])([a-z][A-Za-z0-9]*Store)\(\s*\(/g;
  const violations = files(root).flatMap((file) => {
    const source = fs.readFileSync(file, 'utf8');
    return [...source.matchAll(bare)].map((match) => `${path.relative(root, file)}: ${match[1]}((…)`);
  });
  expect(violations).toEqual([]);
});
