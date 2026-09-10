import { createMemoryOtaStorage, OtaCoordinator, OtaSafetyInput, OtaUpdatesClient, OtaStorage } from '../updates';
const HOME: OtaSafetyInput = { purchaseOrRestoreBusy: false, permissionPromptPending: false, cameraActive: false, walkingActive: false, proppedActive: false, isForeground: true, route: '/home' };
function afterWrite(storage: OtaStorage, method: 'saveGuard' | 'saveEnvelope', change: () => void) {
  if (method === 'saveGuard') {
    const save = storage.saveGuard;
    storage.saveGuard = async (guard) => { await save(guard); change(); };
  } else {
    const save = storage.saveEnvelope;
    storage.saveEnvelope = async (envelope) => { await save(envelope); change(); };
  }
}
function fixture() {
  const storage = createMemoryOtaStorage();
  const updates: OtaUpdatesClient = {
    isEnabled: true, currentlyRunningUpdateId: 'running', runtimeVersion: '1',
    checkForUpdate: async () => ({ isAvailable: false, updateId: null }),
    fetchUpdate: async () => ({ isNew: false, updateId: null }), reload: jest.fn(async () => {}),
  };
  const report = jest.fn();
  const c = new OtaCoordinator({ updates, storage, report });
  c.observeStartup({ currentlyRunningUpdateId: 'running', downloadedUpdateId: 'candidate-a' });
  let safety = { ...HOME };
  let envelope = { route: '/home', draftIds: [] as string[] };
  return { c, storage, updates, report, args: { getSafety: () => safety, getEnvelope: () => envelope },
    unsafe: () => { safety = { ...safety, purchaseOrRestoreBusy: true }; },
    safe: () => { safety = { ...HOME }; },
    navigate: () => { safety = { ...safety, route: '/settings' }; envelope = { ...envelope, route: '/settings' }; },
    addDraft: () => { envelope = { ...envelope, draftIds: ['new-draft'] }; },
  };
}
test.each(['saveEnvelope', 'saveGuard'] as const)('new native candidate during %s revokes old reload authority and uses its own guard', async (method) => {
  const f = fixture();
  await f.storage.saveGuard({ updateId: 'candidate-b', launchCount: 2 });
  afterWrite(f.storage, method, () => f.c.observeDownloadedUpdate('candidate-b', 'running'));
  expect((await f.c.tryReloadIfSafe(f.args)).status).not.toBe('reloaded');
  expect(f.updates.reload).not.toHaveBeenCalled();
  expect(f.c.pendingId).toBe('candidate-b');
  expect(await f.storage.loadGuard()).toEqual({ updateId: 'candidate-b', launchCount: 2 });
  expect((await f.c.onForeground({ ...f.args, nowMs: 100, backgroundedAtMs: 0 })).status).toBe('blocked-loop-guard');
  expect(f.updates.reload).not.toHaveBeenCalled();
});
test.each(['saveEnvelope', 'saveGuard'] as const)('safe navigation and draft changes during %s defer without consuming allowance', async (method) => {
  for (const change of ['navigate', 'addDraft'] as const) {
    const f = fixture();
    afterWrite(f.storage, method, f[change]);
    expect((await f.c.tryReloadIfSafe(f.args)).status).toBe('deferred-unsafe');
    expect(f.updates.reload).not.toHaveBeenCalled();
    expect(await f.storage.loadGuard()).toBeNull();
  }
});
test('two aborted reservations do not exhaust a candidate that has never reloaded', async () => {
  const f = fixture();
  const save = f.storage.saveGuard;
  f.storage.saveGuard = async (guard) => { await save(guard); f.unsafe(); };
  for (let i = 0; i < 2; i += 1) {
    f.safe();
    expect((await f.c.tryReloadIfSafe(f.args)).status).toBe('deferred-unsafe');
    expect(await f.storage.loadGuard()).toBeNull();
  }
  f.storage.saveGuard = save; f.safe();
  expect((await f.c.tryReloadIfSafe(f.args)).status).toBe('reloaded');
  expect(f.updates.reload).toHaveBeenCalledTimes(1);
});
test('rollback failure denies reload and reports uncertain guard state', async () => {
  const f = fixture(); const save = f.storage.saveGuard;
  f.storage.saveGuard = async (guard) => { await save(guard); f.unsafe(); };
  f.storage.clearGuard = async () => { throw new Error('disk failed'); };
  expect((await f.c.tryReloadIfSafe(f.args)).status).toBe('failed');
  expect(f.updates.reload).not.toHaveBeenCalled();
  expect(f.report).toHaveBeenCalledWith('ota.guard-rollback-failed', expect.any(Object));
});
test('caller-provided success ID cannot clear a different native-running candidate guard', async () => {
  const f = fixture();
  await f.storage.saveGuard({ updateId: 'candidate-a', launchCount: 2 });
  await f.c.markSuccessfulLaunch('candidate-a');
  expect(await f.storage.loadGuard()).toEqual({ updateId: 'candidate-a', launchCount: 2 });
});
test('health acknowledgment serializes behind a pending guard reservation', async () => {
  const f = fixture();
  await f.storage.saveGuard({ updateId: 'running', launchCount: 1 });
  let release!: () => void; let entered!: () => void;
  const gate = new Promise<void>((resolve) => { release = resolve; });
  const writing = new Promise<void>((resolve) => { entered = resolve; });
  const save = f.storage.saveGuard;
  f.storage.saveGuard = async (guard) => { entered(); await gate; await save(guard); };
  const reload = f.c.tryReloadIfSafe(f.args);
  await writing;
  const health = f.c.markSuccessfulLaunch('running');
  release();
  await Promise.all([reload, health]);
  expect(await f.storage.loadGuard()).toEqual({ updateId: 'candidate-a', launchCount: 1 });
});
test('embedded/null native update cannot acknowledge a remote candidate', async () => {
  const f = fixture();
  Object.defineProperty(f.updates, 'currentlyRunningUpdateId', { value: null });
  await f.storage.saveGuard({ updateId: 'candidate-a', launchCount: 1 });
  await f.c.markSuccessfulLaunch('candidate-a');
  expect(await f.storage.loadGuard()).toEqual({ updateId: 'candidate-a', launchCount: 1 });
});
