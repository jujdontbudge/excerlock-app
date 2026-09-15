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
test('the production parser refuses the lab environment and any unknown label', () => {
  // Regression: research bundles resolve the lab-local `@client-services`
  // module and never call this parser, so accepting `lab` here would only let a
  // production identity graph boot under a research label. A lab build embeds
  // `{ environment: 'lab' }` and nothing else, which must stay unusable as a
  // production configuration.
  expect(() => readClientConfiguration({ environment: 'lab' })).toThrow('Invalid client environment');
  expect(() => readClientConfiguration({ ...extra, environment: 'lab' })).toThrow('Invalid client environment');
  expect(() => readClientConfiguration({ ...extra, environment: 'lab-local' })).toThrow('Invalid client environment');
  expect(() => readClientConfiguration({ ...extra, environment: 'research' })).toThrow('Invalid client environment');
});
