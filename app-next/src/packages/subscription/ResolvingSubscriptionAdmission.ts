import type { SubscriptionBackend } from '../platform/subscriptionBackend';
import type { SubscriptionAdmissionPort } from '../ports/SubscriptionPort';

export function resolvingSubscriptionAdmission(options: {
  resolveBackend(): Promise<SubscriptionBackend | null>;
  createAdmission(backend: SubscriptionBackend): SubscriptionAdmissionPort;
}): SubscriptionAdmissionPort {
  let port: SubscriptionAdmissionPort | null = null;
  let resolving: Promise<SubscriptionAdmissionPort | null> | null = null;
  let generation = 0;
  const resolve = async () => {
    for (let attempt = 0; attempt < 2; attempt += 1) {
      let timer: ReturnType<typeof setTimeout> | undefined;
      try {
        const backend = await Promise.race([
          options.resolveBackend(),
          new Promise<null>((done) => { timer = setTimeout(() => done(null), 8000); }),
        ]);
        if (backend) {
          port = options.createAdmission(backend);
          return port;
        }
      } catch {
      } finally {
        if (timer) clearTimeout(timer);
      }
      if (attempt === 0) await new Promise((done) => setTimeout(done, 250));
    }
    return null;
  };
  const prepare = () => {
    if (port) return Promise.resolve(port);
    if (!resolving) resolving = resolve().finally(() => { resolving = null; });
    return resolving;
  };
  void prepare();
  return {
    current: (identity) => port?.current(identity) ?? null,
    remainingMs: (identity) => port?.remainingMs(identity) ?? 0,
    invalidate: () => { generation += 1; port?.invalidate(); },
    verify: async (identity) => {
      const started = generation;
      const admission = await prepare();
      if (started !== generation) return { type: 'unavailable', reason: 'identity_changed' };
      if (!admission) return { type: 'unavailable', reason: 'store_environment_unavailable' };
      return admission.verify(identity);
    },
  };
}
