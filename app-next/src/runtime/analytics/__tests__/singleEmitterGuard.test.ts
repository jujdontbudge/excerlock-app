import fs from 'node:fs';
import path from 'node:path';

function sourceFiles(directory: string): string[] {
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const target = path.join(directory, entry.name);
    if (entry.isDirectory()) return entry.name === '__tests__' ? [] : sourceFiles(target);
    return /\.[jt]sx?$/.test(entry.name) ? [target] : [];
  });
}

test('app client has no direct PostHog purchase, trial, or subscription lifecycle capture', () => {
  const src = path.resolve(__dirname, '../../../');
  const violations = sourceFiles(src).filter((file) =>
    /\.capture\(\s*['"](?:purchase_|trial_|subscription_)/.test(fs.readFileSync(file, 'utf8')),
  );
  expect(violations).toEqual([]);
});
