import Constants from 'expo-constants';

/**
 * The public Adapty SDK key. It lives in `~/.excerlock/env` as `EXPO_PUBLIC_ADAPTY_KEY` and is never
 * committed; Expo inlines `EXPO_PUBLIC_*` at build time. `extra.adaptyKey` is the second source, for a
 * build that supplies config through `app.config.ts` instead of the environment.
 *
 * Null means this build cannot sell anything: the runtime keeps the fake rather than half-activating.
 */
export function adaptyKey(): string | null {
  const extra = Constants.expoConfig?.extra as { adaptyKey?: unknown } | undefined;
  const candidates = [process.env.EXPO_PUBLIC_ADAPTY_KEY, extra?.adaptyKey];
  const key = candidates.find((value): value is string => typeof value === 'string' && value.trim().length > 0);
  return key?.trim() ?? null;
}
