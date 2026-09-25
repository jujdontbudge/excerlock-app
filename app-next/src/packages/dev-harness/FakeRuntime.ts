import { noteObservedEntitlement } from '../subscription/winbackSession';
import { activityHistory } from './lib/activityHistory';
import { stores } from '../launch/stores';
import { SupportFake } from './lib/fakes/SupportFake';
import { ReviewFake } from './lib/fakes/ReviewFake';
import { IncidentReportFake } from './lib/fakes/IncidentReportFake';
import { Runtime } from '../ports/Runtime';
import { dayKey } from '../schedule/schedule';
import { contextPersistence } from './lib/contextPersistence';
import { scenarios } from './lib/scenarios';
import { FakeContext } from './lib/FakeContext';
import { loadScenario } from './lib/scenarioLoader';
import { permissionsStore } from '../permissions/permissionsStore';
import { entitlementStore } from '../subscription/entitlementStore';
import { sessionStore } from '../identity/sessionStore';
import { ScreenTimeFake } from './lib/fakes/ScreenTimeFake';
import { StepsFake } from './lib/fakes/StepsFake';
import { WalkingFake } from './lib/fakes/WalkingFake';
import { GaitFake } from './lib/fakes/GaitFake';
import { GymFake } from './lib/fakes/GymFake';
import { AuthFake } from './lib/fakes/AuthFake';
import { SubscriptionFake } from './lib/fakes/SubscriptionFake';
import { AnalyticsFake } from './lib/fakes/AnalyticsFake';
import { NotificationsFake } from './lib/fakes/NotificationsFake';
import { SyncFake } from './lib/fakes/SyncFake';
export type FakeRuntimeInstance = Runtime & { kind: 'fake'; dev: NonNullable<Runtime['dev']> };
export function FakeRuntime(): FakeRuntimeInstance {
  const ctx = new FakeContext(scenarios[0]),
    walking = WalkingFake(ctx),
    gait = GaitFake(),
    persistence = contextPersistence(ctx),
    gym = GymFake(ctx),
    activity = activityHistory(ctx),
    ready = persistence.ready.then(async () => {
      await Promise.all(
        stores
          .filter((store) => !store.persist.hasHydrated())
          .map(
            (store) =>
              new Promise<void>((resolve) => {
                const stop = store.persist.onFinishHydration(() => {
                  stop();
                  resolve();
                });
              }),
          ),
      );
      walking.resume();
      gait.set(ctx.scenario.gait ?? 'none');
      activity.refresh();
      launchEntitlements = (ctx.scenario.entitlementTimeline ?? []).map(({ status, afterMs }) =>
        setTimeout(() => dev.setEntitlement(status), afterMs),
      );
    });
  let launchEntitlements: ReturnType<typeof setTimeout>[] = [];
  const dev: FakeRuntimeInstance['dev'] = {
      ready: () => ready,
      flush: persistence.flush,
      scenarios: scenarios.map(({ id, title }) => ({ id, title })),
      load: async (id, keepEdits = false) => {
        await ready;
        launchEntitlements.forEach(clearTimeout);
        const scenario = scenarios.find((s) => s.id === id);
        if (!scenario) throw new Error('Unknown scenario');
        ctx.update({ loading: true });
        walking.stop();
        ctx.resolve(false);
        await loadScenario(scenario, keepEdits);
        ctx.scenario = scenario;
        gait.set(scenario.gait ?? 'none');
        ctx.clock.set(scenario.clock.now, scenario.clock.timezone);
        ctx.update({
          stepsOverride: undefined, placement: 'propped', loading: false, scenarioId: id, outcome: 'success',
          restoreOutcome: ['trial', 'active'].includes(scenario.entitlement.status) ? 'restored' : 'notFound',
          promptMode: scenario.fakeSystemPrompts, history: scenario.history, events: [], accessibility: scenario.accessibility,
          presence: scenario.gym?.presence ?? 'outside', motion: scenario.motion ?? 'still',
        });
        walking.resume();
      },
      advance: ctx.clock.advance,
      setPresence: (presence) => ctx.update({ presence }), setMotion: (motion) => ctx.update({ motion }),
      setGait: gait.set, createGaitPreview: () => { const preview = GaitFake(true); preview.set('walking'); return preview; },
      setPlacement: (placement) => ctx.update({ placement }),
      setSteps: (value) => {
        if (!Number.isFinite(value) || value < 0) throw new Error('Invalid step count');
        ctx.update({ stepsOverride: { value: Math.floor(value), day: dayKey(ctx.clock.now(), ctx.clock.timezone()), at: ctx.clock.now() } });
      },
      setTime: ctx.clock.set, setPromptMode: (promptMode) => ctx.update({ promptMode }),
      setPermission: (name, status) => permissionsStore.getState().patch({ [name]: status }),
      setEntitlement: (status) => {
        entitlementStore.getState().patch({ entitlement: { status, renewsAt: entitlementStore.getState().data.entitlement.renewsAt } });
        noteObservedEntitlement(status);
      },
      setSession: (session) => sessionStore.getState().patch({ session }),
      setRestoreOutcome: (restoreOutcome) => ctx.update({ restoreOutcome }), setOutcome: (outcome) => ctx.update({ outcome }),
      resolvePrompt: ctx.resolve, snapshot: ctx.snapshot, subscribe: ctx.subscribe,
    };
  return {
    kind: 'fake',
    clock: ctx.clock,
    screenTime: ScreenTimeFake(ctx),
    steps: StepsFake(ctx),
    walking,
    gait,
    gym,
    auth: AuthFake(ctx),
    subscription: SubscriptionFake(ctx),
    analytics: AnalyticsFake(ctx),
    reviewPreset: { isEnabled: async () => false, expose: () => undefined },
    experiments: { getPaywallVariant: async () => 'control', trackPaywallVariantExposure: () => undefined },
    signInRequired: { isRequired: async () => false },
    onboardingFlow: { order: () => null, load: async () => null, subscribe: () => () => undefined },
    notifications: NotificationsFake(ctx),
    sync: SyncFake(),
    support: SupportFake(ctx),
    review: ReviewFake(ctx),
    incidentReports: IncidentReportFake(ctx),
    dataExport: {
      requestShare: async (buildPayload) => {
        const payload = await buildPayload();
        ctx.log('export_requested', {
          rules: payload.rules.length,
          days: payload.days.length,
          earnedUnlocks: payload.earnedUnlocks.length,
          visits: payload.visits.length,
        });
      },
    },
    status: { ready: () => ready, flush: persistence.flush, snapshot: ctx.snapshot, subscribe: ctx.subscribe },
    dev,
    dispose: () => {
      activity.dispose();
      persistence.dispose();
      walking.disconnect();
      void gait.stop();
      gym.dispose();
      ctx.dispose();
    },
  };
}
