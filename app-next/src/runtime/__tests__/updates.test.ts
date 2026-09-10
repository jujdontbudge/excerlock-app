import {
  OtaCoordinator,
  OtaSafetyInput,
  OtaStorage,
  OtaUpdatesClient,
  OTA_CHECK_BUDGET_MS,
  OTA_FETCH_BUDGET_MS,
  OTA_FOREGROUND_STALE_MS,
  OTA_MAX_RELOAD_ATTEMPTS,
  createMemoryOtaStorage,
  evaluateSafeBoundary,
  isOtaCheckDue,
  isOtaSafeRoute,
} from '../updates';

const SAFE_TAB_ROOT: OtaSafetyInput = {
  purchaseOrRestoreBusy: false,
  permissionPromptPending: false,
  cameraActive: false,
  walkingActive: false,
  proppedActive: false,
  isForeground: true,
  route: '/home',
};

function makeSafety(overrides: Partial<OtaSafetyInput>): OtaSafetyInput {
  return { ...SAFE_TAB_ROOT, ...overrides };
}

type FakeUpdatesOptions = {
  isEnabled?: boolean;
  runningId?: string | null;
  runtimeVersion?: string | null;
  check?: () => Promise<{ isAvailable: boolean; updateId: string | null }>;
  fetch?: () => Promise<{ isNew: boolean; updateId: string | null }>;
};

function makeFakeUpdates(options?: FakeUpdatesOptions): OtaUpdatesClient & {
  checkCalls: number;
  fetchCalls: number;
  reloadCalls: number;
} {
  const state = { checkCalls: 0, fetchCalls: 0, reloadCalls: 0 };
  return {
    get checkCalls() {
      return state.checkCalls;
    },
    get fetchCalls() {
      return state.fetchCalls;
    },
    get reloadCalls() {
      return state.reloadCalls;
    },
    get isEnabled() {
      return options?.isEnabled ?? true;
    },
    get currentlyRunningUpdateId() {
      return options?.runningId ?? 'running-1';
    },
    get runtimeVersion() {
      return options?.runtimeVersion ?? '1';
    },
    async checkForUpdate() {
      state.checkCalls += 1;
      if (options?.check) return options.check();
      return { isAvailable: false, updateId: null };
    },
    async fetchUpdate() {
      state.fetchCalls += 1;
      if (options?.fetch) return options.fetch();
      return { isNew: false, updateId: null };
    },
    async reload() {
      state.reloadCalls += 1;
    },
  };
}

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (error: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

const HOUR = 60 * 60 * 1000;

describe('OTA safe boundaries', () => {
  test('tab root with all clear is safe', () => {
    expect(evaluateSafeBoundary(SAFE_TAB_ROOT)).toEqual({ safe: true, reason: 'safe' });
  });

  test.each([
    ['purchase', { purchaseOrRestoreBusy: true }, 'purchase-or-restore-busy'],
    ['restore (same busy flag)', { purchaseOrRestoreBusy: true }, 'purchase-or-restore-busy'],
    ['prompt', { permissionPromptPending: true }, 'permission-prompt-pending'],
    ['scan/camera', { cameraActive: true }, 'camera-active'],
    ['walking', { walkingActive: true }, 'walking-active'],
    ['propped', { proppedActive: true }, 'propped-active'],
    ['background', { isForeground: false }, 'not-foreground'],
    ['builder route', { route: '/builder' }, 'non-root-route'],
    ['ceremony route', { route: '/unlock/gym' }, 'non-root-route'],
    ['setup flow route', { route: '/onboarding/welcome' }, 'non-root-route'],
    ['paywall route', { route: '/paywall' }, 'non-root-route'],
  ])('reload refused during %s', (_label, overrides, reason) => {
    const result = evaluateSafeBoundary(makeSafety(overrides as Partial<OtaSafetyInput>));
    expect(result).toEqual({ safe: false, reason });
  });

  test('fails closed when any safety input is unknown', () => {
    const unknown: OtaSafetyInput = {
      purchaseOrRestoreBusy: null,
      permissionPromptPending: null,
      cameraActive: null,
      walkingActive: null,
      proppedActive: null,
      isForeground: null,
      route: null,
    };
    expect(evaluateSafeBoundary(unknown).safe).toBe(false);
    expect(evaluateSafeBoundary(makeSafety({ purchaseOrRestoreBusy: null })).safe).toBe(false);
    expect(evaluateSafeBoundary(makeSafety({ permissionPromptPending: undefined })).safe).toBe(false);
    expect(evaluateSafeBoundary(makeSafety({ cameraActive: null })).safe).toBe(false);
    expect(evaluateSafeBoundary(makeSafety({ walkingActive: undefined })).safe).toBe(false);
    expect(evaluateSafeBoundary(makeSafety({ proppedActive: null })).safe).toBe(false);
    expect(evaluateSafeBoundary(makeSafety({ isForeground: null })).safe).toBe(false);
    expect(evaluateSafeBoundary(makeSafety({ route: null })).safe).toBe(false);
  });

  test('route allowlist is actual group-excluded tab paths (no false positives)', () => {
    // Canonical tab paths (as returned by usePathname, groups excluded).
    expect(isOtaSafeRoute('/home')).toBe(true);
    expect(isOtaSafeRoute('/conditions')).toBe(true);
    expect(isOtaSafeRoute('/analytics')).toBe(true);
    expect(isOtaSafeRoute('/settings')).toBe(true);
    // Legacy Stack names with groups normalize to the same canonical paths.
    expect(isOtaSafeRoute('/(tabs)/home')).toBe(true);
    expect(isOtaSafeRoute('(tabs)/conditions')).toBe(true);
    // '/' is BootGate transient (redirects after onboarding guard), never safe.
    expect(isOtaSafeRoute('/')).toBe(false);
    expect(isOtaSafeRoute('/index')).toBe(false);
    expect(isOtaSafeRoute('index')).toBe(false);
    expect(isOtaSafeRoute('/(tabs)')).toBe(false);
    expect(isOtaSafeRoute('/builder')).toBe(false);
    expect(isOtaSafeRoute('/unlock/gym')).toBe(false);
    expect(isOtaSafeRoute('/unlock/treadmill')).toBe(false);
    expect(isOtaSafeRoute('/onboarding/welcome')).toBe(false);
    expect(isOtaSafeRoute('/paywall')).toBe(false);
    expect(isOtaSafeRoute('/gym-picker')).toBe(false);
    expect(isOtaSafeRoute('/settings/gyms')).toBe(false);
    expect(isOtaSafeRoute(null)).toBe(false);
    expect(isOtaSafeRoute('')).toBe(false);
  });
});

describe('OTA coordinator reload gating', () => {
  test('reload allowed at tab root persists envelope and increments guard', async () => {
    const updates = makeFakeUpdates();
    const storage = createMemoryOtaStorage();
    const coordinator = new OtaCoordinator({ updates, storage });
    coordinator.observeStartup({ currentlyRunningUpdateId: 'running-1', downloadedUpdateId: 'update-aaa' });
    const result = await coordinator.tryReloadIfSafe({
      getSafety: () => ({ ...SAFE_TAB_ROOT }),
      getEnvelope: () => ({ route: '/home', draftIds: ['draft-1'] }),
      nowMs: 1_000_000,
    });
    expect(result).toEqual({ status: 'reloaded', updateId: 'update-aaa' });
    expect(updates.reloadCalls).toBe(1);
    const envelope = await storage.loadEnvelope();
    expect(envelope).toMatchObject({ route: '/home', draftIds: ['draft-1'] });
    expect(envelope?.savedAtMs).toBe(1_000_000);
    const guard = await storage.loadGuard();
    expect(guard).toEqual({ updateId: 'update-aaa', launchCount: 1 });
  });

  test.each([
    ['purchase busy', { purchaseOrRestoreBusy: true }],
    ['prompt pending', { permissionPromptPending: true }],
    ['scan active', { cameraActive: true }],
    ['walking active', { walkingActive: true }],
    ['propped active', { proppedActive: true }],
    ['backgrounded', { isForeground: false }],
    ['non-root route', { route: '/builder' }],
  ])('tryReloadIfSafe defers when %s (no reload, no guard bump)', async (_label, overrides) => {
    const updates = makeFakeUpdates();
    const storage = createMemoryOtaStorage();
    const coordinator = new OtaCoordinator({ updates, storage });
    coordinator.observeStartup({ currentlyRunningUpdateId: 'running-1', downloadedUpdateId: 'update-bbb' });
    const result = await coordinator.tryReloadIfSafe({
      getSafety: () => makeSafety(overrides as Partial<OtaSafetyInput>),
      getEnvelope: () => ({ route: '/builder', draftIds: [] }),
      nowMs: 2_000_000,
    });
    expect(result.status).toBe('deferred-unsafe');
    expect(updates.reloadCalls).toBe(0);
    expect(await storage.loadGuard()).toBeNull();
    expect(await storage.loadEnvelope()).toBeNull();
  });
});

describe('OTA reload-loop guard', () => {
  test('stops after two failed activations of one update id', async () => {
    const updates = makeFakeUpdates();
    const storage = createMemoryOtaStorage();
    const coordinator = new OtaCoordinator({ updates, storage });
    coordinator.observeStartup({ currentlyRunningUpdateId: 'running-1', downloadedUpdateId: 'update-loop' });

    // First failed activation (no successful launch in between).
    expect(await coordinator.tryReloadIfSafe({ getSafety: () => (SAFE_TAB_ROOT), nowMs: 1000 })).toEqual({
      status: 'reloaded',
      updateId: 'update-loop',
    });
    // Second failed activation.
    expect(await coordinator.tryReloadIfSafe({ getSafety: () => (SAFE_TAB_ROOT), nowMs: 2000 })).toEqual({
      status: 'reloaded',
      updateId: 'update-loop',
    });
    const guard = await storage.loadGuard();
    expect(guard).toEqual({ updateId: 'update-loop', launchCount: 2 });
    expect(OTA_MAX_RELOAD_ATTEMPTS).toBe(2);

    // Third attempt is blocked and reports without reloading.
    const reported: { message: string; extra?: Record<string, unknown> }[] = [];
    const coordinator2 = new OtaCoordinator({
      updates,
      storage,
      report: (message, extra) => reported.push({ message, extra }),
    });
    coordinator2.observeStartup({ currentlyRunningUpdateId: 'running-1', downloadedUpdateId: 'update-loop' });
    const blocked = await coordinator2.tryReloadIfSafe({ getSafety: () => (SAFE_TAB_ROOT), nowMs: 3000 });
    expect(blocked).toEqual({ status: 'blocked-loop-guard', updateId: 'update-loop' });
    expect(updates.reloadCalls).toBe(2);
    expect(reported.length).toBe(1);
    expect(reported[0].message).toBe('ota.loop-guard-blocked');
  });

  test('guard resets only with successful launch of the guarded id', async () => {
    const updates = makeFakeUpdates();
    const storage = createMemoryOtaStorage();
    const coordinator = new OtaCoordinator({ updates, storage });
    coordinator.observeStartup({ currentlyRunningUpdateId: 'running-1', downloadedUpdateId: 'update-xyz' });
    await coordinator.tryReloadIfSafe({ getSafety: () => (SAFE_TAB_ROOT), nowMs: 1000 });
    expect(await storage.loadGuard()).toEqual({ updateId: 'update-xyz', launchCount: 1 });

    // Check/fetch and unrelated launches do not clear.
    coordinator.observeStartup({ currentlyRunningUpdateId: 'running-1', downloadedUpdateId: 'update-xyz' });
    await coordinator.markSuccessfulLaunch('other-id');
    expect(await storage.loadGuard()).toEqual({ updateId: 'update-xyz', launchCount: 1 });
    await coordinator.markSuccessfulLaunch(null);
    expect(await storage.loadGuard()).toEqual({ updateId: 'update-xyz', launchCount: 1 });
    await coordinator.markSuccessfulLaunch(undefined);
    expect(await storage.loadGuard()).toEqual({ updateId: 'update-xyz', launchCount: 1 });

    // Only the matching successful launch clears.
    await coordinator.markSuccessfulLaunch('update-xyz');
    expect(await storage.loadGuard()).toBeNull();
  });

  test('different update id starts a fresh count', async () => {
    const updates = makeFakeUpdates();
    const storage = createMemoryOtaStorage({ guard: { updateId: 'update-old', launchCount: 2 } });
    const coordinator = new OtaCoordinator({ updates, storage });
    coordinator.observeStartup({ currentlyRunningUpdateId: 'running-1', downloadedUpdateId: 'update-new' });
    const result = await coordinator.tryReloadIfSafe({ getSafety: () => (SAFE_TAB_ROOT), nowMs: 5000 });
    expect(result).toEqual({ status: 'reloaded', updateId: 'update-new' });
    expect(await storage.loadGuard()).toEqual({ updateId: 'update-new', launchCount: 1 });
  });
});

describe('OTA first-launch ownership (native ON_LOAD)', () => {
  test('observeStartup never issues a JS check on the same launch', async () => {
    const updates = makeFakeUpdates();
    const storage = createMemoryOtaStorage();
    const coordinator = new OtaCoordinator({ updates, storage });
    coordinator.observeStartup({ currentlyRunningUpdateId: 'running-1', downloadedUpdateId: null });
    expect(updates.checkCalls).toBe(0);
    expect(updates.fetchCalls).toBe(0);
    expect(coordinator.isStartupObserved).toBe(true);
  });

  test('cold foreground (no background interval) never checks', async () => {
    const updates = makeFakeUpdates();
    const storage = createMemoryOtaStorage();
    const coordinator = new OtaCoordinator({ updates, storage });
    coordinator.observeStartup({ currentlyRunningUpdateId: 'running-1' });
    const result = await coordinator.onForeground({
      nowMs: 10_000_000,
      backgroundedAtMs: null,
      getSafety: () => ({ ...SAFE_TAB_ROOT }),
      getEnvelope: () => null,
    });
    expect(result).toEqual({ status: 'suppressed-first-launch' });
    expect(updates.checkCalls).toBe(0);
  });

  test('foreground before observeStartup never checks', async () => {
    const updates = makeFakeUpdates();
    const storage = createMemoryOtaStorage();
    const coordinator = new OtaCoordinator({ updates, storage });
    const result = await coordinator.onForeground({
      nowMs: 10_000_000,
      backgroundedAtMs: 10_000_000 - 7 * HOUR,
      getSafety: () => ({ ...SAFE_TAB_ROOT }),
      getEnvelope: () => null,
    });
    expect(result).toEqual({ status: 'suppressed-first-launch' });
    expect(updates.checkCalls).toBe(0);
  });
});

describe('OTA 6h foreground policy', () => {
  test('isOtaCheckDue requires 6h background and stale last check', () => {
    const now = 100 * HOUR;
    expect(isOtaCheckDue({ nowMs: now, backgroundedAtMs: null, lastCheckAtMs: null })).toBe(false);
    expect(isOtaCheckDue({ nowMs: now, backgroundedAtMs: now - 5 * HOUR, lastCheckAtMs: null })).toBe(false);
    expect(isOtaCheckDue({ nowMs: now, backgroundedAtMs: now - 6 * HOUR, lastCheckAtMs: null })).toBe(true);
    expect(
      isOtaCheckDue({ nowMs: now, backgroundedAtMs: now - 7 * HOUR, lastCheckAtMs: now - 1 * HOUR }),
    ).toBe(false);
    expect(
      isOtaCheckDue({ nowMs: now, backgroundedAtMs: now - 7 * HOUR, lastCheckAtMs: now - 7 * HOUR }),
    ).toBe(true);
    expect(OTA_FOREGROUND_STALE_MS).toBe(6 * 60 * 60 * 1000);
  });

  test('onForeground suppresses when not due and does not hit network', async () => {
    const updates = makeFakeUpdates();
    const storage = createMemoryOtaStorage({ lastCheckAtMs: 1000 });
    const coordinator = new OtaCoordinator({ updates, storage });
    coordinator.observeStartup({ currentlyRunningUpdateId: 'r1' });
    const now = 1000 + 1 * HOUR;
    const result = await coordinator.onForeground({
      nowMs: now,
      backgroundedAtMs: now - 1 * HOUR,
      getSafety: () => ({ ...SAFE_TAB_ROOT }),
      getEnvelope: () => null,
    });
    expect(result.status).toBe('suppressed-not-due');
    expect(updates.checkCalls).toBe(0);
  });

  test('disabled client never checks', async () => {
    const updates = makeFakeUpdates({ isEnabled: false });
    const storage = createMemoryOtaStorage();
    const coordinator = new OtaCoordinator({ updates, storage });
    coordinator.observeStartup({ currentlyRunningUpdateId: null });
    const result = await coordinator.onForeground({
      nowMs: 50 * HOUR,
      backgroundedAtMs: 50 * HOUR - 7 * HOUR,
      getSafety: () => ({ ...SAFE_TAB_ROOT }),
      getEnvelope: () => null,
    });
    expect(result).toEqual({ status: 'suppressed-disabled' });
    expect(updates.checkCalls).toBe(0);
  });
});

describe('OTA separate check/fetch budgets (no shared budget)', () => {
  test('check and fetch budgets are distinct constants', () => {
    expect(OTA_CHECK_BUDGET_MS).not.toBe(OTA_FETCH_BUDGET_MS);
    expect(OTA_CHECK_BUDGET_MS).toBe(15_000);
    expect(OTA_FETCH_BUDGET_MS).toBe(60_000);
  });

  test('check timeout fails without calling fetch or reload', async () => {
    const checkGate = deferred<{ isAvailable: boolean; updateId: string | null }>();
    const updates = makeFakeUpdates({
      check: () => checkGate.promise,
      fetch: async () => ({ isNew: true, updateId: 'update-never' }),
    });
    const storage = createMemoryOtaStorage();
    const coordinator = new OtaCoordinator({ updates, storage, checkBudgetMs: 10, fetchBudgetMs: 5000 });
    coordinator.observeStartup({ currentlyRunningUpdateId: 'r1' });
    const pending = coordinator.checkAndStage(1_000_000);
    // Let the 10ms budget expire while check is still hung.
    const result = await pending;
    expect(result.status).toBe('failed');
    expect((result as { error: string }).error).toMatch(/10ms/);
    expect(updates.fetchCalls).toBe(0);
    expect(updates.reloadCalls).toBe(0);
    // Late check resolution cannot stage or reload.
    checkGate.resolve({ isAvailable: true, updateId: 'update-late' });
    await new Promise((r) => setTimeout(r, 20));
    expect(coordinator.pendingId).toBeNull();
  });

  test('fetch timeout fails without reload (check budget independent)', async () => {
    const fetchGate = deferred<{ isNew: boolean; updateId: string | null }>();
    const updates = makeFakeUpdates({
      check: async () => ({ isAvailable: true, updateId: 'update-f1' }),
      fetch: () => fetchGate.promise,
    });
    const storage = createMemoryOtaStorage();
    const coordinator = new OtaCoordinator({ updates, storage, checkBudgetMs: 5000, fetchBudgetMs: 10 });
    coordinator.observeStartup({ currentlyRunningUpdateId: 'r1' });
    const pending = coordinator.checkAndStage(2_000_000);
    const result = await pending;
    expect(result.status).toBe('failed');
    expect((result as { error: string }).error).toMatch(/10ms/);
    expect(updates.reloadCalls).toBe(0);
    fetchGate.resolve({ isNew: true, updateId: 'update-late-fetch' });
    await new Promise((r) => setTimeout(r, 20));
    expect(coordinator.pendingId).toBeNull();
  });
});

describe('OTA authority revocation (no unsafe Promise.race reload)', () => {
  test('timed-out foreground work cannot reload when the loser resolves late', async () => {
    const checkGate = deferred<{ isAvailable: boolean; updateId: string | null }>();
    const updates = makeFakeUpdates({
      check: () => checkGate.promise,
      fetch: async () => ({ isNew: true, updateId: 'update-late' }),
    });
    const storage = createMemoryOtaStorage();
    const coordinator = new OtaCoordinator({ updates, storage, checkBudgetMs: 10, fetchBudgetMs: 5000 });
    coordinator.observeStartup({ currentlyRunningUpdateId: 'r1' });
    const now = 100 * HOUR;
    const result = await coordinator.onForeground({
      nowMs: now,
      backgroundedAtMs: now - 7 * HOUR,
      getSafety: () => ({ ...SAFE_TAB_ROOT }),
      getEnvelope: () => ({ route: '/home', draftIds: [] }),
    });
    expect(result.status).toBe('failed');
    expect(updates.reloadCalls).toBe(0);
    // Late winner resolves after revocation: must not stage or reload.
    checkGate.resolve({ isAvailable: true, updateId: 'update-late' });
    await new Promise((r) => setTimeout(r, 30));
    expect(coordinator.pendingId).toBeNull();
    expect(updates.reloadCalls).toBe(0);
    // A fresh foreground with a healthy server can still proceed (epoch recovered).
    const updates2 = makeFakeUpdates({
      check: async () => ({ isAvailable: true, updateId: 'update-fresh' }),
      fetch: async () => ({ isNew: true, updateId: 'update-fresh' }),
    });
    const coordinator2 = new OtaCoordinator({
      updates: updates2,
      storage: createMemoryOtaStorage(),
      checkBudgetMs: 1000,
      fetchBudgetMs: 1000,
    });
    coordinator2.observeStartup({ currentlyRunningUpdateId: 'r1' });
    const ok = await coordinator2.onForeground({
      nowMs: now,
      backgroundedAtMs: now - 7 * HOUR,
      getSafety: () => ({ ...SAFE_TAB_ROOT }),
      getEnvelope: () => ({ route: '/home', draftIds: [] }),
    });
    expect(ok).toEqual({ status: 'reloaded', updateId: 'update-fresh' });
  });

  test('no concurrent checks: second foreground while one is in flight returns busy', async () => {
    const checkGate = deferred<{ isAvailable: boolean; updateId: string | null }>();
    const updates = makeFakeUpdates({ check: () => checkGate.promise });
    const storage = createMemoryOtaStorage();
    const coordinator = new OtaCoordinator({ updates, storage, checkBudgetMs: 5000, fetchBudgetMs: 5000 });
    coordinator.observeStartup({ currentlyRunningUpdateId: 'r1' });
    const now = 200 * HOUR;
    const first = coordinator.onForeground({
      nowMs: now,
      backgroundedAtMs: now - 7 * HOUR,
      getSafety: () => ({ ...SAFE_TAB_ROOT }),
      getEnvelope: () => null,
    });
    const second = await coordinator.onForeground({
      nowMs: now,
      backgroundedAtMs: now - 7 * HOUR,
      getSafety: () => ({ ...SAFE_TAB_ROOT }),
      getEnvelope: () => null,
    });
    expect(second).toEqual({ status: 'busy' });
    expect(updates.checkCalls).toBe(1);
    checkGate.resolve({ isAvailable: false, updateId: null });
    const firstResult = await first;
    expect(firstResult).toEqual({ status: 'no-update' });
    expect(updates.checkCalls).toBe(1);
  });

  test('no concurrent reloads: tryReloadIfSafe while foreground is in flight fails closed', async () => {
    const checkGate = deferred<{ isAvailable: boolean; updateId: string | null }>();
    const updates = makeFakeUpdates({ check: () => checkGate.promise });
    const storage = createMemoryOtaStorage();
    const coordinator = new OtaCoordinator({ updates, storage, checkBudgetMs: 5000, fetchBudgetMs: 5000 });
    coordinator.observeStartup({ currentlyRunningUpdateId: 'r1', downloadedUpdateId: 'update-staged' });
    const now = 300 * HOUR;
    const foreground = coordinator.onForeground({
      nowMs: now,
      backgroundedAtMs: now - 7 * HOUR,
      getSafety: () => ({ ...SAFE_TAB_ROOT }),
      getEnvelope: () => null,
    });
    const reloadAttempt = await coordinator.tryReloadIfSafe({ getSafety: () => (SAFE_TAB_ROOT), nowMs: now });
    expect(reloadAttempt.status).toBe('failed');
    checkGate.resolve({ isAvailable: false, updateId: null });
    await foreground;
  });
});

describe('OTA storage injection', () => {
  test('memory storage round-trips guard/envelope/last-check', async () => {
    const storage: OtaStorage = createMemoryOtaStorage();
    expect(await storage.loadGuard()).toBeNull();
    await storage.saveGuard({ updateId: 'u1', launchCount: 1 });
    expect(await storage.loadGuard()).toEqual({ updateId: 'u1', launchCount: 1 });
    await storage.clearGuard();
    expect(await storage.loadGuard()).toBeNull();
    await storage.saveEnvelope({ route: '/home', draftIds: ['a'], savedAtMs: 123 });
    expect(await storage.loadEnvelope()).toEqual({ route: '/home', draftIds: ['a'], savedAtMs: 123 });
    expect(await storage.loadLastCheckAtMs()).toBeNull();
    await storage.saveLastCheckAtMs(456);
    expect(await storage.loadLastCheckAtMs()).toBe(456);
  });
});
