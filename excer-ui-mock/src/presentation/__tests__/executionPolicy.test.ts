import {
  createDemoState,
  getBuilderScreen,
  getHomeModel,
  transitionDemo,
  type DemoCondition,
  type DemoState,
  type WeeklyConditionRewardOverride,
} from '../index';

function withClock(state: DemoState, minuteOfDay: number, dayKey = state.clock.dayKey) {
  return { ...state, clock: { dayKey, minuteOfDay } };
}

function withFridayOverride(
  state: DemoState,
  conditionId: string,
  override: WeeklyConditionRewardOverride,
) {
  return {
    ...state,
    rules: {
      ...state.rules,
      weekly: {
        ...state.rules.weekly,
        dayModes: { ...state.rules.weekly.dayModes, friday: 'custom' as const },
        customValues: {
          ...state.rules.weekly.customValues,
          friday: {
            ...state.rules.weekly.customValues.friday,
            window: 'All day',
            rewardOverrides: { [conditionId]: override },
          },
        },
      },
    },
  };
}

function eventPair(): DemoState {
  const state = createDemoState({ stage: 'home', showcase: true });
  const template = state.conditions.find((condition) => condition.kind === 'event');
  if (!template) throw new Error('Missing Event showcase condition');
  const second: DemoCondition = {
    ...template,
    id: 'second-event',
    name: 'Second event',
    repeatable: false,
    completionCountToday: 0,
    todayStatus: 'ready',
  };
  return {
    ...state,
    conditions: [{ ...template }, second],
    review: { ...state.review, unlockCount: 4 },
  };
}

describe('execution policy acceptance invariants', () => {
  it('starts non-Anytime active windows blank and gates Next until every selected edge is chosen', () => {
    let state = transitionDemo(createDemoState({ stage: 'home' }), { type: 'builder/start' });
    state = transitionDemo(state, { type: 'builder/select-catalog', catalogId: 'walk-state' });
    state = transitionDemo(state, { type: 'builder/set-state-grace', seconds: 120 });
    state = transitionDemo(state, { type: 'builder/set-active-window', value: 'start-end' });

    expect(state.builder).toMatchObject({
      activeWindow: 'start-end',
      activeWindowStartMinutes: null,
      activeWindowEndMinutes: null,
    });
    expect(getBuilderScreen(state).canContinue).toBe(false);

    state = transitionDemo(state, {
      type: 'builder/set-active-window-time',
      edge: 'start',
      minutes: 420,
    });
    expect(getBuilderScreen(state).canContinue).toBe(false);
    state = transitionDemo(state, {
      type: 'builder/set-active-window-time',
      edge: 'end',
      minutes: 1320,
    });
    expect(getBuilderScreen(state).canContinue).toBe(true);
  });

  it('enforces each condition active window before Event, Walk, Gym, or direct activity credit', () => {
    const initial = withClock(createDemoState({ stage: 'home', showcase: true }), 23 * 60);

    expect(transitionDemo(initial, {
      type: 'condition/complete-event',
      conditionId: 'demo-gym',
    })).toBe(initial);
    expect(transitionDemo(initial, {
      type: 'walk/start',
      conditionId: 'demo-walk',
    })).toBe(initial);
    expect(transitionDemo(initial, {
      type: 'gym/start',
      conditionId: 'demo-gym',
    })).toBe(initial);
    expect(transitionDemo(initial, {
      type: 'analysis/record-activity',
      conditionId: 'demo-walk',
      qualifyingMinutes: 10,
    })).toBe(initial);

    const insideWindow = withClock(initial, 19 * 60);
    expect(transitionDemo(insideWindow, {
      type: 'walk/start',
      conditionId: 'demo-walk',
    }).sessions.walk).toBe('verifying');
  });

  it('records condition/day identity, applies meaningful floors, and increments streak once per day', () => {
    let state = createDemoState({ stage: 'home', showcase: true });
    state = transitionDemo(state, {
      type: 'analysis/record-activity',
      conditionId: 'demo-steps',
      qualifyingMinutes: 14,
    });
    expect(state.analysis.activityCount).toBe(0);

    state = transitionDemo(state, {
      type: 'analysis/record-activity',
      conditionId: 'demo-steps',
      qualifyingMinutes: 15,
    });
    state = transitionDemo(state, {
      type: 'analysis/record-activity',
      conditionId: 'demo-gym',
      qualifyingMinutes: 1,
    });
    expect(state.analysis).toMatchObject({ activityCount: 2, currentStreakDays: 1 });
    expect(state.analysis.activityLedger).toEqual([
      { conditionId: 'demo-steps', dayKey: '2026-08-07', qualifyingMinutes: 15 },
      { conditionId: 'demo-gym', dayKey: '2026-08-07', qualifyingMinutes: 1 },
    ]);

    const duplicate = transitionDemo(state, {
      type: 'analysis/record-activity',
      conditionId: 'demo-gym',
      qualifyingMinutes: 1,
    });
    expect(duplicate).toBe(state);

    state = transitionDemo(state, {
      type: 'analysis/record-activity',
      conditionId: 'demo-walk',
      dayKey: '2026-08-08',
      qualifyingMinutes: 10,
    });
    expect(state.analysis).toMatchObject({ activityCount: 3, currentStreakDays: 2 });

    state = transitionDemo(state, {
      type: 'analysis/record-activity',
      conditionId: 'demo-walk',
      dayKey: '2026-08-10',
      qualifyingMinutes: 10,
    });
    expect(state.analysis).toMatchObject({ activityCount: 4, currentStreakDays: 3 });
  });

  it('counts one aggregate unlock and exposes the fifth prompt only after settlement', () => {
    let state = eventPair();
    state = transitionDemo(state, { type: 'condition/complete-event', conditionId: 'demo-gym' });
    state = transitionDemo(state, { type: 'condition/complete-event', conditionId: 'second-event' });

    expect(state.review).toMatchObject({ unlockCount: 4, eligibleTrigger: null });
    expect(state.home.earnTransition?.conditionIds).toEqual(['demo-gym', 'second-event']);

    state = transitionDemo(state, { type: 'home/settle-earn' });
    expect(state.review).toMatchObject({
      unlockCount: 5,
      eligibleTrigger: 'fifthUnlock',
      prompt: 'presented',
      promptOrigin: 'automatic',
    });
  });

  it.each([
    [{ kind: 'off' }, null],
    [{ kind: 'fixed', minutes: 45 }, { pendingMinutes: 45, targetMode: 'unlocked' }],
    [{ kind: 'rest-of-day' }, { pendingMinutes: 0, targetMode: 'rest-of-day' }],
    [{ kind: 'set-period', minutes: 75 }, { pendingMinutes: 0, targetMode: 'set-period' }],
  ] as const)('executes the current Custom-day reward override %j', (override, expected) => {
    const initial = createDemoState({ stage: 'home', showcase: true });
    const state = withFridayOverride(initial, 'demo-gym', override);
    const completed = transitionDemo(state, {
      type: 'condition/complete-event',
      conditionId: 'demo-gym',
    });

    if (!expected) {
      expect(completed).toBe(state);
      return;
    }
    expect(completed.home.earnTransition).toMatchObject(expected);
  });

  it('makes Off this weekday non-executable for Event, State, and Rate conditions', () => {
    const initial = createDemoState({ stage: 'home', showcase: true });
    const eventOff = withFridayOverride(initial, 'demo-gym', { kind: 'off' });
    expect(transitionDemo(eventOff, {
      type: 'condition/complete-event',
      conditionId: 'demo-gym',
    })).toBe(eventOff);
    expect(transitionDemo(eventOff, {
      type: 'gym/start',
      conditionId: 'demo-gym',
    })).toBe(eventOff);
    const verifyingEventOff = {
      ...eventOff,
      sessions: {
        ...eventOff.sessions,
        gym: 'verifying' as const,
        gymConditionId: 'demo-gym',
      },
    };
    expect(transitionDemo(verifyingEventOff, { type: 'gym/verified' })).toBe(verifyingEventOff);

    const stateOff = withFridayOverride(initial, 'demo-walk', { kind: 'off' });
    expect(transitionDemo(stateOff, {
      type: 'walk/start',
      conditionId: 'demo-walk',
    })).toBe(stateOff);

    const rateOff = withFridayOverride(initial, 'demo-steps', { kind: 'off' });
    expect(transitionDemo(rateOff, {
      type: 'analysis/record-activity',
      conditionId: 'demo-steps',
      qualifyingMinutes: 15,
    })).toBe(rateOff);
  });

  it('credits the current Custom-day fixed Rate reward and preserves the usual Rate reward', () => {
    const initial = createDemoState({ stage: 'home', showcase: true });
    const fixed = withFridayOverride(initial, 'demo-steps', { kind: 'fixed', minutes: 7 });
    const fixedCredited = transitionDemo(fixed, {
      type: 'analysis/record-activity',
      conditionId: 'demo-steps',
      qualifyingMinutes: 15,
    });
    expect(fixedCredited.home).toMatchObject({
      earnedMinutesToday: initial.home.earnedMinutesToday + 7,
      remainingMinutes: 52,
      mode: 'unlocked',
    });

    const usualCredited = transitionDemo(initial, {
      type: 'analysis/record-activity',
      conditionId: 'demo-steps',
      qualifyingMinutes: 15,
    });
    expect(usualCredited.home).toMatchObject({
      earnedMinutesToday: initial.home.earnedMinutesToday + 20,
      remainingMinutes: 20,
      mode: 'unlocked',
    });
  });

  it('turns saved weekly Rest/today override/outside-window rules into natural Home states', () => {
    const initial = createDemoState({ stage: 'home', showcase: true });
    const fridayRest = {
      ...initial.rules.weekly,
      dayModes: { ...initial.rules.weekly.dayModes, friday: 'rest' as const },
    };
    let state = transitionDemo(initial, { type: 'rules/set-weekly', weekly: fridayRest });
    expect(getHomeModel(state).mode).toBe('rest-day-no-locking');
    expect(state.home.accessHoliday).toMatchObject({
      kind: 'restDayNoLocking',
      sourceName: 'Friday Rest day rule',
    });

    const activeOutsideWindow = {
      ...fridayRest,
      dayModes: { ...fridayRest.dayModes, friday: 'active' as const },
      lockWindowEnabled: true,
      lockWindowFrom: '8:00 PM',
      lockWindowTo: '7:00 AM',
    };
    state = transitionDemo(state, { type: 'rules/set-weekly', weekly: activeOutsideWindow });
    expect(getHomeModel(state).mode).toBe('outside-window');
    expect(state.home.accessHoliday?.expiresAt).toBe('8:00 PM');

    state = transitionDemo(state, {
      type: 'debug/set-clock',
      dayKey: '2026-08-07',
      minuteOfDay: 21 * 60,
    });
    expect(getHomeModel(state).mode).toBe('locked');

    state = transitionDemo(state, {
      type: 'rules/use-rest-day-today',
      reason: 'Recovery day',
    });
    expect(getHomeModel(state).mode).toBe('rest-day-no-locking');
    expect(state.home.accessHoliday?.sourceName).toContain('Recovery day');
  });

  it.each([
    ['0 min · Full Lock', 0, 'locked'],
    ['5 min', 0, 'locked'],
    ['90 min', 45, 'unlocked'],
    ['4 h', 195, 'unlocked'],
    ['Unlimited', 0, 'unlimited'],
  ] as const)('applies the current Custom-day allowance %s to the Home economy', (allowance, remainingMinutes, mode) => {
    const initial = createDemoState({ stage: 'home', showcase: true });
    const weekly = {
      ...initial.rules.weekly,
      dayModes: { ...initial.rules.weekly.dayModes, friday: 'custom' as const },
      customValues: {
        ...initial.rules.weekly.customValues,
        friday: {
          ...initial.rules.weekly.customValues.friday,
          allowance,
          window: 'All day',
        },
      },
    };

    const state = transitionDemo(initial, { type: 'rules/set-weekly', weekly });
    expect(state.home.remainingMinutes).toBe(remainingMinutes);
    expect(getHomeModel(state).mode).toBe(mode);
  });

  it('treats a Custom-day All day window as authoritative over the global lock window', () => {
    const initial = createDemoState({ stage: 'home', showcase: true });
    const weekly = {
      ...initial.rules.weekly,
      dayModes: { ...initial.rules.weekly.dayModes, friday: 'custom' as const },
      customValues: {
        ...initial.rules.weekly.customValues,
        friday: {
          ...initial.rules.weekly.customValues.friday,
          window: 'All day',
        },
      },
      lockWindowEnabled: true,
      lockWindowFrom: '8:00 PM',
      lockWindowTo: '7:00 AM',
    };

    const state = transitionDemo(initial, { type: 'rules/set-weekly', weekly });
    expect(getHomeModel(state).mode).not.toBe('outside-window');
    expect(state.home.accessHoliday).toBeNull();
    expect(transitionDemo(state, {
      type: 'condition/complete-event',
      conditionId: 'demo-gym',
    }).home.earnTransition).not.toBeNull();
  });

  it('makes an Allowance only Rest day neutral for streaks and ineligible for earning', () => {
    const initial = createDemoState({ stage: 'home', showcase: true });
    const weekly = {
      ...initial.rules.weekly,
      dayModes: { ...initial.rules.weekly.dayModes, friday: 'rest' as const },
      restBehaviors: {
        ...initial.rules.weekly.restBehaviors,
        friday: 'allowance-only' as const,
      },
    };
    const state = transitionDemo(initial, { type: 'rules/set-weekly', weekly });

    expect(getHomeModel(state)).toMatchObject({
      mode: 'locked',
      balanceOnHold: false,
      status: 'Daily allowance used',
    });
    expect(state.home.accessHoliday).toBeNull();
    expect(transitionDemo(state, {
      type: 'condition/complete-event',
      conditionId: 'demo-gym',
    })).toBe(state);
    expect(transitionDemo(state, {
      type: 'walk/start',
      conditionId: 'demo-walk',
    })).toBe(state);
    expect(transitionDemo(state, {
      type: 'analysis/record-activity',
      conditionId: 'demo-steps',
      qualifyingMinutes: 15,
    })).toBe(state);
  });

  it('uses the hard-reset default and derives honest Time Locked copy from Analysis state', () => {
    let state = createDemoState({ stage: 'home' });
    expect(state.rules.missedDayPolicy).toBe('reset');
    expect(getHomeModel(state)).toMatchObject({
      mode: 'first-home-empty',
      timeLockedLabel: '0 min',
    });

    state = transitionDemo(state, { type: 'debug/set-analysis', history: 'populated' });
    expect(getHomeModel(state).timeLockedLabel).toBe('2h 14m');
  });
});
