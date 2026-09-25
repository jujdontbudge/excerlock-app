export type ClientConfiguration = {
  environment: 'dev' | 'preview' | 'prod';
  auth: { supabaseUrl: string; supabaseAnonKey: string; apiBaseUrl: string; googleIosClientId: string; googleRedirectUri: string };
  adaptyPublicKey: string;
  posthog: { apiKey: string; host: string };
  sentryDsn: string;
};
export function readClientConfiguration(extra: unknown): ClientConfiguration {
  if (!extra || typeof extra !== 'object') throw new Error('Client configuration is unavailable');
  const root = extra as Record<string, unknown>;
  const text = (group: string, key: string): string => {
    const object = root[group];
    const value = object && typeof object === 'object' ? (object as Record<string, unknown>)[key] : undefined;
    if (typeof value !== 'string' || !value.trim()) throw new Error(`Missing client configuration: ${group}.${key}`);
    return value;
  };
  if (!['dev', 'preview', 'prod'].includes(String(root.environment))) throw new Error('Invalid client environment');
  const config: ClientConfiguration = {
    environment: root.environment as ClientConfiguration['environment'],
    auth: {
      supabaseUrl: text('clientAuth', 'supabaseUrl'), supabaseAnonKey: text('clientAuth', 'supabaseAnonKey'),
      apiBaseUrl: text('clientApi', 'url'), googleIosClientId: text('clientAuth', 'googleIosClientId'),
      googleRedirectUri: text('clientAuth', 'googleRedirectUri'),
    },
    adaptyPublicKey: text('clientSubscription', 'adaptyKey'),
    posthog: { apiKey: text('clientObservability', 'posthogApiKey'), host: text('clientObservability', 'posthogHost') },
    sentryDsn: text('clientObservability', 'sentryDsn'),
  };
  for (const value of [config.auth.supabaseUrl, config.auth.apiBaseUrl, config.posthog.host, config.sentryDsn]) {
    const url = new URL(value);
    if (url.protocol !== 'https:' || url.password) throw new Error('Invalid public client service URL');
  }
  const reverse = config.auth.googleIosClientId.split('.').reverse().join('.');
  if (!config.auth.googleIosClientId.endsWith('.apps.googleusercontent.com') || config.auth.googleRedirectUri !== `${reverse}:/oauthredirect`) throw new Error('Google redirect does not match configured client');
  return config;
}
