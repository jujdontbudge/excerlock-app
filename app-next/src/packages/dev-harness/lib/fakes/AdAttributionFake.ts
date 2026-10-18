import AsyncStorage from '@react-native-async-storage/async-storage';
import { createAdAttribution, inactiveAdAttribution, type AdEvent, type AdSink, type LedgerStorage } from '../../../ad-attribution/AdAttribution';
import type { AdAttributionPort, TrackingConsent } from '../../../ports/AdAttributionPort';
import { FakeContext } from '../FakeContext';

const NAMES: AdEvent['name'][] = ['registration', 'view_content', 'start_trial', 'subscribe'];
const LABELS: Record<AdEvent['name'], string> = { registration: 'registration', view_content: 'view', start_trial: 'trial', subscribe: 'subscribe' };

const storage: LedgerStorage = {
  getItem: (key) => AsyncStorage.getItem(key),
  setItem: (key, value) => AsyncStorage.setItem(key, value),
};

export type AdAttributionFakeInstance = AdAttributionPort & { reset(): void };

export function AdAttributionFake(ctx: FakeContext): AdAttributionFakeInstance {
  let counts = { meta: new Map<string, number>(), tiktok: new Map<string, number>() };
  let consents: Record<'meta' | 'tiktok', TrackingConsent | null> = { meta: null, tiktok: null };
  let errors = 0;
  const publish = () => {
    const line = (sink: 'meta' | 'tiktok') => NAMES.map((name) => `${LABELS[name]} ${counts[sink].get(name) ?? 0}`).join(' ');
    ctx.update({ adEvents: { meta: line('meta'), tiktok: line('tiktok'), consent: `meta ${consents.meta ?? 'not started'} tiktok ${consents.tiktok ?? 'not started'} · errors ${errors}` } });
  };
  const sink = (name: 'meta' | 'tiktok'): AdSink => ({
    name,
    start: async (consent) => {
      if (ctx.scenario.ads?.failure === 'start') throw new Error(`Simulated ${name} SDK start failure`);
      consents[name] = consent;
      publish();
    },
    setConsent: async (consent) => {
      consents[name] = consent;
      ctx.log(`ad_${name}_consent`, { consent });
      publish();
    },
    send: async (event) => {
      if (ctx.scenario.ads?.failure === 'send') throw new Error(`Simulated ${name} SDK log failure`);
      counts[name].set(event.name, (counts[name].get(event.name) ?? 0) + 1);
      ctx.log(`ad_${name}`, { ...event });
      publish();
    },
  });
  const build = (): AdAttributionPort => ctx.scenario.ads?.unconfigured ? inactiveAdAttribution : createAdAttribution({
    sinks: [sink('meta'), sink('tiktok')],
    consent: {
      read: async () => ctx.scenario.ads?.tracking ?? 'undetermined',
      request: async () => {
        const answer = ctx.scenario.ads?.answer ?? 'granted';
        ctx.log('ad_tracking_prompt', { answer });
        ctx.scenario = { ...ctx.scenario, ads: { ...ctx.scenario.ads, tracking: answer } };
        return answer;
      },
      onForeground: () => () => undefined,
    },
    durableLedger: storage,
    installLedger: storage,
    acceptsConversion: (environment) => environment !== 'xcode',
    prompt: (run) => run(),
    reportError: (error) => {
      errors += 1;
      ctx.log('ad_error', { message: error instanceof Error ? error.message : String(error) });
      publish();
    },
  });
  let current = build();
  return {
    start: () => current.start(),
    requestTrackingConsent: () => current.requestTrackingConsent(),
    onboardingFinished: () => current.onboardingFinished(),
    paywallViewed: () => current.paywallViewed(),
    trialStarted: (conversion) => current.trialStarted(conversion),
    subscriptionStarted: (conversion) => current.subscriptionStarted(conversion),
    reset() {
      counts = { meta: new Map(), tiktok: new Map() };
      consents = { meta: null, tiktok: null };
      errors = 0;
      current = build();
      current.start();
      publish();
    },
  };
}
