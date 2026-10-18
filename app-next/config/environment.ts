/** Build-only resolver. Do not import this module from the application bundle. */
export type BuildEnvironment = 'dev' | 'preview' | 'prod' | 'lab';
export type EnvironmentValues = Readonly<Record<string, string | undefined>>;
/** Direct prebuild/xcodebuild must embed the same channel as EAS Build. */
export function updateChannel(environment: BuildEnvironment): string {
  const channel = { dev: 'development', preview: 'preview', prod: 'production' }[environment as 'dev' | 'preview' | 'prod'];
  // Lab research builds disable OTA entirely; an update channel is a bug.
  if (!channel) throw new Error('Lab research builds have no OTA update channel');
  return channel;
}
export const CLIENT_ENV_NAMES = [
  'EXPO_PUBLIC_ADAPTY_KEY',
  'EXPO_PUBLIC_POSTHOG_KEY',
  'EXPO_PUBLIC_POSTHOG_HOST',
  'SENTRY_DSN',
  'EXPO_PUBLIC_SUPABASE_URL',
  'EXPO_PUBLIC_SUPABASE_ANON_KEY',
  'EXPO_PUBLIC_API_URL',
  'EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID',
] as const;
export const AD_ENV_NAMES = [
  'EXPO_PUBLIC_META_APP_ID',
  'EXPO_PUBLIC_META_CLIENT_TOKEN',
  'EXPO_PUBLIC_TIKTOK_APP_ID',
  'EXPO_PUBLIC_TIKTOK_APP_SECRET',
] as const;
export const APP_STORE_ID = '6787265352';
const aliases: Partial<Record<(typeof CLIENT_ENV_NAMES)[number], string[]>> = {
  EXPO_PUBLIC_POSTHOG_HOST: ['POSTHOG_HOST'],
  SENTRY_DSN: ['SENTRY_DSN_MOBILE'],
  EXPO_PUBLIC_SUPABASE_URL: ['SUPABASE_URL'],
  EXPO_PUBLIC_SUPABASE_ANON_KEY: ['SUPABASE_ANON_KEY'],
  EXPO_PUBLIC_API_URL: ['EXCERLOCK_API_URL'],
  EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID: ['GOOGLE_IOS_CLIENT_ID', 'GOOGLE_OAUTH_IOS_CLIENT_ID'],
};

export function parseEnvFile(contents: string): Record<string, string> {
  const values: Record<string, string> = Object.create(null);
  for (const line of contents.split(/\r?\n/)) {
    const match = line.match(/^\s*(?:export\s+)?([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*?)\s*$/);
    if (!match) continue;
    const [, key, raw] = match;
    const quote = raw[0];
    values[key] = (quote === '"' || quote === "'") && raw.endsWith(quote)
      ? raw.slice(1, -1)
      : raw.replace(/\s+#.*$/, '').trim();
  }
  return values;
}

export function resolveBuildEnvironment(env: EnvironmentValues): BuildEnvironment {
  const profile = env.EAS_BUILD_PROFILE;
  const explicit = env.EXCERLOCK_ENV;
  if (explicit !== undefined && !['dev', 'preview', 'prod', 'lab'].includes(explicit)) {
    throw new Error('EXCERLOCK_ENV must be dev, preview, prod or lab');
  }
  // The standalone research environment is opt-in twice, exactly like EAS.
  // Without the trace flag it would build an ordinary app with lab identity
  // semantics, so refuse it before anything else can consume it.
  if (explicit === 'lab' && env.EXCERLOCK_LINKED_RECORDER_TRACE !== '1') {
    throw new Error('EXCERLOCK_ENV=lab requires EXCERLOCK_LINKED_RECORDER_TRACE=1');
  }
  const profiles: Record<string, BuildEnvironment> = { development: 'dev', dev: 'dev', preview: 'preview', production: 'prod', prod: 'prod' };
  const fromProfile = profile ? profiles[profile] : undefined;
  if ((profile && !fromProfile) || (!profile && env.EAS_BUILD === 'true')) {
    throw new Error('An explicit supported EAS build profile is required (development, preview, production)');
  }
  if (explicit && fromProfile && explicit !== fromProfile) throw new Error('Build profile and EXCERLOCK_ENV conflict');
  if (explicit) return explicit as BuildEnvironment;
  if (fromProfile) return fromProfile;
  if (env.NODE_ENV === 'production') throw new Error('Release exports require an explicit EXCERLOCK_ENV or EAS build profile');
  return 'dev';
}

export function resolveClientEnvironment(processValues: EnvironmentValues, localValues: EnvironmentValues = {}): Record<string, string | undefined> {
  return Object.fromEntries([...CLIENT_ENV_NAMES, ...AD_ENV_NAMES].map((key) => {
    const names = [key, ...(aliases[key as (typeof CLIENT_ENV_NAMES)[number]] ?? [])];
    // Explicit empty process values must fail validation, not revive stale local credentials.
    const source = names.some((name) => processValues[name] !== undefined) ? processValues : localValues;
    return [key, names.map((name) => source[name]).find((value) => value !== undefined)];
  }));
}

export type ClientExtra = {
  environment: BuildEnvironment;
  clientSubscription?: { adaptyKey: string | undefined };
  clientObservability?: { posthogApiKey: string | undefined; posthogHost: string | undefined; sentryDsn: string | undefined };
  clientAuth?: { supabaseUrl: string | undefined; supabaseAnonKey: string | undefined; googleIosClientId: string | undefined };
  clientApi?: { url: string | undefined };
  clientAdAttribution?: AdAttributionExtra;
};
export type AdAttributionExtra = {
  meta: { appId: string; clientToken: string } | null;
  tiktok: { appId: string; tiktokAppId: string; appSecret: string } | null;
};

/** Placeholders, blanks and malformed values leave that platform out of the build entirely. */
export function adAttributionExtra(values: EnvironmentValues): AdAttributionExtra | undefined {
  const value = (key: (typeof AD_ENV_NAMES)[number]) => values[key]?.trim() ?? '';
  const metaAppId = value('EXPO_PUBLIC_META_APP_ID'), metaToken = value('EXPO_PUBLIC_META_CLIENT_TOKEN');
  const tiktokAppId = value('EXPO_PUBLIC_TIKTOK_APP_ID'), tiktokSecret = value('EXPO_PUBLIC_TIKTOK_APP_SECRET');
  const meta = /^[0-9]{5,20}$/.test(metaAppId) && /^[0-9a-f]{32}$/i.test(metaToken) ? { appId: metaAppId, clientToken: metaToken } : null;
  const tiktok = /^[0-9]{5,25}$/.test(tiktokAppId) && /^[A-Za-z0-9_-]{16,128}$/.test(tiktokSecret) && !/placeholder/i.test(tiktokSecret)
    ? { appId: APP_STORE_ID, tiktokAppId, appSecret: tiktokSecret }
    : null;
  return meta || tiktok ? { meta, tiktok } : undefined;
}

export function buildClientExtra(values: EnvironmentValues, environment: BuildEnvironment, options: { requireUploadToken?: boolean } = {}): ClientExtra {
  // The standalone research lab embeds no client identity group at all: the lab
  // identity graph is local, so there is nothing for a Supabase/Adapty/API
  // placeholder to satisfy. Omitted fields cannot be mistaken for production
  // credentials and cannot drift from the production values they resemble.
  if (environment === 'lab') {
    return { environment };
  }
  if (environment !== 'dev') {
    const required: readonly string[] = options.requireUploadToken ? [...CLIENT_ENV_NAMES, 'SENTRY_AUTH_TOKEN'] : CLIENT_ENV_NAMES;
    const missing = required.filter((key) => !values[key]?.trim());
    if (missing.length) throw new Error(`Missing required build environment: ${missing.join(', ')}`);
    for (const key of ['EXPO_PUBLIC_POSTHOG_HOST', 'SENTRY_DSN', 'EXPO_PUBLIC_SUPABASE_URL', 'EXPO_PUBLIC_API_URL']) {
      let valid = false;
      try {
        const url = new URL(values[key]!);
        valid = url.protocol === 'https:' && !!url.hostname && !url.password && (key === 'SENTRY_DSN' || !url.username);
      } catch { /* Report the key, never its value. */ }
      if (!valid) throw new Error(`${key} must be an HTTPS URL without private credentials`);
    }
    if (environment === 'preview') {
      const api = new URL(values.EXPO_PUBLIC_API_URL!);
      if (api.hostname === 'api.excerlock.com' && api.pathname.replace(/\/$/, '') !== '/testflight') {
        throw new Error('Preview Sandbox verification requires the isolated /testflight API');
      }
    }
  }
  return {
    environment,
    clientSubscription: { adaptyKey: values.EXPO_PUBLIC_ADAPTY_KEY },
    clientObservability: { posthogApiKey: values.EXPO_PUBLIC_POSTHOG_KEY, posthogHost: values.EXPO_PUBLIC_POSTHOG_HOST, sentryDsn: values.SENTRY_DSN },
    clientAuth: { supabaseUrl: values.EXPO_PUBLIC_SUPABASE_URL, supabaseAnonKey: values.EXPO_PUBLIC_SUPABASE_ANON_KEY, googleIosClientId: values.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID },
    clientApi: { url: values.EXPO_PUBLIC_API_URL },
    ...(adAttributionExtra(values) ? { clientAdAttribution: adAttributionExtra(values) } : {}),
  };
}
