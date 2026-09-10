import { activityHistory } from './activityHistory';
import { stores } from '../state/stores';
import { SupportFake } from './fakes/SupportFake';
import { Runtime } from '../runtime/Runtime';
import { dayKey } from '../domain/schedule';
import { contextPersistence } from './contextPersistence';
import { scenarios } from './scenarios';
import { FakeContext } from './FakeContext';
import { loadScenario } from './scenarioLoader';
import { permissionsStore } from '../state/permissionsStore';
import { entitlementStore } from '../state/entitlementStore';
import { sessionStore } from '../state/sessionStore';
import { ScreenTimeFake } from './fakes/ScreenTimeFake';
import { StepsFake } from './fakes/StepsFake';
import { WalkingFake } from './fakes/WalkingFake';
import { GaitFake } from './fakes/GaitFake';
import { GymFake } from './fakes/GymFake';
import { AuthFake } from './fakes/AuthFake';
import { SubscriptionFake } from './fakes/SubscriptionFake';
import { AnalyticsFake } from './fakes/AnalyticsFake';
import { NotificationsFake } from './fakes/NotificationsFake';
import { SyncFake } from './fakes/SyncFake';
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
    });
  const dev: FakeRuntimeInstance['dev'] = {
      ready: () => ready,
      flush: persistence.flush,
      scenarios: scenarios.map(({ id, title }) => ({ id, title })),
      load: async (id, keepEdits = false) => {
        await ready;
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
      setEntitlement: (status) => entitlementStore.getState().patch({ entitlement: { status, renewsAt: entitlementStore.getState().data.entitlement.renewsAt } }),
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
    notifications: NotificationsFake(ctx),
    sync: SyncFake(),
    support: SupportFake(ctx),
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
