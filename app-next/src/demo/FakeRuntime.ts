import { Runtime } from '../runtime/Runtime';
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
    walking = WalkingFake(ctx);
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
      scenarios: scenarios.map(({ id, title }) => ({ id, title })),
      load: async (id, keepEdits = false) => {
        const scenario = scenarios.find((s) => s.id === id);
        if (!scenario) throw new Error('Unknown scenario');
        walking.stop();
        ctx.resolve(false);
        await loadScenario(scenario, keepEdits);
        ctx.scenario = scenario;
        ctx.clock.set(scenario.clock.now, scenario.clock.timezone);
        ctx.update({
          scenarioId: id,
          promptMode: scenario.fakeSystemPrompts,
          history: scenario.history,
          events: [],
          accessibility: scenario.accessibility,
          presence: scenario.gym?.presence ?? 'outside',
        });
      },
      advance: ctx.clock.advance,
      setTime: ctx.clock.set,
      setPromptMode: (promptMode) => ctx.update({ promptMode }),
      setPermission: (name, status) => permissionsStore.getState().patch({ [name]: status }),
      setEntitlement: (status) =>
        entitlementStore
          .getState()
          .patch({ entitlement: { status, renewsAt: entitlementStore.getState().data.entitlement.renewsAt } }),
      setSession: (session) => sessionStore.getState().patch({ session }),
      setOutcome: (outcome) => ctx.update({ outcome }),
      resolvePrompt: ctx.resolve,
      snapshot: ctx.snapshot,
      subscribe: ctx.subscribe,
    },
    dispose: () => {
      walking.stop();
      ctx.dispose();
    },
  };
}
