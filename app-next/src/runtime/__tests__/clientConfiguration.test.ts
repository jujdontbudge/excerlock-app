import { readClientConfiguration } from '../clientConfiguration';
const extra = {
  environment: 'preview', clientAuth: { supabaseUrl: 'https://example.supabase.co', supabaseAnonKey: 'public', googleIosClientId: 'client.apps.googleusercontent.com', googleRedirectUri: 'com.googleusercontent.apps.client:/oauthredirect' },
  clientApi: { url: 'https://api.example.com' }, clientSubscription: { adaptyKey: 'public' },
  clientObservability: { posthogApiKey: 'public', posthogHost: 'https://us.i.posthog.com', sentryDsn: 'https://public@example.com/1' },
};
test('reads exact public extras without copying private upload configuration', () => {
  const result = readClientConfiguration({ ...extra, SENTRY_AUTH_TOKEN: 'private' });
  expect(result.auth.apiBaseUrl).toBe(extra.clientApi.url);
  expect(JSON.stringify(result)).not.toContain('private');
});
test('missing configuration and mismatched redirect fail before native construction', () => {
  expect(() => readClientConfiguration({})).toThrow('environment');
  expect(() => readClientConfiguration({ ...extra, clientAuth: { ...extra.clientAuth, googleRedirectUri: 'excerlock://auth' } })).toThrow('redirect');
  expect(() => readClientConfiguration({ ...extra, clientApi: { url: 'http://api.example.com' } })).toThrow('URL');
});
test('accepts the standalone lab research environment and rejects unknown ones', () => {
  expect(readClientConfiguration({ ...extra, environment: 'lab' }).environment).toBe('lab');
  expect(() => readClientConfiguration({ ...extra, environment: 'research' })).toThrow('Invalid client environment');
});
