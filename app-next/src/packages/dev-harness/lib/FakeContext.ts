import { Scenario } from '../../model/models';
import { LockedApps, Permissions, PermissionStatus } from '../../model/types';
import { DevSnapshot, FakePrompt } from '../../ports/RuntimeControls';
import { permissionsStore } from '../../permissions/permissionsStore';
import { FakeClock } from './clock';
export class FakeContext {
  scenario: Scenario;
  clock: FakeClock;
  private listeners = new Set<() => void>();
  private pending: ((value: boolean | LockedApps) => void) | undefined;
  private view: DevSnapshot;
  constructor(scenario: Scenario) {
    this.scenario = scenario;
    this.clock = new FakeClock(scenario.clock.now, scenario.clock.timezone);
    this.view = {
      hydrated: false,
      loading: false,
      scenarioId: scenario.id,
      promptMode: scenario.fakeSystemPrompts,
      prompt: null,
      events: [],
      history: scenario.history,
      accessibility: scenario.accessibility,
      outcome: 'success',
      restoreOutcome: ['trial', 'active'].includes(scenario.entitlement.status) ? 'restored' : 'notFound',
      presence: scenario.gym?.presence ?? 'outside',
      motion: scenario.motion ?? 'still',
      protectedRouteMounts: [],
      notificationResponses: { delivered: [], handled: 0 },
      otaResume: null,
    };
  }
  snapshot = () => this.view;
  subscribe = (callback: () => void) => {
    this.listeners.add(callback);
    return () => {
      this.listeners.delete(callback);
    };
  };
  update = (patch: Partial<DevSnapshot>) => {
    this.view = { ...this.view, ...patch };
    this.listeners.forEach((callback) => callback());
  };
  log = (event: string, props: Record<string, unknown> = {}) =>
    this.update({ events: [...this.view.events, { at: this.clock.now(), event, props }].slice(-200) });
  prompt = (prompt: FakePrompt): Promise<boolean | LockedApps> =>
    new Promise((resolve) => {
      this.pending = resolve;
      this.update({ prompt });
    });
  resolve = (result: boolean | LockedApps) => {
    const pending = this.pending;
    this.pending = undefined;
    this.update({ prompt: null });
    pending?.(result);
  };
  request = async (name: keyof Permissions): Promise<PermissionStatus> => {
    const mode = this.view.promptMode;
    const granted = mode === 'ask' ? (await this.prompt({ kind: 'permission', name })) === true : mode === 'grant';
    const status = granted ? 'granted' : 'denied';
    permissionsStore.getState().patch({ [name]: name === 'location' && granted ? 'whenInUse' : status });
    this.log('permission_result', { name, status });
    return status;
  };
  result = () => {
    const result = this.view.outcome;
    if (result === 'error') throw new Error('Simulated request failed');
    return result;
  };
  dispose = () => {
    this.resolve(false);
    this.clock.dispose();
    this.listeners.clear();
  };
}
