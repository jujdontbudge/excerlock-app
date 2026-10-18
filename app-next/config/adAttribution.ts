import type { ExpoConfig } from 'expo/config';
import type { AdAttributionExtra } from './environment';

type ExpoPlugin = NonNullable<ExpoConfig['plugins']>[number];

export const TRACKING_PERMISSION = 'Lets us see which ads brought you to ExcerLock, so we can show them to people like you.';

/** The ATT string is always present, because asking without it crashes. Meta plist keys and SKAdNetwork IDs need real credentials. */
export function adPlugins(ad: AdAttributionExtra | undefined): ExpoPlugin[] {
  return [
    ['expo-tracking-transparency', { userTrackingPermission: TRACKING_PERMISSION }],
    ...(ad?.meta ? [['./plugins/withAdAttribution', { meta: ad.meta }] as ExpoPlugin] : []),
  ];
}
