import { createDemoState, transitionDemo, type DemoState } from '../index';

function saveRateCondition(
  state: DemoState,
  catalogId: string,
  bannerId: string,
  rateMinutes = 25,
) {
  let next = transitionDemo(state, { type: 'builder/start' });
  next = transitionDemo(next, { type: 'builder/select-catalog', catalogId });
  next = transitionDemo(next, { type: 'builder/set-rate-minutes', minutes: rateMinutes });
  next = transitionDemo(next, { type: 'builder/set-active-window', value: 'guided' });
  next = transitionDemo(next, { type: 'builder/set-active-window-time', edge: 'start', minutes: 420 });
  next = transitionDemo(next, { type: 'builder/set-active-window-time', edge: 'end', minutes: 1320 });
  next = transitionDemo(next, { type: 'builder/continue' });
  next = transitionDemo(next, { type: 'builder/set-banner', bannerId });
  next = transitionDemo(next, { type: 'builder/continue' });
  return transitionDemo(next, { type: 'builder/save' });
}

function dayKey(dayOffset: number) {
  return new Date(Date.UTC(2026, 0, 1 + dayOffset)).toISOString().slice(0, 10);
}

describe('presentation integrity', () => {
  it('persists every onboarding permission outcome and keeps the motion compatibility field synchronized', () => {
    let state = createDemoState();
    expect(state.onboarding.permissionOutcomes).toEqual({
      screenTime: 'notAsked',
      motion: 'notAsked',
      health: 'notAsked',
      location: 'notAsked',
    });

    state = transitionDemo(state, {
      type: 'onboarding/set-permission',
      permission: 'screenTime',
      value: 'allowed',
    });
    state = transitionDemo(state, {
      type: 'onboarding/set-permission',
      permission: 'health',
      value: 'denied',
    });
    state = transitionDemo(state, {
      type: 'onboarding/set-permission',
      permission: 'location',
      value: 'allowed',
    });
    state = transitionDemo(state, {
      type: 'onboarding/set-permission',
      permission: 'motion',
      value: 'denied',
    });
    expect(state.onboarding.permissionOutcomes).toEqual({
      screenTime: 'allowed',
      motion: 'denied',
      health: 'denied',
      location: 'allowed',
    });
    expect(state.onboarding.motionPermission).toBe('denied');

    state = transitionDemo(state, {
      type: 'onboarding/set-motion-permission',
      value: 'allowed',
    });
    expect(state.onboarding.permissionOutcomes.motion).toBe('allowed');
    expect(state.onboarding.motionPermission).toBe('allowed');
  });

  it('keeps notification prompt gating separate from its persisted permission outcome', () => {
    let state = createDemoState({ stage: 'home' });

    state = transitionDemo(state, { type: 'settings/set-notification-permission-outcome', value: 'denied' });
    expect(state.settings).toMatchObject({
      notificationPermissionOutcome: 'denied',
      notificationPermissionPreviewed: true,
    });

    state = transitionDemo(state, { type: 'settings/set-notification-permission-outcome', value: 'notAsked' });
    expect(state.settings).toMatchObject({
      notificationPermissionOutcome: 'notAsked',
      notificationPermissionPreviewed: false,
    });
  });

  it('persists and edit-hydrates every configured event value without parsing display copy', () => {
    let state = createDemoState({ stage: 'home' });
    state = transitionDemo(state, { type: 'builder/start' });
    state = transitionDemo(state, {
      type: 'builder/select-catalog',
      catalogId: 'active-minutes-event',
    });
    state = transitionDemo(state, { type: 'builder/set-event-threshold', value: 35 });
    state = transitionDemo(state, { type: 'builder/set-active-window', value: 'guided' });
    state = transitionDemo(state, { type: 'builder/set-active-window-time', edge: 'start', minutes: 420 });
    state = transitionDemo(state, { type: 'builder/set-active-window-time', edge: 'end', minutes: 1320 });
    state = transitionDemo(state, { type: 'builder/continue' });
    state = transitionDemo(state, {
      type: 'builder/set-reward',
      reward: 'set-period',
      minutes: 75,
    });
    state = transitionDemo(state, { type: 'builder/set-daily-cap', value: 'unlimited' });
    state = transitionDemo(state, { type: 'builder/set-cooldown', minutes: 60 });
    state = transitionDemo(state, { type: 'builder/set-repeatable', value: true });
    state = transitionDemo(state, { type: 'builder/continue' });
    state = transitionDemo(state, {
      type: 'builder/set-banner',
      bannerId: 'general-abstract-energy',
    });
    state = transitionDemo(state, { type: 'builder/continue' });
    state = transitionDemo(state, { type: 'builder/save' });

    expect(state.conditions[0]).toMatchObject({
      eventThreshold: 35,
      stateGraceSeconds: null,
      rateMinutes: null,
      reward: { kind: 'set-period', minutes: 75 },
      dailyCap: 'unlimited',
      cooldownMinutes: 60,
      repeatable: true,
      activeWindow: 'guided',
    });

    state = transitionDemo(state, {
      type: 'builder/start-edit',
      conditionId: state.conditions[0].id,
    });
    expect(state.builder).toMatchObject({
      eventThreshold: 35,
      stateGraceSeconds: null,
      rateMinutes: null,
      reward: 'set-period',
      rewardMinutes: 75,
      dailyCap: 'unlimited',
      cooldownMinutes: 60,
      repeatable: true,
      activeWindow: 'guided',
    });
  });

  it('round-trips exact state and rate configuration independently', () => {
    let state = createDemoState({ stage: 'home' });
    state = transitionDemo(state, { type: 'builder/start' });
    state = transitionDemo(state, { type: 'builder/select-catalog', catalogId: 'walk-state' });
    state = transitionDemo(state, { type: 'builder/set-state-grace', seconds: 180 });
    state = transitionDemo(state, { type: 'builder/set-active-window', value: 'guided' });
    state = transitionDemo(state, { type: 'builder/set-active-window-time', edge: 'start', minutes: 420 });
    state = transitionDemo(state, { type: 'builder/set-active-window-time', edge: 'end', minutes: 1320 });
    state = transitionDemo(state, { type: 'builder/continue' });
    state = transitionDemo(state, { type: 'builder/set-banner', bannerId: 'walk-night-walk' });
    state = transitionDemo(state, { type: 'builder/continue' });
    state = transitionDemo(state, { type: 'builder/save' });
    state = saveRateCondition(state, 'walk-steps-rate', 'walk-park-path', 55);

    expect(state.conditions[0]).toMatchObject({
      eventThreshold: null,
      stateGraceSeconds: 180,
      rateMinutes: null,
      activeWindow: 'guided',
    });
    expect(state.conditions[1]).toMatchObject({
      eventThreshold: null,
      stateGraceSeconds: null,
      rateMinutes: 55,
      activeWindow: 'guided',
      dailyCap: null,
      cooldownMinutes: null,
      repeatable: null,
    });

    state = transitionDemo(state, {
      type: 'builder/start-edit',
      conditionId: state.conditions[0].id,
    });
    expect(state.builder.stateGraceSeconds).toBe(180);
    expect(state.builder.activeWindow).toBe('guided');
    state = transitionDemo(state, { type: 'builder/cancel' });
    state = transitionDemo(state, {
      type: 'builder/start-edit',
      conditionId: state.conditions[1].id,
    });
    expect(state.builder.rateMinutes).toBe(55);
    expect(state.builder.activeWindow).toBe('guided');
  });

  it('allocates monotonic condition IDs across deletion and debug clearing, then resets explicitly', () => {
    let state = saveRateCondition(
      createDemoState({ stage: 'home' }),
      'walk-steps-rate',
      'walk-park-path',
    );
    expect(state.conditions[0].id).toBe('condition-1');
    expect(state.nextConditionSequence).toBe(2);

    state = transitionDemo(state, { type: 'condition/remove', conditionId: 'condition-1' });
    state = saveRateCondition(state, 'run-distance-rate', 'run-road-dawn');
    expect(state.conditions[0].id).toBe('condition-2');

    state = transitionDemo(state, { type: 'debug/clear-conditions' });
    state = saveRateCondition(state, 'cycle-distance-rate', 'cycle-open-road');
    expect(state.conditions[0].id).toBe('condition-3');
    expect(state.nextConditionSequence).toBe(4);

    state = transitionDemo(state, { type: 'debug/reset' });
    expect(state.nextConditionSequence).toBe(1);
  });

  it('keeps Analysis empty until completed activity, then persists its milestone lifecycle', () => {
    let state = createDemoState({ stage: 'home', showcase: true });
    expect(state.analysis).toEqual({
      history: 'empty',
      presentationMode: 'natural',
      currentStreakDays: 0,
      activityCount: 0,
      activityLedger: [],
      streakDayKeys: [],
      timeLockedMinutes: 0,
      milestoneShelfSeen: true,
      newBadgeIds: [],
    });

    state = transitionDemo(state, {
      type: 'analysis/record-activity',
      conditionId: 'demo-walk',
      qualifyingMinutes: 10,
    });
    expect(state.analysis).toEqual({
      history: 'populated',
      presentationMode: 'natural',
      currentStreakDays: 1,
      activityCount: 1,
      activityLedger: [{ conditionId: 'demo-walk', dayKey: '2026-08-07', qualifyingMinutes: 10 }],
      streakDayKeys: ['2026-08-07'],
      timeLockedMinutes: 0,
      milestoneShelfSeen: false,
      newBadgeIds: ['activity-1'],
    });

    state = transitionDemo(state, { type: 'analysis/mark-milestone-shelf-seen' });
    state = transitionDemo(state, { type: 'analysis/clear-badge-new', badgeId: 'activity-1' });
    expect(state.analysis).toMatchObject({
      history: 'populated',
      milestoneShelfSeen: true,
      newBadgeIds: [],
    });

    state = transitionDemo(state, {
      type: 'analysis/record-activity',
      conditionId: 'demo-walk',
      dayKey: '2026-08-08',
      qualifyingMinutes: 10,
    });
    expect(state.analysis).toMatchObject({
      activityCount: 2,
      currentStreakDays: 2,
      milestoneShelfSeen: true,
      newBadgeIds: [],
    });

    state = transitionDemo(state, {
      type: 'debug/set-analysis',
      history: 'populated',
      newBadgeId: 'time-reclaimed-50-hours',
    });
    expect(state.analysis).toMatchObject({
      history: 'populated',
      milestoneShelfSeen: false,
      newBadgeIds: ['time-reclaimed-50-hours'],
    });
  });

  it('records one Analysis activity for a verified event after its earn settles', () => {
    let state = createDemoState({ stage: 'home', showcase: true });
    state = transitionDemo(state, { type: 'gym/start' });
    state = transitionDemo(state, { type: 'gym/verified' });
    expect(state.analysis.activityCount).toBe(0);

    state = transitionDemo(state, { type: 'condition/complete-event', conditionId: 'demo-gym' });
    state = transitionDemo(state, { type: 'home/settle-earn' });
    expect(state.analysis).toMatchObject({
      activityCount: 1,
      currentStreakDays: 1,
      history: 'populated',
    });
  });

  it('presents the fifth-unlock candidate only once after the three-day install gate', () => {
    let state = createDemoState({ stage: 'home', showcase: true });
    state = transitionDemo(state, { type: 'review/set-install-age-days', days: 2 });
    for (let count = 0; count < 5; count += 1) {
      state = transitionDemo(state, { type: 'review/record-unlock' });
    }
    expect(state.review).toMatchObject({
      unlockCount: 5,
      eligibleTrigger: null,
      promptOrigin: null,
    });

    state = transitionDemo(state, { type: 'review/set-install-age-days', days: 3 });
    expect(state.review).toMatchObject({
      eligibleTrigger: 'fifthUnlock',
      prompt: 'presented',
      promptOrigin: 'automatic',
      automaticShowCount: 1,
    });

    state = transitionDemo(state, { type: 'review/dismiss' });
    state = transitionDemo(state, { type: 'review/record-unlock' });
    expect(state.review).toMatchObject({
      prompt: 'dismissed',
      automaticShowCount: 1,
      handledTriggers: ['fifthUnlock'],
    });
  });

  it('orders later streak candidates, consumes shield suppression, and stops after three dismissals', () => {
    let state = createDemoState({ stage: 'home' });
    for (let count = 0; count < 5; count += 1) {
      state = transitionDemo(state, { type: 'review/record-unlock' });
    }
    state = transitionDemo(state, { type: 'review/dismiss' });
    state = transitionDemo(state, { type: 'review/record-streak', trigger: 'sevenDays' });
    expect(state.review).toMatchObject({
      eligibleTrigger: 'sevenDays',
      prompt: 'presented',
      promptOrigin: 'automatic',
    });
    state = transitionDemo(state, { type: 'review/dismiss' });

    state = transitionDemo(state, { type: 'review/suppress-after-shield' });
    state = transitionDemo(state, { type: 'review/record-streak', trigger: 'thirtyDays' });
    expect(state.review).toMatchObject({
      eligibleTrigger: 'thirtyDays',
      prompt: 'suppressedAfterShield',
      automaticShowCount: 2,
      shieldSuppressionActive: true,
      shieldSuppressionRemainingMinutes: 30,
      handledTriggers: ['fifthUnlock', 'sevenDays'],
    });

    state = transitionDemo(state, { type: 'review/advance-clock', minutes: 12 });
    expect(state.review).toMatchObject({
      prompt: 'suppressedAfterShield',
      shieldSuppressionRemainingMinutes: 18,
    });
    state = transitionDemo(state, { type: 'review/advance-clock', minutes: 18 });
    expect(state.review).toMatchObject({
      prompt: 'presented',
      promptOrigin: 'automatic',
      automaticShowCount: 3,
      shieldSuppressionActive: false,
      shieldSuppressionRemainingMinutes: 0,
      handledTriggers: ['fifthUnlock', 'sevenDays', 'thirtyDays'],
    });
    state = transitionDemo(state, { type: 'review/dismiss' });
    expect(state.review).toMatchObject({
      automaticShowCount: 3,
      prompt: 'stoppedAfterThree',
    });

    state = transitionDemo(state, {
      type: 'debug/set-review',
      prompt: 'presented',
      trigger: 'thirtyDays',
      automaticShowCount: 3,
    });
    state = transitionDemo(state, { type: 'review/dismiss' });
    expect(state.review.automaticShowCount).toBe(3);
  });

  it('turns completed sample activity days into ordered seven- and thirty-day review candidates', () => {
    let state = createDemoState({ stage: 'home', showcase: true });
    state = {
      ...state,
      rules: {
        ...state.rules,
        weekly: {
          ...state.rules.weekly,
          dayModes: { ...state.rules.weekly.dayModes, sunday: 'active' },
        },
      },
    };
    for (let count = 0; count < 5; count += 1) {
      state = transitionDemo(state, { type: 'review/record-unlock' });
    }
    state = transitionDemo(state, { type: 'review/dismiss' });
    for (let day = 0; day < 7; day += 1) {
      state = transitionDemo(state, {
        type: 'analysis/record-activity',
        conditionId: 'demo-walk',
        dayKey: dayKey(day),
        qualifyingMinutes: 10,
      });
    }
    expect(state.review).toMatchObject({
      eligibleTrigger: 'sevenDays',
      prompt: 'presented',
      promptOrigin: 'automatic',
    });

    state = transitionDemo(state, { type: 'review/dismiss' });
    for (let day = 7; day < 30; day += 1) {
      state = transitionDemo(state, {
        type: 'analysis/record-activity',
        conditionId: 'demo-walk',
        dayKey: dayKey(day),
        qualifyingMinutes: 10,
      });
    }
    expect(state.review).toMatchObject({
      eligibleTrigger: 'thirtyDays',
      prompt: 'presented',
      promptOrigin: 'automatic',
      handledTriggers: ['fifthUnlock', 'sevenDays', 'thirtyDays'],
    });
  });

  it('keeps manual Rate independent and permanently stops automatic prompts without changing their count', () => {
    let state = createDemoState({ stage: 'home' });
    state = transitionDemo(state, {
      type: 'debug/set-review',
      prompt: 'dismissed',
      trigger: 'sevenDays',
      automaticShowCount: 2,
    });
    state = transitionDemo(state, { type: 'review/open-manual-rate' });
    expect(state.review).toMatchObject({
      eligibleTrigger: null,
      prompt: 'presented',
      promptOrigin: 'manual',
      automaticShowCount: 2,
      automaticSuppressedPermanently: true,
    });

    state = transitionDemo(state, { type: 'review/dismiss' });
    expect(state.review).toMatchObject({
      prompt: 'dismissed',
      promptOrigin: null,
      automaticShowCount: 2,
      automaticSuppressedPermanently: true,
    });
    state = transitionDemo(state, { type: 'review/record-streak', trigger: 'thirtyDays' });
    expect(state.review.eligibleTrigger).toBeNull();

    state = transitionDemo(state, { type: 'review/open-manual-rate' });
    state = transitionDemo(state, { type: 'review/rate' });
    expect(state.review).toMatchObject({
      prompt: 'rated',
      promptOrigin: null,
      automaticShowCount: 2,
      automaticSuppressedPermanently: true,
    });
  });
});
