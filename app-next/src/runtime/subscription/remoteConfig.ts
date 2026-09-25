import type { AdaptyRemoteConfig } from './adaptySdk';

export function deviceLocale(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().locale || '';
  } catch {
    return '';
  }
}

const normalize = (value: string) => value.trim().toLowerCase().replace(/_/g, '-');

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
