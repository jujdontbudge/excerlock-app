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
import { GymFake } from './fakes/GymFake';
import { HealthFake } from './fakes/HealthFake';
import { AuthFake } from './fakes/AuthFake';
import { SubscriptionFake } from './fakes/SubscriptionFake';
import { AnalyticsFake } from './fakes/AnalyticsFake';
import { NotificationsFake } from './fakes/NotificationsFake';
import { SyncFake } from './fakes/SyncFake';
export function FakeRuntime(): Runtime {
  const ctx = new FakeContext(scenarios[0]),
    walking = WalkingFake(ctx),
    persistence = contextPersistence(ctx);
  return {
    kind: 'fake',
    clock: ctx.clock,
    screenTime: ScreenTimeFake(ctx),
    steps: StepsFake(ctx),
    walking,
    gym: GymFake(ctx),
    health: HealthFake(ctx),
    auth: AuthFake(ctx),
    subscription: SubscriptionFake(ctx),
    analytics: AnalyticsFake(ctx),
    notifications: NotificationsFake(ctx),
    sync: SyncFake(),
    dev: {
      ready: () => persistence.ready,
      flush: persistence.flush,
      scenarios: scenarios.map(({ id, title }) => ({ id, title })),
      load: async (id, keepEdits = false) => {
        await persistence.ready;
        const scenario = scenarios.find((s) => s.id === id);
        if (!scenario) throw new Error('Unknown scenario');
        ctx.update({ loading: true });
        walking.stop();
        ctx.resolve(false);
        await loadScenario(scenario, keepEdits);
        ctx.scenario = scenario;
        ctx.clock.set(scenario.clock.now, scenario.clock.timezone);
        ctx.update({
          stepsOverride: undefined,
          loading: false,
          scenarioId: id,
          outcome: 'success',
          restoreOutcome: ['trial', 'active'].includes(scenario.entitlement.status) ? 'restored' : 'notFound',
          promptMode: scenario.fakeSystemPrompts,
          history: scenario.history,
          events: [],
          accessibility: scenario.accessibility,
          presence: scenario.gym?.presence ?? 'outside',
        });
      },
      advance: ctx.clock.advance,
      setSteps: (value) => {
        if (!Number.isFinite(value) || value < 0) throw new Error('Invalid step count');
        ctx.update({
          stepsOverride: {
            value: Math.floor(value),
            day: dayKey(ctx.clock.now(), ctx.clock.timezone()),
            at: ctx.clock.now(),
          },
        });
      },
      setTime: ctx.clock.set,
      setPromptMode: (promptMode) => ctx.update({ promptMode }),
      setPermission: (name, status) => permissionsStore.getState().patch({ [name]: status }),
      setEntitlement: (status) =>
        entitlementStore
          .getState()
          .patch({ entitlement: { status, renewsAt: entitlementStore.getState().data.entitlement.renewsAt } }),
      setSession: (session) => sessionStore.getState().patch({ session }),
      setRestoreOutcome: (restoreOutcome) => ctx.update({ restoreOutcome }),
      setOutcome: (outcome) => ctx.update({ outcome }),
      resolvePrompt: ctx.resolve,
      snapshot: ctx.snapshot,
      subscribe: ctx.subscribe,
    },
    dispose: () => {
      persistence.dispose();
      walking.stop();
      ctx.dispose();
    },
  };
}
