import {
  BUILDER_PATHS,
  ONBOARDING_STEPS,
  createDemoState,
  getBuilderScreen,
  getHomeModel,
  getOnboardingScreen,
  transitionDemo,
} from '../index';

describe('presentation-state transitions', () => {
  it('starts at onboarding with no hidden conditions or economy choices', () => {
    const state = createDemoState();

    expect(state.stage).toBe('onboarding');
    expect(state.onboarding.step).toBe('value');
    expect(state.onboarding.phoneUseHours).toBeNull();
    expect(state.onboarding.allowanceMinutes).toBeNull();
    expect(state.conditions).toEqual([]);
    expect(state.savedGyms).toEqual([]);
  });

  it('moves through every onboarding screen without skipping and gates required choices', () => {
    let state = createDemoState();
    const visited = [state.onboarding.step];

    state = transitionDemo(state, { type: 'onboarding/continue' });
    visited.push(state.onboarding.step);

    // Confession is intentionally blocked until the user touches a value.
    state = transitionDemo(state, { type: 'onboarding/continue' });
    expect(state.onboarding.step).toBe('confession');
    state = transitionDemo(state, { type: 'onboarding/set-phone-use', hours: 5 });

    while (state.onboarding.step !== 'allowance') {
      state = transitionDemo(state, { type: 'onboarding/continue' });
      visited.push(state.onboarding.step);
    }

    state = transitionDemo(state, { type: 'onboarding/continue' });
    expect(state.onboarding.step).toBe('allowance');
    state = transitionDemo(state, { type: 'onboarding/set-allowance', minutes: 45 });
    state = transitionDemo(state, { type: 'onboarding/continue' });
    visited.push(state.onboarding.step);
    state = transitionDemo(state, { type: 'onboarding/continue' });
    visited.push(state.onboarding.step);
    state = transitionDemo(state, { type: 'onboarding/continue' });

    expect(visited).toEqual(ONBOARDING_STEPS);
    expect(state.stage).toBe('paywall');
  });

  it('replaces the selected app set atomically for onboarding commit and review return', () => {
    let state = createDemoState();
    state = transitionDemo(state, {
      type: 'onboarding/set-apps',
      appIds: ['loop', 'circle'],
    });
    state = transitionDemo(state, { type: 'onboarding/set-step', step: 'review' });
    state = transitionDemo(state, { type: 'onboarding/set-step', step: 'apps' });

    expect(state.onboarding.selectedApps).toEqual(['loop', 'circle']);

    state = transitionDemo(state, {
      type: 'onboarding/set-apps',
      appIds: ['clips'],
    });
    expect(state.onboarding.selectedApps).toEqual(['clips']);
  });

  it('requires the simulated post-purchase signup before the natural empty Home', () => {
    let state = createDemoState({ stage: 'paywall' });

    state = transitionDemo(state, { type: 'paywall/select-plan', plan: 'annual' });
    state = transitionDemo(state, { type: 'paywall/purchase-succeeded' });
    expect(state.stage).toBe('signup');
    expect(state.account.status).toBe('postPurchase');

    state = transitionDemo(state, { type: 'account/complete-signup' });
    expect(state.stage).toBe('home');
    expect(state.account.status).toBe('signedInDemo');
    expect(state.conditions).toHaveLength(0);
    expect(getHomeModel(state).mode).toBe('first-home-empty');
  });

  it('saves condition #1 only after every builder choice is explicit', () => {
    let state = createDemoState({ stage: 'home' });
    state = transitionDemo(state, {
      type: 'gym/save',
      gym: {
        id: 'riverfront-club',
        name: 'Riverfront Club',
        radiusMeters: 125,
        detection: 'manual',
        placeType: 'honor',
        wifi: 'off',
        autoPermission: 'notAsked',
      },
    });
    state = transitionDemo(state, { type: 'builder/start' });
    state = transitionDemo(state, { type: 'builder/select-category', category: 'Gym' });
    state = transitionDemo(state, { type: 'builder/continue' });
    state = transitionDemo(state, { type: 'builder/select-catalog', catalogId: 'gym-arrive' });

    expect(BUILDER_PATHS.event).toEqual([
      'catalog',
      'method',
      'place',
      'configure-event',
      'reward',
      'daily-cap',
      'cooldown',
      'repeatable',
      'active-window',
      'banner',
      'preview',
    ]);
    expect(getBuilderScreen(state).canContinue).toBe(true);

    state = transitionDemo(state, { type: 'builder/continue' });
    expect(getBuilderScreen(state).canContinue).toBe(false);
    state = transitionDemo(state, { type: 'builder/set-place', gymId: 'riverfront-club' });
    state = transitionDemo(state, { type: 'builder/continue' });
    state = transitionDemo(state, { type: 'builder/set-event-threshold', value: 1 });
    state = transitionDemo(state, { type: 'builder/continue' });
    state = transitionDemo(state, { type: 'builder/set-reward', reward: 'fixed', minutes: 30 });
    state = transitionDemo(state, { type: 'builder/set-daily-cap', value: 1 });
    state = transitionDemo(state, { type: 'builder/set-cooldown', minutes: 240 });
    state = transitionDemo(state, { type: 'builder/set-repeatable', value: false });
    state = transitionDemo(state, { type: 'builder/set-active-window', value: 'anytime' });
    expect(getBuilderScreen(state).canContinue).toBe(true);
    state = transitionDemo(state, { type: 'builder/continue' });
    state = transitionDemo(state, { type: 'builder/continue' });
    state = transitionDemo(state, { type: 'builder/continue' });
    state = transitionDemo(state, { type: 'builder/continue' });
    state = transitionDemo(state, { type: 'builder/continue' });
    state = transitionDemo(state, { type: 'builder/set-banner', bannerId: 'gym-weights-floor' });
    state = transitionDemo(state, { type: 'builder/continue' });
    state = transitionDemo(state, { type: 'builder/save' });

    expect(state.stage).toBe('home');
    expect(state.conditions).toHaveLength(1);
    expect(state.conditions[0]).toMatchObject({
      context: 'Riverfront Club',
      gymId: 'riverfront-club',
      kind: 'event',
      name: 'Go to gym',
      reward: { kind: 'fixed', minutes: 30 },
    });
  });

  it('credits a completed event before settling its earned time on Home', () => {
    let state = createDemoState({ stage: 'home', showcase: true });
    state = transitionDemo(state, { type: 'condition/complete-event', conditionId: 'demo-gym' });

    expect(state.home).toMatchObject({
      mode: 'locked',
      remainingMinutes: 0,
      earnTransition: {
        conditionIds: ['demo-gym'],
        pendingMinutes: 30,
        targetMode: 'unlocked',
      },
    });
    expect(state.conditions.find((item) => item.id === 'demo-gym')?.todayStatus).toBe('crediting');
    expect(state.systemClaims.locationRead).toBe(false);

    state = transitionDemo(state, { type: 'home/settle-earn' });

    expect(state.home).toMatchObject({
      mode: 'unlocked',
      remainingMinutes: 30,
      balanceOnHold: false,
      earnTransition: null,
    });
    expect(state.conditions.find((item) => item.id === 'demo-gym')?.todayStatus).toBe('completed');
  });

  it('signs a recovery user back in without clearing setup or conditions', () => {
    let state = createDemoState({ stage: 'home', showcase: true });
    state = transitionDemo(state, { type: 'rules/set-allowance', minutes: 60 });
    state = transitionDemo(state, { type: 'rules/set-rollover', enabled: true, capMinutes: 90 });
    state = transitionDemo(state, { type: 'onboarding/toggle-app', appId: 'orbit' });
    state = transitionDemo(state, { type: 'account/sign-out' });

    expect(state.account.status).toBe('signedOutDemo');

    state = transitionDemo(state, { type: 'account/sign-in' });

    expect(state.stage).toBe('home');
    expect(state.account.status).toBe('signedInDemo');
    expect(state.conditions.map((condition) => condition.id)).toEqual([
      'demo-gym',
      'demo-walk',
      'demo-steps',
    ]);
    expect(state.savedGyms.map((gym) => gym.id)).toEqual(['harbor-strength']);
    expect(state.onboarding.selectedApps).toEqual(['loop', 'clips']);
    expect(state.rules).toMatchObject({
      allowanceMinutes: 60,
      rolloverEnabled: true,
      rolloverCapMinutes: 90,
    });
  });

  it('replaces an edited condition in place instead of appending a duplicate', () => {
    let state = createDemoState({ stage: 'home', showcase: true });
    state = transitionDemo(state, { type: 'builder/start-edit', conditionId: 'demo-gym' });

    expect(state.builder).toMatchObject({
      editingConditionId: 'demo-gym',
      enabled: true,
      gymId: 'harbor-strength',
      name: 'Go to gym',
    });

    state = transitionDemo(state, { type: 'builder/set-name', name: 'After-work gym' });
    state = transitionDemo(state, { type: 'builder/set-enabled', enabled: false });
    state = transitionDemo(state, { type: 'builder/continue' });
    state = transitionDemo(state, { type: 'builder/set-reward', reward: 'fixed', minutes: 45 });
    state = transitionDemo(state, { type: 'builder/continue' });
    state = transitionDemo(state, { type: 'builder/continue' });
    state = transitionDemo(state, { type: 'builder/continue' });
    state = transitionDemo(state, { type: 'builder/continue' });
    state = transitionDemo(state, { type: 'builder/continue' });
    state = transitionDemo(state, { type: 'builder/continue' });
    state = transitionDemo(state, { type: 'builder/save' });

    expect(state.stage).toBe('home');
    expect(state.conditions.map((condition) => condition.id)).toEqual([
      'demo-gym',
      'demo-walk',
      'demo-steps',
    ]);
    expect(state.conditions.filter((condition) => condition.id === 'demo-gym')).toHaveLength(1);
    expect(state.conditions[0]).toMatchObject({
      enabled: false,
      gymId: 'harbor-strength',
      name: 'After-work gym',
      reward: { kind: 'fixed', minutes: 45 },
    });

    state = transitionDemo(state, {
      type: 'gym/save',
      gym: {
        ...state.savedGyms[0],
        name: 'Waterfront Strength',
      },
    });
    expect(state.conditions[0]).toMatchObject({
      context: 'Waterfront Strength',
      gymId: 'harbor-strength',
    });
    expect(state.conditions[0].ruleSummary).toContain('Waterfront Strength');
  });

  it('moves conditions one position at a time and keeps boundary order stable', () => {
    let state = createDemoState({ stage: 'home', showcase: true });

    state = transitionDemo(state, { type: 'condition/move', conditionId: 'demo-steps', direction: 'up' });
    expect(state.conditions.map((condition) => condition.id)).toEqual([
      'demo-gym',
      'demo-steps',
      'demo-walk',
    ]);

    state = transitionDemo(state, { type: 'condition/move', conditionId: 'demo-steps', direction: 'up' });
    expect(state.conditions.map((condition) => condition.id)).toEqual([
      'demo-steps',
      'demo-gym',
      'demo-walk',
    ]);

    state = transitionDemo(state, { type: 'condition/move', conditionId: 'demo-steps', direction: 'up' });
    expect(state.conditions.map((condition) => condition.id)).toEqual([
      'demo-steps',
      'demo-gym',
      'demo-walk',
    ]);

    state = transitionDemo(state, { type: 'condition/move', conditionId: 'demo-steps', direction: 'down' });
    expect(state.conditions.map((condition) => condition.id)).toEqual([
      'demo-gym',
      'demo-steps',
      'demo-walk',
    ]);
  });

  it('persists per-condition weekday rewards deeply and removes stale overrides with a condition', () => {
    let state = createDemoState({ stage: 'home', showcase: true });
    const weekly = {
      ...state.rules.weekly,
      dayModes: { ...state.rules.weekly.dayModes, monday: 'custom' as const },
      customValues: {
        ...state.rules.weekly.customValues,
        monday: {
          ...state.rules.weekly.customValues.monday,
          rewardOverrides: {
            'demo-gym': { kind: 'fixed' as const, minutes: 45 },
            'demo-walk': { kind: 'off' as const },
          },
        },
      },
    };

    state = transitionDemo(state, { type: 'rules/set-weekly', weekly });

    expect(state.rules.weekly.customValues.monday.rewardOverrides).toEqual({
      'demo-gym': { kind: 'fixed', minutes: 45 },
      'demo-walk': { kind: 'off' },
    });
    expect(state.rules.weekly.customValues.monday.rewardOverrides).not.toBe(
      weekly.customValues.monday.rewardOverrides,
    );
    expect(state.rules.weekly.customValues.monday.rewardOverrides['demo-gym']).not.toBe(
      weekly.customValues.monday.rewardOverrides['demo-gym'],
    );

    state = transitionDemo(state, { type: 'condition/remove', conditionId: 'demo-gym' });
    expect(state.rules.weekly.customValues.monday.rewardOverrides).toEqual({
      'demo-walk': { kind: 'off' },
    });
  });

  it.each([
    ['restOfDay', 'rest-of-day'],
    ['setPeriod', 'set-period'],
    ['restDayNoLocking', 'rest-day-no-locking'],
    ['outsideLockWindow', 'outside-window'],
  ] as const)('selects %s access-holiday copy/state', (kind, expectedMode) => {
    const state = transitionDemo(createDemoState({ stage: 'home' }), {
      type: 'home/set-access-holiday',
      kind,
    });

    expect(getHomeModel(state).mode).toBe(expectedMode);
    expect(getHomeModel(state).balanceOnHold).toBe(true);
  });

  it('advances walking and gym sessions through deterministic local phases', () => {
    let state = createDemoState({ stage: 'home', showcase: true });
    state = transitionDemo(state, { type: 'walk/start' });
    expect(state.sessions.walk).toBe('verifying');
    state = transitionDemo(state, { type: 'walk/verified' });
    expect(state.sessions.walk).toBe('active');
    state = transitionDemo(state, { type: 'walk/pause' });
    expect(state.sessions.walk).toBe('paused');
    state = transitionDemo(state, { type: 'walk/enter-grace' });
    expect(state.sessions.walk).toBe('grace');
    state = transitionDemo(state, { type: 'walk/resume' });
    expect(state.sessions.walk).toBe('active');

    state = transitionDemo(state, { type: 'gym/start' });
    expect(state.sessions.gym).toBe('verifying');
    state = transitionDemo(state, { type: 'gym/verified' });
    expect(state.sessions.gym).toBe('verified');
    expect(state.systemClaims.locationRead).toBe(false);
  });

  it('keeps automatic review eligibility separate from permanent manual suppression', () => {
    let state = createDemoState({ stage: 'home' });
    state = transitionDemo(state, { type: 'review/record-unlock' });
    expect(state.review.eligibleTrigger).toBeNull();
    for (let count = 1; count < 5; count += 1) {
      state = transitionDemo(state, { type: 'review/record-unlock' });
    }
    expect(state.review.eligibleTrigger).toBe('fifthUnlock');
    expect(state.review.automaticSuppressedPermanently).toBe(false);

    state = transitionDemo(state, { type: 'review/open-manual-rate' });
    expect(state.review.automaticSuppressedPermanently).toBe(true);
    expect(state.review.prompt).toBe('presented');
  });

  it('dismisses, suppresses, and rates review prompts through explicit states', () => {
    let state = createDemoState({ stage: 'home' });
    state = transitionDemo(state, {
      type: 'debug/set-review',
      prompt: 'presented',
      trigger: 'sevenDays',
    });
    state = transitionDemo(state, { type: 'review/suppress-after-shield' });
    expect(state.review.prompt).toBe('suppressedAfterShield');

    for (let automaticShowCount = 1; automaticShowCount <= 3; automaticShowCount += 1) {
      state = transitionDemo(state, {
        type: 'debug/set-review',
        prompt: 'presented',
        trigger: 'sevenDays',
        automaticShowCount,
      });
      state = transitionDemo(state, { type: 'review/dismiss' });
      expect(state.review.automaticShowCount).toBe(automaticShowCount);
      expect(state.review.prompt).toBe(automaticShowCount === 3 ? 'stoppedAfterThree' : 'dismissed');
    }

    state = transitionDemo(state, {
      type: 'debug/set-review',
      prompt: 'presented',
      trigger: 'thirtyDays',
    });
    state = transitionDemo(state, { type: 'review/rate' });
    expect(state.review.prompt).toBe('rated');
    expect(state.review.automaticSuppressedPermanently).toBe(true);
  });

  it('drives every debug fixture locally and reset restores the initial demo', () => {
    let state = transitionDemo(createDemoState(), { type: 'debug/seed-showcase' });
    state = transitionDemo(state, { type: 'debug/set-walk', phase: 'permission-lost' });
    state = transitionDemo(state, { type: 'debug/set-gym', phase: 'failed' });
    state = transitionDemo(state, { type: 'debug/set-account', status: 'signedOutDemo' });
    state = transitionDemo(state, { type: 'debug/set-permission-health', health: 'healthy' });
    state = transitionDemo(state, { type: 'debug/set-subscription', status: 'cancelled' });
    state = transitionDemo(state, {
      type: 'debug/set-review',
      prompt: 'presented',
      trigger: 'thirtyDays',
      automaticShowCount: 2,
      automaticSuppressedPermanently: true,
    });

    expect(state.stage).toBe('home');
    expect(state.conditions.map((condition) => condition.id)).toEqual([
      'demo-gym',
      'demo-walk',
      'demo-steps',
    ]);
    expect(state.sessions).toEqual({
      walk: 'permission-lost',
      walkConditionId: 'demo-walk',
      gym: 'failed',
      gymConditionId: 'demo-gym',
    });
    expect(state.account.status).toBe('signedOutDemo');
    expect(state.settings).toMatchObject({
      permissionHealth: 'healthy',
      subscriptionStatus: 'cancelled',
    });
    expect(state.review).toMatchObject({
      prompt: 'presented',
      eligibleTrigger: 'thirtyDays',
      automaticShowCount: 2,
      automaticSuppressedPermanently: true,
    });

    state = transitionDemo(state, { type: 'debug/clear-conditions' });
    expect(state.conditions).toEqual([]);
    expect(state.home).toMatchObject({ mode: 'first-home-empty', remainingMinutes: 0 });

    state = transitionDemo(state, { type: 'debug/reset' });
    expect(state).toMatchObject({
      stage: 'onboarding',
      activeTab: 'home',
      conditions: [],
      sessions: {
        walk: 'ready',
        walkConditionId: null,
        gym: 'ready',
        gymConditionId: null,
      },
      review: {
        prompt: 'eligible',
        automaticShowCount: 0,
        automaticSuppressedPermanently: false,
      },
    });
  });

  it('opens notification previews locally and maps them to exact destinations', () => {
    let state = createDemoState({ stage: 'home' });
    state = transitionDemo(state, { type: 'notification/open-preview', kind: 'weeklyRecap' });
    expect(state.notification).toMatchObject({ kind: 'weeklyRecap', phase: 'unopened' });
    state = transitionDemo(state, { type: 'notification/tap' });
    expect(state.notification).toMatchObject({ phase: 'tapped', destination: 'analysis-share' });
    expect(state.systemClaims.notificationDelivered).toBe(false);
  });
});

describe('flow selectors', () => {
  it('returns exact visible onboarding copy and enabled state', () => {
    let state = createDemoState();
    expect(getOnboardingScreen(state)).toMatchObject({
      id: 'D-ONB-01',
      title: 'Earn your screen time.',
      primaryLabel: 'Next',
      canContinue: true,
    });

    state = transitionDemo(state, { type: 'onboarding/continue' });
    expect(getOnboardingScreen(state)).toMatchObject({
      id: 'D-ONB-02',
      canContinue: false,
    });
  });
});
