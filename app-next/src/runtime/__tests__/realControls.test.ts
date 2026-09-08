import { createRealControls, REAL_SCENARIO_ID } from '../realControls';
import { entitlementStore } from '../../state/entitlementStore';
import { permissionsStore } from '../../state/permissionsStore';
import { sessionStore } from '../../state/sessionStore';

describe('createRealControls', () => {
  it('offers no scenarios and refuses to load one', async () => {
    const controls = createRealControls();
    expect(controls.scenarios).toEqual([]);
    expect(controls.snapshot().scenarioId).toBe(REAL_SCENARIO_ID);
    await expect(controls.load('gym-day')).rejects.toThrow('Scenarios are a demo-runtime feature');
    controls.dispose();
  });

  it('never claims a pending fake prompt, so the fake prompt host stays out of the way', () => {
    const controls = createRealControls();
    expect(controls.snapshot().prompt).toBeNull();
    controls.resolvePrompt(true);
    expect(controls.snapshot().prompt).toBeNull();
    controls.dispose();
  });

  it('holds the boot gate closed until the composition says it is ready', async () => {
    const controls = createRealControls();
    expect(controls.snapshot().hydrated).toBe(false);
    expect(controls.snapshot().loading).toBe(false);
    controls.booted();
    await expect(controls.ready()).resolves.toBeUndefined();
    expect(controls.snapshot().hydrated).toBe(true);
    controls.dispose();
  });

  it('tells its subscribers when anything changes', () => {
    const controls = createRealControls();
    const seen = jest.fn();
    const stop = controls.subscribe(seen);
    controls.booted();
    expect(seen).toHaveBeenCalled();
    stop();
    controls.record('lock_applied', { state: 'locked' });
    expect(seen).toHaveBeenCalledTimes(1);
    controls.dispose();
  });

  it('keeps a bounded record of the session for Support diagnostics', () => {
    const controls = createRealControls({ maxEvents: 3 });
    ['a', 'b', 'c', 'd'].forEach((name) => controls.record(name, { name }));
    expect(controls.snapshot().events.map((entry) => entry.event)).toEqual(['b', 'c', 'd']);
    expect(controls.snapshot().events[0].props).toEqual({ name: 'b' });
    controls.dispose();
  });

  it('still writes the stores a device build can usefully change', () => {
    const controls = createRealControls();
    controls.setPermission('motion', 'denied');
    expect(permissionsStore.getState().data.motion).toBe('denied');
    controls.setEntitlement('trial');
    expect(entitlementStore.getState().data.entitlement.status).toBe('trial');
    controls.setSession({ kind: 'anonymous', userId: 'local-user' });
    expect(sessionStore.getState().data.session.userId).toBe('local-user');
    controls.dispose();
  });

  it('leaves the scenario-only controls inert rather than pretending', () => {
    const controls = createRealControls();
    const before = controls.snapshot();
    controls.advance(3_600_000);
    controls.setSteps(1_000);
    controls.setPresence('inside');
    controls.setGait('walking');
    controls.setPlacement('handheld');
    controls.setTime('2026-09-08T12:00:00.000Z');
    controls.setPromptMode('deny');
    controls.setOutcome('error');
    controls.setRestoreOutcome('restored');
    controls.setOnline(false);
    controls.invalidateSelection();
    expect(controls.snapshot()).toEqual(before);
    controls.dispose();
  });
});
