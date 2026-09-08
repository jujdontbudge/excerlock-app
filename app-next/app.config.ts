import type { ConfigContext, ExpoConfig } from 'expo/config';
import { readFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';

/**
 * The vendor keys the client needs at runtime. They live in `~/.excerlock/env` locally and in the
 * EAS environment on a build server, and are copied into `expo.extra` here — never committed.
 */
const CLIENT_ENV_NAMES = [
  'EXPO_PUBLIC_POSTHOG_KEY',
  'POSTHOG_HOST',
  'SENTRY_DSN_MOBILE',
] as const;

function loadClientEnvironment(): Record<string, string | undefined> {
  let dotfile = '';
  try {
    dotfile = readFileSync(join(homedir(), '.excerlock', 'env'), 'utf8');
  } catch {
    // EAS supplies process.env; the local dotfile is an optional fallback.
  }
  const localValues = Object.fromEntries(
    dotfile.split('\n').flatMap((rawLine) => {
      const line = rawLine.trim().replace(/^export\s+/, '');
      const separator = line.indexOf('=');
      if (!line || line.startsWith('#') || separator <= 0) return [];
      const name = line.slice(0, separator).trim();
      const rawValue = line.slice(separator + 1).trim();
      const quoted =
        (rawValue.startsWith('"') && rawValue.endsWith('"')) ||
        (rawValue.startsWith("'") && rawValue.endsWith("'"));
      return [[name, quoted ? rawValue.slice(1, -1) : rawValue]];
    }),
  );
  return Object.fromEntries(
    CLIENT_ENV_NAMES.map((name) => [name, process.env[name] ?? localValues[name]]),
  );
}

export default ({ config }: ConfigContext): ExpoConfig => {
  if (!config.name || !config.slug) {
    throw new Error('app.json must define Expo name and slug');
  }
  const environment = loadClientEnvironment();
  return {
    ...config,
    name: config.name,
    slug: config.slug,
    extra: {
      ...config.extra,
      clientObservability: {
        posthogApiKey: environment.EXPO_PUBLIC_POSTHOG_KEY,
        posthogHost: environment.POSTHOG_HOST,
        sentryDsn: environment.SENTRY_DSN_MOBILE,
      },
    },
  };
};
