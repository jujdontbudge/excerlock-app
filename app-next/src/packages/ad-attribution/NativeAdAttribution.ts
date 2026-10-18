import type { AdAttributionPort } from '../ports/AdAttributionPort';
import { createAdAttribution, type AdSink } from './AdAttribution';
import { installLedger, keychainLedger } from './lib/native/ledgerStorage';
import { metaAnonymousId, metaSink } from './lib/native/metaSink';
import { tiktokSink, type TikTokCredentials } from './lib/native/tiktokSink';
import { nativeTrackingConsent } from './lib/native/trackingConsent';

export type NativeAdAttributionOptions = {
  tiktok: TikTokCredentials | null;
  productionStore(): Promise<boolean>;
  prompt<T>(run: () => Promise<T>): Promise<T>;
  reportError(error: unknown): void;
};

export function createNativeAdAttribution(options: NativeAdAttributionOptions): AdAttributionPort & { metaAnonymousId(): Promise<string | null> } {
  const sinks = [
    metaSink(),
    tiktokSink({
      credentials: options.tiktok,
      testMode: async () => !(await options.productionStore()),
      reportError: (error) => options.reportError(error),
    }),
  ].filter((sink): sink is AdSink => sink !== null);
  const port = createAdAttribution({
    sinks,
    consent: nativeTrackingConsent,
    durableLedger: keychainLedger,
    installLedger,
    acceptsConversion: (environment) => environment !== 'xcode',
    prompt: (run) => options.prompt(run),
    reportError: (error) => options.reportError(error),
    limits: { sinkStartMs: 30_000 },
  });
  return { ...port, metaAnonymousId: () => metaAnonymousId().catch(() => null) };
}
