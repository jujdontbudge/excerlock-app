import type { AdaptyRemoteConfig } from './adaptySdk';

/** The device's preferred locale (e.g. `en-US`), or empty when the platform cannot report one. */
export function deviceLocale(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().locale || '';
  } catch {
    return '';
  }
}

const normalize = (value: string) => value.trim().toLowerCase().replace(/_/g, '-');

/**
 * Adapty ships one remote config per dashboard locale (`flow.remoteConfigs`).
 * Prefer the entry whose locale matches the device, then the same language,
 * then the first entry so a single dashboard locale still serves every user.
 */
export function pickRemoteConfig(
  configs: readonly AdaptyRemoteConfig[] | undefined,
  locale: string,
): AdaptyRemoteConfig | undefined {
  if (!configs?.length) return undefined;
  const target = normalize(locale);
  if (!target) return configs[0];
  const exact = configs.find((config) => normalize(config.lang) === target);
  if (exact) return exact;
  const language = target.split('-')[0];
  return configs.find((config) => normalize(config.lang).split('-')[0] === language) ?? configs[0];
}
