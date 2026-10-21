import type { AuthPort } from '../../../ports/AuthPort';
import type { SubscriptionAdmissionPort } from '../../../ports/SubscriptionPort';
import { createServerSubscriptionAdmission } from '../../../subscription/ServerSubscriptionAdmission';
import { resolvingSubscriptionAdmission } from '../../../subscription/ResolvingSubscriptionAdmission';
import { FakeContext } from '../FakeContext';

export function reviewAdmission(ctx: FakeContext, auth: AuthPort): SubscriptionAdmissionPort & { prepare(): void } {
  let port: SubscriptionAdmissionPort | null = null;
  let attempts = 0;
  let environmentReads = 0;
  const prepare = () => {
    if (port || !ctx.scenario.admissionFailure) return;
    const mode = ctx.scenario.admissionFailure;
    port = resolvingSubscriptionAdmission({
      resolveBackend: async () => {
        environmentReads += 1;
        ctx.log('review_store_environment', { attempt: environmentReads, mode });
        if (mode === 'storeTimeout') return new Promise(() => undefined);
        if (mode === 'storeNull' || (mode === 'storeRetry' && environmentReads <= 4)) return null;
        return { apiBaseUrl: 'https://review.example.test/testflight', environment: 'sandbox' };
      },
      createAdmission: (backend) => createServerSubscriptionAdmission({
        ...backend,
        getIdentity: () => auth.identity(),
        getAuthContext: async () => {
          const live = auth.identity();
          return live.userId ? { userId: live.userId, generation: live.generation, accessToken: 'scripted-review-token' } : null;
        },
        fetchImpl: async (input, init) => {
          attempts += 1;
          ctx.log('review_admission_request', { attempt: attempts, mode, path: new URL(String(input)).pathname });
          if (mode === 'offline' || (mode === 'networkRetry' && attempts === 1)) throw new TypeError('Network request failed');
          if (mode === 'serverError' || (mode === 'retry' && attempts === 1)) return new Response('{}', { status: 503 });
          if (mode === 'serverTimeout' || (mode === 'timeoutRetry' && attempts === 1)) return new Promise((_resolve, reject) => init?.signal?.addEventListener('abort', () => reject(new Error('Aborted'))));
          const active = ['retry', 'storeRetry', 'networkRetry', 'timeoutRetry', 'unknownRetry'].includes(mode) && (mode !== 'unknownRetry' || attempts > 1);
          return new Response(JSON.stringify({
            accountId: auth.identity().userId,
            verifiedAt: ctx.clock.now(),
            authorization: {
              environment: backend.environment,
              status: active ? 'active' : mode === 'serverUnknown' || mode === 'unknownRetry' ? 'unknown' : 'none',
              hasAccess: active,
              expiresAt: active ? '2026-10-07T15:00:00.000Z' : null,
              observedAt: active ? ctx.clock.now() : null,
              source: active ? 'webhook' : null,
            },
          }));
        },
      }),
    });
  };
  return {
    prepare,
    current: (identity) => port?.current(identity) ?? null,
    remainingMs: (identity) => port?.remainingMs(identity) ?? 0,
    invalidate: () => { port?.invalidate(); port = null; attempts = 0; environmentReads = 0; },
    verify: async (identity) => { prepare(); return port!.verify(identity); },
  };
}
