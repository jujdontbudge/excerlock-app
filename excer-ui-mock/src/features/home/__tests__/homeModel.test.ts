import { createDemoState } from '@/presentation';

import {
  activeWindowLabel,
  cheapestAvailableCondition,
  conditionDetailPresentation,
  homeHeaderPresentation,
  rateConditionPresentation,
  shouldPlayHomeUnlockHaptic,
} from '../homeModel';

describe('Home presentation helpers', () => {
  const conditions = createDemoState({ stage: 'home', showcase: true }).conditions;

  it('chooses only enabled, incomplete earning paths and keeps State first', () => {
    expect(cheapestAvailableCondition(conditions)?.id).toBe('demo-walk');
    expect(cheapestAvailableCondition(
      conditions.map((condition) => condition.id === 'demo-walk'
        ? { ...condition, enabled: false }
        : condition),
    )?.id).toBe('demo-gym');
    expect(cheapestAvailableCondition(
      conditions.map((condition) => condition.kind === 'event'
        ? { ...condition, todayStatus: 'completed' as const }
        : { ...condition, enabled: condition.kind === 'rate' }),
    )?.id).toBe('demo-steps');
  });

  it.each([
    ['locked', 'unlocked', true],
    ['locked', 'rest-of-day', true],
    ['first-home-empty', 'set-period', true],
    ['unlocked', 'unlocked', false],
    ['low', 'unlocked', false],
    ['rest-of-day', 'rest-of-day', false],
    ['locked', undefined, false],
  ] as const)('plays the haptic for %s → %s only when the lock opens', (mode, target, expected) => {
    expect(shouldPlayHomeUnlockHaptic(mode, target)).toBe(expected);
  });

  it('describes configured windows and neutral rule holidays explicitly', () => {
    expect(activeWindowLabel(conditions[0])).toBe('6:00 AM–10:00 PM');
    expect(activeWindowLabel(conditions[1])).toBe('7:00 AM–10:00 PM');
    expect(activeWindowLabel(conditions[2])).toBe('Anytime');

    expect(homeHeaderPresentation('outside-window', true)).toMatchObject({
      dayLabel: 'Friday · Outside lock window',
      goalCaption: 'Outside window · goal neutral',
      streakAccessibilityLabel: '12-day streak, neutral outside the lock window.',
    });
  });

  it('uses the edited condition rule, status, and active-window values instead of seed copy', () => {
    const edited = {
      ...conditions[0],
      activeWindow: 'start-only' as const,
      activeWindowStartMinutes: 555,
      activeWindowEndMinutes: null,
      ruleSummary: 'Edited arrival rule · add 45 min · from 9:15 AM',
      todayStatus: 'completed' as const,
    };

    expect(conditionDetailPresentation(edited, null, 'inactive', 'inactive')).toMatchObject({
      rule: edited.ruleSummary,
      status: 'completed',
      window: 'From 9:15 AM',
    });
  });

  it('keeps a metric Rate condition metric and derives its earned sample from its configured rate', () => {
    const metricRun = {
      ...conditions[2],
      catalogId: 'run-distance-rate',
      id: 'metric-run',
      name: 'Metric run',
      rateMinutes: 15,
      ruleSummary: '1 km = 15 min · continuous · Anytime',
    };

    expect(rateConditionPresentation(metricRun)).toEqual({
      earnedValue: '1h 23m earned',
      evidence: '5.5 km recorded · 1h 23m credited.',
      progress: 0.68,
      ratioLabel: metricRun.ruleSummary,
      sourceValue: '5.5 km recorded',
    });
  });
});
