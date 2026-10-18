import { metaEvents } from '../../../../../modules/excerlock-meta-events';
import type { AdSink } from '../../AdAttribution';
import type { AdEvent } from '../adEvents';

const META_NAMES: Record<AdEvent['name'], string> = {
  registration: 'fb_mobile_complete_registration',
  view_content: 'fb_mobile_content_view',
  start_trial: 'StartTrial',
  subscribe: 'Subscribe',
};

export function metaSink(): AdSink | null {
  const native = metaEvents;
  if (!native?.isConfigured()) return null;
  return {
    name: 'meta',
    start: (consent) => native.setAdvertiserIDCollection(consent === 'granted'),
    setConsent: (consent) => native.setAdvertiserIDCollection(consent === 'granted'),
    send: (event) => event.name === 'subscribe'
      ? native.log(META_NAMES.subscribe, event.value, event.currency, true)
      : native.log(META_NAMES[event.name], null, null, event.name === 'start_trial'),
  };
}

export async function metaAnonymousId(): Promise<string | null> {
  if (!metaEvents?.isConfigured()) return null;
  return metaEvents.anonymousID();
}
