import { requireOptionalNativeModule } from 'expo-modules-core';

type MetaEventsModule = {
  isConfigured(): boolean;
  setAdvertiserIDCollection(enabled: boolean): Promise<void>;
  anonymousID(): Promise<string | null>;
  log(name: string, value: number | null, currency: string | null, flush: boolean): Promise<void>;
};

export const metaEvents = requireOptionalNativeModule<MetaEventsModule>('ExcerlockMetaEvents');
