import { createRealRuntime, RealRuntimeDeps } from '../realRuntime';
import { createSystemClock } from '../systemClock';
import { ApiClient } from '../../adapters/api';
import { AccountProvisioning } from '../../auth/accountProvisioning';
import { Runtime } from '../Runtime';

type Recorded = { path: string; token: string | null };

function harness(overrides: Partial<RealRuntimeDeps> = {}) {
  const calls: Recorded[] = [];
  const refreshed: string[] = [];
  const disposed: string[] = [];
  let account: AccountProvisioning | undefined;
  const auth = {
    port: {
      session: () => ({ kind: 'anonymous' as const, userId: 'u1' }),
      signInWithApple: jest.fn(),
      signInWithGoogle: jest.fn(),
      sendEmailCode: jest.fn(),
      verifyEmailCode: jest.fn(),
      signOut: jest.fn(),
      deleteAccount: jest.fn(),
      subscribe: () => () => undefined,
    },
    start: jest.fn(async () => {
      refreshed.push('auth.start');
    }),
    refresh: jest.fn(async () => {
      refreshed.push('auth.refresh');
    }),
    accessToken: jest.fn(async () => 'live-token'),
    dispose: jest.fn(() => disposed.push('auth')),
  };
  const apiClient: ApiClient = {
    request: jest.fn(async (path, init) => {
      calls.push({ path, token: init.accessToken ?? (await auth.accessToken()) });
      return { status: 200, body: null };
    }),
  };
  const nativeAdapters = {
    steps: {
      authorizationStatus: () => 'granted' as const,
      request: jest.fn(),
      stepsSince: jest.fn(async () => 10),
      subscribe: () => () => undefined,
      refresh: jest.fn(async () => {
        refreshed.push('steps');
        return 10;
      }),
      dispose: jest.fn(() => disposed.push('steps')),
    },
    walking: {
      observe: () => () => undefined,
      start: jest.fn(),
      stop: jest.fn(),
      completeProppedScan: jest.fn(),
      tick: jest.fn(() => refreshed.push('walking')),
      resume: jest.fn(() => refreshed.push('walking.resume')),
      dispose: jest.fn(() => disposed.push('walking')),
    },
    gym: {
      reconcile: jest.fn(async () => {
        refreshed.push('gym');
      }),
      dispose: jest.fn(() => disposed.push('gym')),
    },
    health: {
      bootstrap: jest.fn(async () => {
        refreshed.push('health.bootstrap');
      }),
    },
  };
  const deps: Partial<RealRuntimeDeps> = {
    clock: () => createSystemClock(),
    baseUrl: () => 'https://api.test',
    apiClient: jest.fn(() => apiClient),
    auth: jest.fn((options) => {
      account = options.account;
      return auth as never;
    }),
    nativeAdapters: jest.fn(() => nativeAdapters as never),
    subscription: () => null,
    analytics: () => null,
    notifications: () => null,
    screenTime: () => null,
    gait: () => null,
    sync: () => null,
    ...overrides,
  };
  return { deps, calls, refreshed, disposed, auth, apiClient, nativeAdapters, provisioning: () => account };
}

const build = (overrides: Partial<RealRuntimeDeps> = {}): { runtime: Runtime; h: ReturnType<typeof harness> } => {
  const h = harness(overrides);
  return { runtime: createRealRuntime(h.deps), h };
};

describe('createRealRuntime', () => {
  it('is the real runtime and presents the stand-in paywall until Adapty is bound', () => {
    const { runtime } = build();
    expect(runtime.kind).toBe('real');
    expect(runtime.paywall).toBe('standIn');
    runtime.dispose();
  });

  it('presents the Builder paywall once the Adapty adapter is bound', () => {
    const subscription = {
      entitlement: () => ({ status: 'none' as const, renewsAt: null, offer: null }),
      presentPaywall: jest.fn(),
      restore: jest.fn(),
      identify: jest.fn(),
      logout: jest.fn(),
      subscribe: () => () => undefined,
      resolved: Promise.resolve({ status: 'none' as const, renewsAt: null }),
      dispose: jest.fn(),
    };
    const { runtime } = build({ subscription: () => subscription as never });
    expect(runtime.paywall).toBe('builder');
    expect(runtime.subscription).toBe(subscription);
    runtime.dispose();
  });

  it('gives the API client the auth adapter as its token source', async () => {
    const { runtime, h } = build();
    await runtime.support.send({
      category: 'Problem',
      message: 'hi',
      replyTo: 'a@b.test',
      diagnostics: {
        appVersion: '1',
        appBuild: '1',
        iosVersion: '18',
        deviceModel: 'iPhone',
        entitlementStatus: 'trial',
        permissions: {
          screenTime: 'granted',
          motion: 'granted',
          location: 'always',
          health: 'granted',
          camera: 'granted',
          notifications: 'granted',
        },
        ruleCount: 1,
        lastEnforcementResult: 'locked',
      },
    });
    expect(h.calls).toEqual([{ path: '/v1/support', token: 'live-token' }]);
    runtime.dispose();
  });

  it('hands the auth adapter the VPS provisioning built on that same client', async () => {
    const { runtime, h } = build();
    await h.provisioning()?.provision('token-from-auth');
    expect(h.calls.at(-1)).toEqual({ path: '/v1/user', token: 'token-from-auth' });
    runtime.dispose();
  });

  it('binds the four native adapters', () => {
    const { runtime, h } = build();
    expect(runtime.steps).toBe(h.nativeAdapters.steps);
    expect(runtime.walking).toBe(h.nativeAdapters.walking);
    expect(runtime.gym).toBe(h.nativeAdapters.gym);
    expect(runtime.health).toBe(h.nativeAdapters.health);
    runtime.dispose();
  });

  it('keeps a fake wherever the real binding could not be built', () => {
    const { runtime } = build({ nativeAdapters: () => null });
    expect(runtime.kind).toBe('real');
    expect(runtime.steps.authorizationStatus()).toBeDefined();
    expect(runtime.screenTime.authorizationStatus()).toBeDefined();
    runtime.dispose();
  });

  it('reports a native binding that threw instead of taking the app down', () => {
    const report = jest.fn();
    const { runtime } = build({
      report,
      nativeAdapters: () => {
        throw new Error('no motion module');
      },
    });
    expect(report).toHaveBeenCalledWith('nativeAdapters', expect.any(Error));
    expect(runtime.steps).toBeDefined();
    runtime.dispose();
  });

  it('does the composition foreground work when the host asks, not by listening itself', async () => {
    const { runtime, h } = build();
    await runtime.onForeground?.();
    expect(h.refreshed).toEqual(expect.arrayContaining(['auth.refresh', 'steps', 'walking', 'gym']));
    runtime.dispose();
  });

  it('opens the boot gate once start-up settles', async () => {
    const { runtime, h } = build();
    await runtime.dev.ready();
    expect(h.refreshed).toEqual(expect.arrayContaining(['auth.start', 'health.bootstrap', 'walking.resume']));
    expect(runtime.dev.snapshot().hydrated).toBe(true);
    runtime.dispose();
  });

  it('opens the boot gate on the budget when start-up never answers', async () => {
    jest.useFakeTimers();
    const { runtime } = build({
      bootBudgetMs: 100,
      auth: () =>
        ({
          port: { session: () => ({ kind: 'anonymous', userId: 'u' }), subscribe: () => () => undefined },
          start: () => new Promise<void>(() => undefined),
          refresh: async () => undefined,
          accessToken: async () => null,
          dispose: () => undefined,
        }) as never,
    });
    const gate = runtime.dev.ready();
    jest.advanceTimersByTime(100);
    await expect(gate).resolves.toBeUndefined();
    jest.useRealTimers();
    runtime.dispose();
  });

  it('records analytics into the developer log so Support can quote the session', () => {
    const { runtime } = build();
    runtime.analytics.track('lock_applied', { state: 'locked' });
    expect(runtime.dev.snapshot().events.at(-1)).toMatchObject({ event: 'lock_applied' });
    runtime.dispose();
  });

  it('disposes every real binding it built', () => {
    const { runtime, h } = build();
    runtime.dispose();
    expect(h.disposed).toEqual(expect.arrayContaining(['auth', 'steps', 'walking', 'gym']));
  });
});
