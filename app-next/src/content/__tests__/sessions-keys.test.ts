import { readFileSync, readdirSync } from 'fs';
import { join } from 'path';
import { sessionCopy } from '../sessions';

const root = join(__dirname, '..', '..');
const own = join(root, 'content', 'sessions.ts');

function sources(directory: string): string[] {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) return sources(path);
    return /\.tsx?$/.test(entry.name) && path !== own ? [path] : [];
  });
}

/**
 * The manual check-in sheet is gone (P2-T21, finding 75). Copy that outlived its
 * only screen is how a content file turns into a graveyard, so every key has to
 * be spoken somewhere.
 */
test('every key in sessionCopy has a reader outside the content file', () => {
  const files = sources(root).map((path) => readFileSync(path, 'utf8'));
  const orphans = Object.keys(sessionCopy).filter(
    (key) =>
      !files.some(
        (text) =>
          text.includes(`sessionCopy.${key}`) ||
          (/import \{ sessionCopy as c \}/.test(text) && new RegExp(`\\bc\\.${key}\\b`).test(text)),
      ),
  );
  expect(orphans).toEqual([]);
});
