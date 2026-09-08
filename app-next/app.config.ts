import type { ConfigContext, ExpoConfig } from 'expo/config';
import { readFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';

/**
 * Client configuration, read from the environment with `~/.excerlock/env` as the local fallback (the
 * pattern `app/app.config.ts` established). EAS supplies `process.env`; the dotfile is never
 * committed and never read at runtime, only while the config is evaluated.
 *
 * Every value the real runtime needs is listed here, because `extra` is the one place a module may
 * read configuration from. `guardrails/client-config.test.ts` holds that list, so a value nobody can
 * set in EAS fails the build instead of going dark on a device.
 *
 * Only publishable values belong here. `SUPABASE_SERVICE_ROLE_KEY` is server-only and must never
 * reach `extra`.
 */
const CLIENT_ENV_NAMES = [
  'EXPO_PUBLIC_SUPABASE_URL',
  'EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY',
  'EXPO_PUBLIC_API_URL',
  'EXPO_PUBLIC_ADAPTY_KEY',
  'GOOGLE_OAUTH_WEB_CLIENT_ID',
  'GOOGLE_OAUTH_IOS_CLIENT_ID',
  'EXPO_PUBLIC_POSTHOG_KEY',
  'POSTHOG_HOST',
  'SENTRY_DSN_MOBILE',
] as const;

type ClientEnvName = (typeof CLIENT_ENV_NAMES)[number];

/**
 * Names an older dotfile may still use. They resolve so an existing `~/.excerlock/env` does not go
 * dark, but nothing new should be set under them and EAS is configured with the names above.
 */
const LEGACY_ALIASES: Readonly<Record<ClientEnvName, readonly string[]>> = {
  EXPO_PUBLIC_SUPABASE_URL: ['SUPABASE_URL'],
  EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY: ['SUPABASE_PUBLISHABLE_KEY', 'SUPABASE_ANON_KEY'],
  EXPO_PUBLIC_API_URL: [],
  EXPO_PUBLIC_ADAPTY_KEY: [],
  GOOGLE_OAUTH_WEB_CLIENT_ID: [],
  GOOGLE_OAUTH_IOS_CLIENT_ID: [],
  EXPO_PUBLIC_POSTHOG_KEY: [],
  POSTHOG_HOST: [],
  SENTRY_DSN_MOBILE: [],
};

type ClientEnvironment = Partial<Record<ClientEnvName, string>>;

function readDotfile(): Record<string, string> {
  let dotfile = '';
  try {
    dotfile = readFileSync(join(homedir(), '.excerlock', 'env'), 'utf8');
  } catch {
    // EAS supplies process.env; the local dotfile is an optional fallback.
  }
  return Object.fromEntries(
    dotfile.split('\n').flatMap((rawLine) => {
      const line = rawLine.trim().replace(/^export\s+/, '');
      const separator = line.indexOf('=');
      if (!line || line.startsWith('#') || separator <= 0) return [];
      const name = line.slice(0, separator).trim();
      const raw = line.slice(separator + 1).trim();
      const quoted = (raw.startsWith('"') && raw.endsWith('"')) || (raw.startsWith("'") && raw.endsWith("'"));
      return [[name, quoted ? raw.slice(1, -1) : raw]];
    }),
  );
}

function loadClientEnvironment(): ClientEnvironment {
  const local = readDotfile();
  const read = (name: string) => process.env[name] ?? local[name];
  return Object.fromEntries(
    CLIENT_ENV_NAMES.map((name) => [
      name,
      [name, ...LEGACY_ALIASES[name]].map(read).find((value) => value),
    ]).filter(([, value]) => value),
  );
}

/** The reversed iOS client id Google's sign-in sheet returns to. Absent until Johan creates it. */
function googleUrlScheme(iosClientId: string | undefined): string | undefined {
  if (!iosClientId?.endsWith('.apps.googleusercontent.com')) return undefined;
  return `com.googleusercontent.apps.${iosClientId.slice(0, -'.apps.googleusercontent.com'.length)}`;
}

export default ({ config }: ConfigContext): ExpoConfig => {
  if (!config.name || !config.slug) throw new Error('app.json must define Expo name and slug');
  const environment = loadClientEnvironment();
  const iosUrlScheme = googleUrlScheme(environment.GOOGLE_OAUTH_IOS_CLIENT_ID);
  return {
    ...config,
    name: config.name,
    slug: config.slug,
    plugins: [
      ...(config.plugins ?? []),
      // The Google plugin writes the reversed-client-id URL scheme into the iOS project, so it can
      // only be added once that client exists.
      ...(iosUrlScheme ? [['@react-native-google-signin/google-signin', { iosUrlScheme }] as [string, unknown]] : []),
    ],
    extra: {
      ...config.extra,
      clientAuth: {
        supabaseUrl: environment.EXPO_PUBLIC_SUPABASE_URL,
        // The publishable key replaces the legacy anon key; both are safe in the bundle.
        supabaseKey: environment.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
        apiBaseUrl: environment.EXPO_PUBLIC_API_URL,
        googleWebClientId: environment.GOOGLE_OAUTH_WEB_CLIENT_ID,
        googleIosClientId: environment.GOOGLE_OAUTH_IOS_CLIENT_ID,
      },
      // Expo inlines `EXPO_PUBLIC_ADAPTY_KEY` at build time, so the adapter reads the environment
      // first; this is the second source, for a build configured only through the dotfile.
      adaptyKey: environment.EXPO_PUBLIC_ADAPTY_KEY,
      clientObservability: {
        posthogApiKey: environment.EXPO_PUBLIC_POSTHOG_KEY,
        posthogHost: environment.POSTHOG_HOST,
        sentryDsn: environment.SENTRY_DSN_MOBILE,
      },
    },
  };
};
