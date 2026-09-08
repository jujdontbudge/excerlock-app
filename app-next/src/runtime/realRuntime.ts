import { createAnalyticsAdapter, tapAnalytics } from '../adapters/analytics';
import type { AnalyticsAdapter } from '../adapters/analytics';
import { ApiClient, ApiClientOptions, apiBaseUrl, createApiClient, createHttpSupportPort, createVpsProvisioning } from '../adapters/api';
import { createHttpReachability } from '../adapters/api/reachability';
import { createNativeAdapters, NativeAdapters } from '../adapters/nativeEngine';
import { expoNotifications } from '../adapters/notifications/expoNotifications';
import type { ScreenTimeAdapter } from '../adapters/screentime/ScreenTimeAdapter';
import { adaptyKey } from '../adapters/subscription/adaptyKey';
import type { SubscriptionAdapter } from '../adapters/subscription/AdaptySubscriptionAdapter';
import { createSyncAdapter } from '../adapters/sync/SyncAdapter';
import { createSyncClient } from '../adapters/sync/SyncClient';
import type { AccountProvisioning } from '../auth/accountProvisioning';
import type { SupabaseAuth } from '../auth/SupabaseAuthAdapter';
import { AnalyticsPort } from '../ports/AnalyticsPort';
import { ClockPort } from '../ports/ClockPort';
import { GaitPort } from '../ports/GaitPort';
import { NotificationsPort } from '../ports/NotificationsPort';
import { ReachabilityPort } from '../ports/ReachabilityPort';
import { SupportPort } from '../ports/SupportPort';
import { SyncPort } from '../ports/SyncPort';
import { createFallbackPorts, FallbackPorts } from './fallbackPorts';
import { nativeGait } from './NativeGait';
import { nativeScreenTime } from './NativeScreenTime';
import { nativePlaceSearch } from './NativePlaceSearch';
import { createRealControls, RealControls } from './realControls';
import { Runtime } from './Runtime';
import { createSystemClock } from './systemClock';

/** How long the splash waits for start-up before letting the app in on what it already knows. */
export const BOOT_BUDGET_MS = 4_000;

/** Where a binding that could not be built is reported. Never user-facing. */
export type RealRuntimeScope =
  | 'clock'
  | 'auth'
  | 'subscription'
  | 'analytics'
  | 'notifications'
  | 'screenTime'
  | 'gait'
  | 'nativeAdapters'
  | 'sync'
  | 'boot'
  | 'foreground';

type DisposableClock = ClockPort & { dispose(): void };

/**
 * Every real binding as a factory, so a test composes the runtime without loading a native module.
 * The defaults are the production ones; nothing here is a strategy the product can pick.
 */
export type RealRuntimeDeps = {
  clock(): DisposableClock;
  baseUrl(): string;
  apiClient(options: ApiClientOptions): ApiClient;
  auth(options: { account: AccountProvisioning }): SupabaseAuth | null;
  subscription(report: (scope: RealRuntimeScope, detail: unknown) => void): SubscriptionAdapter | null;
  analytics(): AnalyticsAdapter | null;
  notifications(): NotificationsPort | null;
  screenTime(clock: ClockPort): ScreenTimeAdapter | null;
  gait(): GaitPort | null;
  nativeAdapters(options: { clock: ClockPort; onError(error: unknown): void }): NativeAdapters | null;
  sync(accessToken: () => Promise<string | null>, baseUrl: string): SyncPort | null;
  support(client: ApiClient): SupportPort;
  reachability(baseUrl: string): ReachabilityPort;
  fallbacks(clock: ClockPort): FallbackPorts;
  report(scope: RealRuntimeScope, detail: unknown): void;
  bootBudgetMs: number;
};

const defaults: RealRuntimeDeps = {
  clock: () => createSystemClock(),
  baseUrl: apiBaseUrl,
  apiClient: createApiClient,
  // Required lazily, for the reason `adapters/nativeEngine.ts` states: `src/auth` reaches the Apple
  // and Google sign-in sheets, which load native modules the moment they are imported. Composing the
  // runtime must not be enough to pull those in, or no test can construct one.
  auth: (options) => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const auth = require('../auth') as typeof import('../auth');
    return auth.supabaseAuth(options);
  },
  subscription: (report) => {
    const apiKey = adaptyKey();
    if (!apiKey) return null;
    // Two separate requires on purpose: `nativeAdaptySdk` is the only file that loads the native
    // Adapty SDK, and a build without a key must not pull either of them in.
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const adapter = require('../adapters/subscription/AdaptySubscriptionAdapter') as typeof import('../adapters/subscription/AdaptySubscriptionAdapter');
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { nativeAdaptySdk } = require('../adapters/subscription/nativeAdaptySdk') as typeof import('../adapters/subscription/nativeAdaptySdk');
    return adapter.createSubscriptionAdapter({
      apiKey,
      sdk: nativeAdaptySdk(),
      onIssue: (scope, detail) => report('subscription', { scope, detail }),
    });
  },
  analytics: createAnalyticsAdapter,
  notifications: expoNotifications,
  screenTime: nativeScreenTime,
  gait: nativeGait,
  nativeAdapters: ({ clock, onError }) => createNativeAdapters({ clock, search: nativePlaceSearch, onError }),
  sync: (accessToken, baseUrl) => createSyncAdapter(createSyncClient({ accessToken, baseUrl })),
  support: createHttpSupportPort,
  reachability: (baseUrl) => createHttpReachability({ baseUrl }),
  fallbacks: createFallbackPorts,
  report: () => undefined,
  bootBudgetMs: BOOT_BUDGET_MS,
};

/** Builds one binding, or reports why it could not be built and lets the caller keep the fake. */
function attempt<T>(scope: RealRuntimeScope, report: RealRuntimeDeps['report'], build: () => T | null): T | null {
  try {
    return build();
  } catch (error) {
    report(scope, error);
    return null;
  }
}

/**
 * The composition that talks to the real world.
 *
 * Two rules shape it. Every port that can be built for real is, and a port that cannot keeps the
 * demo fake rather than crashing or branching at a call site — a simulator has no Screen Time, a
 * keyless build has no Adapty, and neither is a reason for the app to stop working. And nothing here
 * subscribes to `AppState`: the enforcement host owns the app's one foreground handler and calls
 * `onForeground`, which is where the session refresh and the pedometer re-read live.
 *
 * The knot at the top is deliberate. The API client needs a token source, the auth adapter is what
 * has one, and the auth adapter needs the client to reach `PUT /v1/user`. Tying them through a
 * mutable reference is what stops the app keeping two HTTP clients for one server.
 */
export function createRealRuntime(overrides: Partial<RealRuntimeDeps> = {}): Runtime {
  const deps = { ...defaults, ...overrides };
  const report = deps.report;
  const clock = deps.clock();
  const fallbacks = deps.fallbacks(clock);
  const baseUrl = deps.baseUrl();

  let auth: SupabaseAuth | null = null;
  const accessToken = () => auth?.accessToken() ?? Promise.resolve(null);
  const client = deps.apiClient({ baseUrl, getAccessToken: accessToken });
  auth = attempt('auth', report, () => deps.auth({ account: createVpsProvisioning(client) }));

  const subscription = attempt('subscription', report, () => deps.subscription(report));
  const analyticsAdapter = attempt('analytics', report, deps.analytics);
  const notifications = attempt('notifications', report, deps.notifications);
  const screenTime = attempt('screenTime', report, () => deps.screenTime(clock));
  const gait = attempt('gait', report, deps.gait);
  const native = attempt('nativeAdapters', report, () =>
    deps.nativeAdapters({ clock, onError: (error) => report('nativeAdapters', error) }),
  );
  const sync = auth ? attempt('sync', report, () => deps.sync(accessToken, baseUrl)) : null;

  const controls: RealControls = createRealControls({ gaitPreview: () => gait ?? fallbacks.gait });
  let bootTimer: ReturnType<typeof setTimeout> | undefined;
  const analytics = recordInto(analyticsAdapter?.analytics ?? fallbackAnalytics(), controls);

  const runtime: Runtime = {
    kind: 'real',
    paywall: subscription ? 'builder' : 'standIn',
    clock,
    screenTime: screenTime ?? fallbacks.screenTime,
    steps: native?.steps ?? fallbacks.steps,
    walking: native?.walking ?? fallbacks.walking,
    gait: gait ?? fallbacks.gait,
    gym: native?.gym ?? fallbacks.gym,
    health: native?.health ?? fallbacks.health,
    auth: auth?.port ?? fallbacks.auth,
    subscription: subscription ?? fallbacks.subscription,
    analytics,
    notifications: notifications ?? fallbacks.notifications,
    sync: sync ?? fallbacks.sync,
    support: deps.support(client),
    reachability: deps.reachability(baseUrl),
    dev: controls,
    onForeground: async () => {
      await Promise.all([
        settle('foreground', report, () => auth?.refresh()),
        settle('foreground', report, () => native?.steps.refresh()),
        settle('foreground', report, () => native?.gym.reconcile()),
      ]);
      // Recomputing walking credit last means it books minutes against the freshest pedometer read.
      settle('foreground', report, () => native?.walking.tick());
    },
    dispose: () => {
      clearTimeout(bootTimer);
      controls.dispose();
      native?.walking.dispose();
      native?.gym.dispose();
      native?.steps.dispose();
      screenTime?.dispose();
      subscription?.dispose();
      analyticsAdapter?.stop();
      auth?.dispose();
      fallbacks.dispose();
      clock.dispose();
    },
  };

  // The gate the splash waits on. Start-up runs to completion in the background whatever happens;
  // the budget only decides how long the user looks at a logo before the app runs on what it knows.
  const started = Promise.all([
    settle('boot', report, () => auth?.start()),
    settle('boot', report, () => native?.health.bootstrap()),
    settle('boot', report, () => native?.walking.resume()),
    settle('boot', report, () => native?.gym.reconcile()),
  ]);
  const budget = new Promise<void>((resolve) => {
    bootTimer = setTimeout(resolve, deps.bootBudgetMs);
  });
  void Promise.race([started, budget]).then(() => {
    clearTimeout(bootTimer);
    controls.booted();
  });

  return runtime;
}

/** Runs one piece of composition work; a failure is reported and never rejects the caller. */
async function settle(
  scope: RealRuntimeScope,
  report: RealRuntimeDeps['report'],
  work: () => void | Promise<unknown>,
): Promise<void> {
  try {
    await work();
  } catch (error) {
    report(scope, error);
  }
}

/** A build with no analytics key still emits into the developer log, which is what Support quotes. */
function fallbackAnalytics(): AnalyticsPort {
  return {
    track: () => undefined,
    screen: () => undefined,
    identify: () => undefined,
    setPersonProperties: () => undefined,
    reset: () => undefined,
  };
}

/**
 * Mirrors every analytics call into the developer log. Support's diagnostics quote the last
 * `lock_applied` from it, and on a device it is the only view of what the session emitted.
 */
function recordInto(analytics: AnalyticsPort, controls: RealControls): AnalyticsPort {
  return tapAnalytics(analytics, (kind, name, props) => {
    if (kind === 'track') controls.record(name, props);
    else if (kind === 'screen') controls.record('screen', { name });
    else controls.record('identify', { id: name });
  });
}
