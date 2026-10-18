import { requireOptionalNativeModule, type EventSubscription } from 'expo-modules-core';

type TikTokEventsModule = {
  start(appSecret: string, appStoreId: string, tiktokAppId: string, testMode: boolean): Promise<boolean>;
  track(name: string, value: number | null, currency: string | null, flush: boolean): Promise<void>;
  addListener(event: 'onPaymentTrackingOverridden', listener: (payload: { afterSeconds: number }) => void): EventSubscription;
};

export const tiktokEvents = requireOptionalNativeModule<TikTokEventsModule>('ExcerlockTikTokEvents');
