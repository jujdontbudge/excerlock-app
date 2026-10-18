import type { AdAttributionPort, AdConversion, AdStoreEnvironment, TrackingConsent } from '../ports/AdAttributionPort';
import { allowListed, type AdEvent } from './lib/adEvents';
import { ledgerKey, SentLedger, type LedgerStorage } from './lib/sentLedger';

export type { AdEvent } from './lib/adEvents';
export type { LedgerStorage } from './lib/sentLedger';
export { ledgerKey, LEDGER_PREFIX } from './lib/sentLedger';

export type AdSink = {
  readonly name: 'meta' | 'tiktok';
  start(consent: TrackingConsent): Promise<void>;
  setConsent(consent: TrackingConsent): Promise<void>;
  send(event: AdEvent): Promise<void>;
};

export type TrackingConsentSource = {
  read(): Promise<TrackingConsent>;
  request(): Promise<TrackingConsent>;
  onForeground(callback: () => void): () => void;
};

export type AdAttributionDeps = {
  sinks: readonly AdSink[];
  consent: TrackingConsentSource;
  durableLedger: LedgerStorage;
  installLedger: LedgerStorage;
  acceptsConversion(environment: AdStoreEnvironment): boolean;
  prompt<T>(run: () => Promise<T>): Promise<T>;
  reportError(error: unknown): void;
  limits?: { sinkStartMs?: number; ledgerMs?: number; consentPromptMs?: number };
};

type SinkState = { sink: AdSink; status: 'waiting' | 'ready' | 'failed'; queue: AdEvent[] };

const QUEUE_LIMIT = 50;
const timeout = <T>(work: Promise<T>, ms: number, fallback: () => T): Promise<T> => {
  let timer: ReturnType<typeof setTimeout> | undefined;
  return Promise.race([
    work,
    new Promise<T>((resolve) => { timer = setTimeout(() => resolve(fallback()), ms); }),
  ]).finally(() => { if (timer) clearTimeout(timer); });
};

export const inactiveAdAttribution: AdAttributionPort = {
  start: () => undefined,
  requestTrackingConsent: async () => 'undetermined',
  onboardingFinished: () => undefined,
  paywallViewed: () => undefined,
  trialStarted: async () => undefined,
  subscriptionStarted: async () => undefined,
};

export function createAdAttribution(deps: AdAttributionDeps): AdAttributionPort {
  const limits = { sinkStartMs: 10_000, ledgerMs: 3_000, consentPromptMs: 120_000, ...deps.limits };
  const states: SinkState[] = deps.sinks.map((sink) => ({ sink, status: 'waiting', queue: [] }));
  const durable = new SentLedger(deps.durableLedger);
  const install = new SentLedger(deps.installLedger);
  let consent: TrackingConsent = 'undetermined';
  let started = false;
  const report = (error: unknown) => {
    try { deps.reportError(error); } catch {}
  };
  const deliver = (state: SinkState, event: AdEvent) => {
    void Promise.resolve().then(() => state.sink.send(event)).catch(report);
  };
  const dispatch = (event: AdEvent) => {
    let safe: AdEvent;
    try { safe = allowListed(event); }
    catch (error) { report(error); return; }
    for (const state of states) {
      if (state.status === 'ready') deliver(state, safe);
      else if (state.status === 'waiting' && state.queue.length < QUEUE_LIMIT) state.queue.push(safe);
    }
  };
  const applyConsent = (next: TrackingConsent) => {
    if (next === consent) return;
    consent = next;
    for (const state of states)
      if (state.status === 'ready') void Promise.resolve().then(() => state.sink.setConsent(next)).catch(report);
  };
  const readConsent = () => deps.consent.read().catch((error: unknown) => { report(error); return consent; });
  const startSink = async (state: SinkState) => {
    try {
      const startedWith = consent;
      const ready = await timeout(state.sink.start(startedWith).then(() => true), limits.sinkStartMs, () => false);
      if (!ready) throw new Error(`${state.sink.name} ad SDK did not start in time`);
      state.status = 'ready';
      if (consent !== startedWith) void Promise.resolve().then(() => state.sink.setConsent(consent)).catch(report);
      const queued = state.queue;
      state.queue = [];
      queued.forEach((event) => deliver(state, event));
    } catch (error) {
      state.status = 'failed';
      state.queue = [];
      report(error);
    }
  };
  const claim = (ledger: SentLedger, keys: string[]) =>
    timeout(ledger.claim(keys), limits.ledgerMs, () => false).catch((error: unknown) => { report(error); return false; });
  const conversion = async (name: 'start_trial' | 'subscribe', input: AdConversion) => {
    if (!states.length || !input.account || !deps.acceptsConversion(input.storeEnvironment)) return;
    const keys = (['start_trial', 'subscribe'] as const).flatMap((event) => [
      ledgerKey(event, 'account', input.account),
      ...(input.originalTransaction ? [ledgerKey(event, 'transaction', input.originalTransaction)] : []),
    ]);
    if (!(await claim(durable, keys))) return;
    dispatch(name === 'start_trial' ? { name } : { name, value: input.value, currency: input.currency });
  };
  return {
    start() {
      if (started || !states.length) return;
      started = true;
      deps.consent.onForeground(() => void readConsent().then(applyConsent));
      void readConsent().then((current) => {
        consent = current;
        return Promise.all(states.map(startSink));
      }).catch(report);
    },
    async requestTrackingConsent() {
      if (!states.length) return 'undetermined';
      try {
        const current = await readConsent();
        const answer = current === 'undetermined'
          ? await timeout(deps.prompt(() => deps.consent.request()), limits.consentPromptMs, () => current)
          : current;
        applyConsent(answer);
        return answer;
      } catch (error) {
        report(error);
        return consent;
      }
    },
    onboardingFinished() {
      if (!states.length) return;
      void claim(install, [ledgerKey('registration', 'install')]).then((claimed) => {
        if (claimed) dispatch({ name: 'registration' });
      });
    },
    paywallViewed() {
      if (states.length) dispatch({ name: 'view_content' });
    },
    trialStarted: (input) => conversion('start_trial', input).catch(report),
    subscriptionStarted: (input) => conversion('subscribe', input).catch(report),
  };
}
