import {
  createDemoState,
  getBuilderScreen,
  getEventExecutionSummary,
  transitionDemo,
  type DemoState,
} from '../index';

function saveRepeatableEvent(state: DemoState) {
  let next = transitionDemo(state, { type: 'builder/start' });
  next = transitionDemo(next, {
    type: 'builder/select-catalog',
    catalogId: 'active-minutes-event',
  });
  next = transitionDemo(next, { type: 'builder/continue' });
  next = transitionDemo(next, { type: 'builder/set-event-threshold', value: 30 });
  next = transitionDemo(next, { type: 'builder/continue' });
  next = transitionDemo(next, { type: 'builder/set-reward', reward: 'fixed', minutes: 10 });
  next = transitionDemo(next, { type: 'builder/set-daily-cap', value: 2 });
  next = transitionDemo(next, { type: 'builder/set-cooldown', minutes: 15 });
  next = transitionDemo(next, { type: 'builder/set-repeatable', value: true });
  next = transitionDemo(next, { type: 'builder/set-active-window', value: 'start-end' });
  next = transitionDemo(next, { type: 'builder/set-active-window-time', edge: 'start', minutes: 375 });
  next = transitionDemo(next, { type: 'builder/set-active-window-time', edge: 'end', minutes: 1305 });
  next = transitionDemo(next, { type: 'builder/continue' });
  next = transitionDemo(next, { type: 'builder/continue' });
  next = transitionDemo(next, { type: 'builder/continue' });
  next = transitionDemo(next, { type: 'builder/continue' });
  next = transitionDemo(next, { type: 'builder/continue' });
  next = transitionDemo(next, { type: 'builder/set-banner', bannerId: 'general-sunrise' });
  next = transitionDemo(next, { type: 'builder/continue' });
  return transitionDemo(next, { type: 'builder/save' });
}

describe('builder and paywall release semantics', () => {
  it('keeps an edited condition kind immutable by removing the catalog from its path', () => {
    let state = saveRepeatableEvent(createDemoState({ stage: 'home' }));
    const id = state.conditions[0].id;

    state = transitionDemo(state, { type: 'builder/start-edit', conditionId: id });
    expect(state.builder.path).toEqual([
      'configure-event',
      'reward',
      'daily-cap',
      'cooldown',
      'repeatable',
      'active-window',
      'banner',
      'preview',
    ]);
    expect(state.builder.step).toBe('configure-event');

    state = transitionDemo(state, { type: 'builder/back' });
    expect(state.builder.step).toBe('configure-event');
    expect(state.builder.kind).toBe('event');

    const immutable = transitionDemo(state, {
      type: 'builder/select-catalog',
      catalogId: 'walk-steps-rate',
    });
    expect(immutable).toBe(state);
  });

  it('prevents re-enabling an Event/Rate signal conflict through Manage or edit-save', () => {
    const seeded = createDemoState({ stage: 'home', showcase: true });
    const rate = {
      ...seeded.conditions.find((condition) => condition.id === 'demo-steps')!,
      enabled: false,
    };
    const event = {
      ...rate,
      bannerId: 'general-sunrise',
      catalogId: 'walk-steps-event',
      enabled: true,
      eventThreshold: 10_000,
      id: 'steps-event',
      kind: 'event' as const,
      name: 'Step goal',
      rateMinutes: null,
      reward: { kind: 'fixed' as const, minutes: 15 },
      todayStatus: 'ready' as const,
    };
    let state: DemoState = { ...seeded, conditions: [rate, event] };

    expect(transitionDemo(state, {
      type: 'condition/toggle',
      conditionId: rate.id,
      enabled: true,
    })).toBe(state);

    state = transitionDemo(state, { type: 'builder/start-edit', conditionId: rate.id });
    state = transitionDemo(state, { type: 'builder/set-enabled', enabled: true });
    state = transitionDemo(state, { type: 'builder/continue' });
    state = transitionDemo(state, { type: 'builder/continue' });
    state = transitionDemo(state, { type: 'builder/continue' });
    expect(state.builder.step).toBe('preview');
    expect(getBuilderScreen(state).canContinue).toBe(false);
    expect(transitionDemo(state, { type: 'builder/save' })).toBe(state);
  });

  it('persists four-mode active windows and their exact selectable clock values', () => {
    let state = transitionDemo(createDemoState({ stage: 'home' }), { type: 'builder/start' });
    state = transitionDemo(state, { type: 'builder/select-catalog', catalogId: 'walk-state' });
    state = transitionDemo(state, { type: 'builder/set-state-grace', seconds: 120 });
    state = transitionDemo(state, { type: 'builder/set-active-window', value: 'start-end' });
    state = transitionDemo(state, { type: 'builder/set-active-window-time', edge: 'start', minutes: 481 });
    state = transitionDemo(state, { type: 'builder/set-active-window-time', edge: 'end', minutes: 1259 });

    expect(state.builder).toMatchObject({
      activeWindow: 'start-end',
      activeWindowStartMinutes: 481,
      activeWindowEndMinutes: 1259,
    });
    expect(getBuilderScreen(state).canContinue).toBe(true);
  });

  it('keeps gym arrival thresholdless while allowing the builder to continue', () => {
    let state = transitionDemo(createDemoState({ stage: 'home' }), { type: 'builder/start' });
    state = transitionDemo(state, { type: 'builder/select-catalog', catalogId: 'gym-arrive' });
    state = transitionDemo(state, { type: 'builder/set-event-threshold', value: 1 });
    expect(state.builder.eventThreshold).toBeNull();
    expect(getBuilderScreen({
      ...state,
      builder: { ...state.builder, step: 'configure-event', gymId: 'sample-gym' },
      savedGyms: [{
        id: 'sample-gym',
        name: 'Sample Gym',
        radiusMeters: 100,
        detection: 'manual',
        placeType: 'honor',
        wifi: 'off',
        autoPermission: 'notAsked',
      }],
    }).canContinue).toBe(true);
  });

  it('enforces repeat, daily cap, and cooldown during deterministic demo execution', () => {
    let state = saveRepeatableEvent(createDemoState({ stage: 'home' }));
    const id = state.conditions[0].id;
    expect(state.conditions[0].ruleSummary).toBe(
      '30 active min · add 10 min · up to 2× daily · 15 min cooldown · 6:15 AM–9:45 PM',
    );

    state = transitionDemo(state, { type: 'condition/complete-event', conditionId: id });
    expect(state.conditions[0]).toMatchObject({
      completionCountToday: 1,
      cooldownRemainingMinutes: 15,
      todayStatus: 'crediting',
    });
    state = transitionDemo(state, { type: 'home/settle-earn' });
    state = transitionDemo(state, { type: 'condition/advance-clock', minutes: 14 });
    expect(state.conditions[0]).toMatchObject({
      cooldownRemainingMinutes: 1,
      todayStatus: 'completed',
    });

    state = transitionDemo(state, { type: 'condition/advance-clock', minutes: 1 });
    expect(state.conditions[0].todayStatus).toBe('ready');
    state = transitionDemo(state, { type: 'condition/complete-event', conditionId: id });
    state = transitionDemo(state, { type: 'home/settle-earn' });
    state = transitionDemo(state, { type: 'condition/advance-clock', minutes: 15 });
    expect(state.conditions[0]).toMatchObject({
      completionCountToday: 2,
      cooldownRemainingMinutes: 0,
      todayStatus: 'completed',
    });
    expect(state.home.remainingMinutes).toBe(20);

    const capped = transitionDemo(state, { type: 'condition/complete-event', conditionId: id });
    expect(capped).toBe(state);
  });

  it('marks cap and cooldown controls inactive when Repeatable is No', () => {
    const state = createDemoState({ stage: 'home' });
    expect(getEventExecutionSummary({
      ...state.builder,
      cooldownMinutes: 240,
      dailyCap: 4,
      repeatable: false,
    })).toBe(
      'once daily · 4 cap inactive while Repeatable is No · 4 h cooldown inactive while Repeatable is No',
    );
  });

  it('persists the purchased plan and derives the correct subscription fixture state', () => {
    const monthly = transitionDemo(createDemoState({ stage: 'paywall' }), {
      type: 'paywall/purchase-succeeded',
      plan: 'monthly',
    });
    expect(monthly).toMatchObject({
      selectedPlan: 'monthly',
      stage: 'signup',
      account: { status: 'postPurchase' },
      settings: { subscriptionOffer: 'standard', subscriptionStatus: 'active' },
    });

    const annual = transitionDemo(createDemoState({ stage: 'paywall' }), {
      type: 'paywall/purchase-succeeded',
      plan: 'annual',
    });
    expect(annual).toMatchObject({
      selectedPlan: 'annual',
      settings: { subscriptionOffer: 'standard', subscriptionStatus: 'trial' },
    });

    const winBack = transitionDemo(
      transitionDemo(annual, { type: 'paywall/select-plan', plan: 'annual' }),
      { type: 'settings/set-subscription-offer', offer: 'annual-winback' },
    );
    expect(winBack.settings.subscriptionOffer).toBe('annual-winback');
  });
});
