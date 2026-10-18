import { tiktokEvents } from '../../../../../modules/excerlock-tiktok-events';
import type { AdSink } from '../../AdAttribution';
import type { AdEvent } from '../adEvents';

const TIKTOK_NAMES: Record<AdEvent['name'], string> = {
  registration: 'Registration',
  view_content: 'ViewContent',
  start_trial: 'StartTrial',
  subscribe: 'Subscribe',
};

export type TikTokCredentials = { appId: string; tiktokAppId: string; appSecret: string };

export function tiktokSink(options: {
  credentials: TikTokCredentials | null;
  testMode(): Promise<boolean>;
  reportError(error: unknown): void;
}): AdSink | null {
  const native = tiktokEvents;
  const credentials = options.credentials;
  if (!native || !credentials) return null;
  return {
    name: 'tiktok',
    start: async () => {
      native.addListener('onPaymentTrackingOverridden', ({ afterSeconds }) =>
        options.reportError(new Error(`TikTok server config re-enabled payment tracking; stopped after ${afterSeconds}s`)));
      const testMode = await options.testMode();
      await native.start(credentials.appSecret, credentials.appId, credentials.tiktokAppId, testMode);
    },
    setConsent: async () => undefined,
    send: (event) => event.name === 'subscribe'
      ? native.track(TIKTOK_NAMES.subscribe, event.value, event.currency, true)
      : native.track(TIKTOK_NAMES[event.name], null, null, event.name === 'start_trial'),
  };
}
