import {
  createDemoState,
  transitionDemo,
  type DemoCondition,
  type DemoState,
  type RewardKind,
} from '@/presentation';

function eventCondition(
  state: DemoState,
  overrides: Partial<DemoCondition> & Pick<DemoCondition, 'id' | 'name'>,
) {
  const template = state.conditions.find((condition) => condition.kind === 'event');
  if (!template) throw new Error('The showcase fixture must include an Event condition.');
  return {
    ...template,
    completionCountToday: 0,
    cooldownRemainingMinutes: 0,
    enabled: true,
    todayStatus: 'ready' as const,
    ...overrides,
  };
}

function homeWithEvents(...conditions: DemoCondition[]): DemoState {
  const state = createDemoState({ stage: 'home', showcase: true });
  return {
    ...state,
    conditions,
    home: {
      ...state.home,
      mode: 'locked' as const,
    },
  };
}

function complete(state: DemoState, conditionId: string) {
  return transitionDemo(state, { type: 'condition/complete-event', conditionId });
}

describe('Home Event reward settlement', () => {
  it('does not let a disabled Event condition earn through a direct transition', () => {
    const fixture = createDemoState({ stage: 'home', showcase: true });
    const disabled = eventCondition(fixture, {
      enabled: false,
      id: 'disabled-event',
      name: 'Disabled event',
      reward: { kind: 'fixed', minutes: 60 },
    });
    const state = homeWithEvents(disabled);

    expect(complete(state, disabled.id)).toBe(state);
    expect(state.home.earnTransition).toBeNull();
    expect(state.home.remainingMinutes).toBe(0);
  });

  it.each([
    ['fixed then holiday', ['fixed-event', 'holiday-event']],
    ['holiday then fixed', ['holiday-event', 'fixed-event']],
  ] as const)('preserves fixed minutes when settling a mixed %s batch', (_label, order) => {
    const fixture = createDemoState({ stage: 'home', showcase: true });
    const fixed = eventCondition(fixture, {
      id: 'fixed-event',
      name: 'Quick check-in',
      reward: { kind: 'fixed', minutes: 30 },
    });
    const holiday = eventCondition(fixture, {
      id: 'holiday-event',
      name: 'Sunset workout',
      reward: { kind: 'rest-of-day' },
    });
    let state = homeWithEvents(fixed, holiday);

    order.forEach((conditionId) => {
      state = complete(state, conditionId);
    });

    expect(state.home.earnTransition).toMatchObject({
      accessHoliday: {
        durationMinutes: null,
        expiresAt: 'Midnight',
        kind: 'restOfDay',
        sourceConditionId: holiday.id,
        sourceName: holiday.name,
      },
      balanceOnHold: true,
      pendingMinutes: 30,
      targetMode: 'rest-of-day',
    });

    state = transitionDemo(state, { type: 'home/settle-earn' });

    expect(state.home).toMatchObject({
      accessHoliday: {
        expiresAt: 'Midnight',
        sourceConditionId: holiday.id,
        sourceName: holiday.name,
      },
      balanceOnHold: true,
      earnTransition: null,
      mode: 'rest-of-day',
      remainingMinutes: 30,
    });
  });

  it('retains the exact source, duration, and expiry of a set-period reward', () => {
    const fixture = createDemoState({ stage: 'home', showcase: true });
    const reward: { kind: RewardKind; minutes: number } = { kind: 'set-period', minutes: 75 };
    const holiday = eventCondition(fixture, {
      id: 'timed-holiday',
      name: 'Cycling distance goal',
      reward,
    });
    let state = homeWithEvents(holiday);

    state = complete(state, holiday.id);
    expect(state.home.earnTransition?.accessHoliday).toEqual({
      durationMinutes: 75,
      expiresAt: '8:15 PM',
      kind: 'setPeriod',
      sourceConditionId: holiday.id,
      sourceName: holiday.name,
    });

    state = transitionDemo(state, { type: 'home/settle-earn' });
    expect(state.home.accessHoliday).toEqual({
      durationMinutes: 75,
      expiresAt: '8:15 PM',
      kind: 'setPeriod',
      sourceConditionId: holiday.id,
      sourceName: holiday.name,
    });
  });

  it.each(['rest-day-no-locking', 'outside-window'] as const)(
    'does not earn during the %s rule holiday',
    (mode) => {
      const fixture = createDemoState({ stage: 'home', showcase: true });
      const event = eventCondition(fixture, {
        id: 'rule-holiday-event',
        name: 'Rule holiday event',
        reward: { kind: 'fixed', minutes: 30 },
      });
      const initial = homeWithEvents(event);
      const state = { ...initial, home: { ...initial.home, mode } };

      expect(complete(state, event.id)).toBe(state);
    },
  );
});
