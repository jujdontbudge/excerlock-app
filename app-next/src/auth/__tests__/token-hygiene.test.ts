import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

/**
 * The token law, enforced on the source. Supabase sessions carry a refresh token, so the auth module
 * may write them to the keychain and nowhere else, and may never print anything: a stray log line is
 * how credentials end up in a crash report or a shoulder-surfed Metro console.
 */
const directory = join(__dirname, '..');
/** Prose may name what the code must not do, so the scan reads statements only. */
const withoutComments = (source: string) => source.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '');
const sources = readdirSync(directory)
  .filter((name) => name.endsWith('.ts'))
  .map((name) => ({ name, code: withoutComments(readFileSync(join(directory, name), 'utf8')) }));

test('the auth module is the whole surface under test', () => {
  expect(sources.map(({ name }) => name).sort()).toEqual([
    'SupabaseAuthAdapter.ts',
    'accountProvisioning.ts',
    'identityProviders.ts',
    'index.ts',
    'secureSessionStorage.ts',
    'supabaseAuthApi.ts',
    'supabaseClient.ts',
  ]);
});

test.each(sources)('$name never reaches for AsyncStorage', ({ code }) => {
  expect(code).not.toMatch(/async-storage|AsyncStorage/);
});

test.each(sources)('$name never logs', ({ code }) => {
  expect(code).not.toMatch(/\bconsole\s*\./);
});

test('the session store the adapter publishes to holds no credential', () => {
  const validators = readFileSync(join(directory, '..', 'state', 'validation.ts'), 'utf8');
  const session = /export const signedIn = shape\(\{([\s\S]*?)\}\);/.exec(validators)?.[1] ?? '';
  expect(session).not.toMatch(/token|secret|password/i);
});
