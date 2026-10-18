export type TrackingConsent = 'granted' | 'denied' | 'undetermined';

export type AdStoreEnvironment = 'production' | 'sandbox' | 'xcode' | 'unknown';

export type AdConversion = {
  account: string;
  originalTransaction: string | null;
  value: number;
  currency: string;
  storeEnvironment: AdStoreEnvironment;
};

export interface AdAttributionPort {
  start(): void;
  requestTrackingConsent(): Promise<TrackingConsent>;
  onboardingFinished(): void;
  paywallViewed(): void;
  trialStarted(conversion: AdConversion): Promise<void>;
  subscriptionStarted(conversion: AdConversion): Promise<void>;
}
