import { loadBuildEnvironment } from '../../../config/loadEnvironment';
import { CLIENT_ENV_NAMES, buildClientExtra, parseEnvFile, resolveBuildEnvironment, resolveClientEnvironment, updateChannel } from '../../../config/environment';

const clientValues = Object.fromEntries(CLIENT_ENV_NAMES.map((key) => [key, `test-${key}`]));
Object.assign(clientValues, {
  EXPO_PUBLIC_POSTHOG_HOST: 'https://analytics.example.com',
  SENTRY_DSN: 'https://test@errors.example.com/1',
  EXPO_PUBLIC_SUPABASE_URL: 'https://auth.example.com',
  EXPO_PUBLIC_API_URL: 'https://api.example.com',
});

describe('build-time configuration (no real environment or filesystem)', () => {
  test.each([['development', 'dev'], ['preview', 'preview'], ['production', 'prod'], [undefined, 'dev']])('maps profile %s to %s', (profile, expected) => {
    expect(resolveBuildEnvironment({ EAS_BUILD_PROFILE: profile })).toBe(expected);
  });
  test('rejects unknown and missing release profiles rather than defaulting to demo', () => {
    expect(() => resolveBuildEnvironment({ EAS_BUILD_PROFILE: 'prd' })).toThrow('profile');
    expect(() => resolveBuildEnvironment({ EAS_BUILD: 'true' })).toThrow('profile');
  });
  test('production configuration fails before launch when required keys are missing', () => {
    expect(() => buildClientExtra({}, 'prod')).toThrow('EXPO_PUBLIC_ADAPTY_KEY');
    expect(() => buildClientExtra({}, 'preview')).toThrow('EXPO_PUBLIC_SUPABASE_URL');
    expect(() => buildClientExtra({}, 'dev')).not.toThrow();
  });
  test('process values and aliases win over optional local file, including explicit empty values', () => {
    expect(resolveClientEnvironment({ POSTHOG_HOST: 'https://process.example.com', EXPO_PUBLIC_ADAPTY_KEY: '' }, {
      EXPO_PUBLIC_POSTHOG_HOST: 'https://local.example.com', EXPO_PUBLIC_ADAPTY_KEY: 'local-key',
    })).toMatchObject({ EXPO_PUBLIC_POSTHOG_HOST: 'https://process.example.com', EXPO_PUBLIC_ADAPTY_KEY: '' });
  });
  test('accepts existing local aliases without forwarding server credentials', () => {
    const env = resolveClientEnvironment({}, { SUPABASE_URL: 'https://auth.example.com', SENTRY_DSN_MOBILE: 'dsn', SENTRY_AUTH_TOKEN: 'private', SUPABASE_SERVICE_ROLE_KEY: 'private' });
    expect(env).toMatchObject({ EXPO_PUBLIC_SUPABASE_URL: 'https://auth.example.com', SENTRY_DSN: 'dsn' });
    expect(env).not.toHaveProperty('SENTRY_AUTH_TOKEN');
    expect(env).not.toHaveProperty('SUPABASE_SERVICE_ROLE_KEY');
  });
  test('exports only client configuration; upload token is build-time only', () => {
    const extra = buildClientExtra({ ...clientValues, SENTRY_AUTH_TOKEN: 'private-upload-token' }, 'prod');
    expect(extra.environment).toBe('prod');
    expect(extra.clientAuth?.supabaseUrl).toBe('https://auth.example.com');
    expect(extra.clientSubscription?.adaptyKey).toBe(clientValues.EXPO_PUBLIC_ADAPTY_KEY);
    expect(JSON.stringify(extra)).not.toContain('private-upload-token');
    expect(() => buildClientExtra(clientValues, 'prod', { requireUploadToken: true })).toThrow('SENTRY_AUTH_TOKEN');
  });
  test('requires secure remote service URLs for release builds, without leaking bad values', () => {
    expect(() => buildClientExtra({ ...clientValues, EXPO_PUBLIC_API_URL: 'http://private-token@localhost' }, 'prod')).toThrow('EXPO_PUBLIC_API_URL must be an HTTPS URL');
    expect(() => buildClientExtra({ ...clientValues, EXPO_PUBLIC_API_URL: 'https://private-token@api.example.com' }, 'prod')).toThrow('EXPO_PUBLIC_API_URL must be an HTTPS URL');
  });
  test('parses literal dotenv values without shell evaluation', () => {
    expect(parseEnvFile("# comment\nexport KEY='value=with=equals'\nOTHER=plain # note\nCMD=$(touch /tmp/never)\nBAD LINE\n")).toEqual({ KEY: 'value=with=equals', OTHER: 'plain', CMD: '$(touch /tmp/never)' });
  });
});

describe('credential file isolation', () => {
  test('tests do not read the file OR real process values', () => {
    const read = jest.fn(() => 'EXPO_PUBLIC_ADAPTY_KEY=real');
    expect(loadBuildEnvironment({ NODE_ENV: 'test', ...clientValues }, read)).toEqual({});
    expect(read).not.toHaveBeenCalled();
  });
  test.each([{ CI: 'true' }, { EAS_BUILD: 'true' }])('hosted execution ignores developer file %j', (flags) => {
    const read = jest.fn(() => 'EXPO_PUBLIC_ADAPTY_KEY=real');
    expect(loadBuildEnvironment({ ...flags, ...clientValues }, read).EXPO_PUBLIC_ADAPTY_KEY).toBe(clientValues.EXPO_PUBLIC_ADAPTY_KEY);
    expect(read).not.toHaveBeenCalled();
  });
  test('missing optional file is allowed; unreadable file is reported without its contents', () => {
    expect(() => loadBuildEnvironment({}, () => { throw Object.assign(new Error('missing'), { code: 'ENOENT' }); })).not.toThrow();
    expect(() => loadBuildEnvironment({}, () => { throw Object.assign(new Error('sensitive'), { code: 'EACCES' }); })).toThrow('Unable to read optional');
  });
});

test('OTA environment selects production without a build profile; conflicting inputs fail', () => {
  expect(resolveBuildEnvironment({ EXCERLOCK_ENV: 'prod', NODE_ENV: 'production' })).toBe('prod');
  expect(resolveBuildEnvironment({ EXCERLOCK_ENV: 'preview' })).toBe('preview');
  expect(() => resolveBuildEnvironment({ EAS_BUILD_PROFILE: 'preview', EXCERLOCK_ENV: 'prod' })).toThrow('conflict');
  expect(() => resolveBuildEnvironment({ NODE_ENV: 'production' })).toThrow('explicit');
  expect(() => resolveBuildEnvironment({ EXCERLOCK_ENV: 'prd' })).toThrow('EXCERLOCK_ENV');
});

test('the standalone lab environment is a double opt-in with no OTA channel', () => {
  expect(resolveBuildEnvironment({ EXCERLOCK_ENV: 'lab', EXCERLOCK_LINKED_RECORDER_TRACE: '1' })).toBe('lab');
  expect(() => resolveBuildEnvironment({ EXCERLOCK_ENV: 'lab' })).toThrow('EXCERLOCK_LINKED_RECORDER_TRACE=1');
  expect(() => resolveBuildEnvironment({ EAS_BUILD_PROFILE: 'preview', EXCERLOCK_ENV: 'lab', EXCERLOCK_LINKED_RECORDER_TRACE: '1' })).toThrow('conflict');
  expect(() => updateChannel('lab')).toThrow('no OTA update channel');
});

test('the standalone lab build needs no production keys and embeds no client identity group', () => {
  // An empty environment is a build host with no production credentials.
  const extra = buildClientExtra({}, 'lab');
  expect(extra).toEqual({ environment: 'lab' });
  // The lab omits the identity groups entirely: there is no placeholder value a
  // reader or a future consumer could mistake for a real client identity.
  for (const group of ['clientAuth', 'clientSubscription', 'clientObservability', 'clientApi']) {
    expect(extra).not.toHaveProperty(group);
  }
  // A build host that does have production credentials must not leak them into
  // the lab extra: nothing is read from the environment on the lab path.
  const withProduction = buildClientExtra({ ...clientValues, SENTRY_AUTH_TOKEN: 'private-upload-token' }, 'lab');
  expect(withProduction).toEqual({ environment: 'lab' });
  expect(JSON.stringify(withProduction)).not.toContain(clientValues.EXPO_PUBLIC_SUPABASE_URL);
  expect(JSON.stringify(withProduction)).not.toContain(clientValues.EXPO_PUBLIC_ADAPTY_KEY);
  expect(JSON.stringify(withProduction)).not.toContain('private-upload-token');
});
