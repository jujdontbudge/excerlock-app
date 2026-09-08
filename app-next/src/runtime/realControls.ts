import { GaitPort } from '../ports/GaitPort';
import { DevSnapshot, RuntimeControls } from '../ports/RuntimeControls';
import { entitlementStore } from '../state/entitlementStore';
import { permissionsStore } from '../state/permissionsStore';
import { sessionStore } from '../state/sessionStore';

/** What `snapshot().scenarioId` says on a real build; `progressSync` keys its signals on it. */
export const REAL_SCENARIO_ID = 'real';

const MAX_EVENTS = 200;

export type RealControls = RuntimeControls & {
  /** Records an analytics call for Support's diagnostics and the developer menu's session log. */
  record(event: string, props?: Record<string, unknown>): void;
  /** Opens the boot gate. The composition calls it once its own start-up work has settled. */
  booted(): void;
  dispose(): void;
};

export type RealControlsOptions = {
  maxEvents?: number;
  /** What the treadmill design preview renders against; the composition passes its gait port. */
  gaitPreview?: () => GaitPort;
};

/**
 * `RuntimeControls` for a build that talks to the real world.
 *
 * The interface exists because product code depends on it — `BootGate` waits on `hydrated`,
 * `progressSync` keys its cached signals on the scenario, Support reads the session's events — so a
 * real runtime has to answer it. What it must not do is pretend: there is no scenario to load, no
 * clock to wind and no fake prompt to resolve, and a control that cannot mean anything here does
 * nothing rather than half-working. The three setters that survive write product stores, which is
 * what makes the developer menu useful on a device.
 */
export function createRealControls(options: RealControlsOptions = {}): RealControls {
  const maxEvents = options.maxEvents ?? MAX_EVENTS;
  const listeners = new Set<() => void>();
  let view: DevSnapshot = {
    hydrated: false,
    loading: false,
    scenarioId: REAL_SCENARIO_ID,
    promptMode: 'ask',
    prompt: null,
    events: [],
    history: [],
    restoreOutcome: 'notFound',
    outcome: 'success',
    presence: 'outside',
    online: true,
  };
  let opened: (() => void) | undefined;
  const ready = new Promise<void>((resolve) => {
    opened = resolve;
  });
  const update = (patch: Partial<DevSnapshot>) => {
    view = { ...view, ...patch };
    listeners.forEach((listener) => listener());
  };
  const inert = () => undefined;

  return {
    ready: () => ready,
    flush: async () => undefined,
    scenarios: [],
    load: async () => {
      throw new Error('Scenarios are a demo-runtime feature');
    },
    advance: inert,
    setSteps: inert,
    setPresence: inert,
    setGait: inert,
    createGaitPreview: () => {
      const preview = options.gaitPreview?.();
      if (!preview) throw new Error('No gait preview on this build');
      return preview;
    },
    setPlacement: inert,
    setTime: inert,
    setPromptMode: inert,
    setPermission: (name, status) => permissionsStore.getState().patch({ [name]: status }),
    setEntitlement: (status) => {
      const current = entitlementStore.getState().data.entitlement;
      entitlementStore.getState().patch({ entitlement: { ...current, status } });
    },
    setSession: (session) => sessionStore.getState().patch({ session }),
    setRestoreOutcome: inert,
    setOutcome: inert,
    setOnline: inert,
    resolvePrompt: inert,
    invalidateSelection: inert,
    snapshot: () => view,
    subscribe: (callback) => {
      listeners.add(callback);
      return () => {
        listeners.delete(callback);
      };
    },
    record: (event, props = {}) =>
      update({ events: [...view.events, { at: new Date().toISOString(), event, props }].slice(-maxEvents) }),
    booted: () => {
      opened?.();
      if (!view.hydrated) update({ hydrated: true });
    },
    dispose: () => {
      opened?.();
      listeners.clear();
    },
  };
}
