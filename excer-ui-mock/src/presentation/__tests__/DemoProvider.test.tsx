import { act, render } from '@testing-library/react-native';
import { Text } from 'react-native';

import { DemoProvider, useDemo } from '../DemoProvider';
import { createDemoState } from '../fixtures';

function SuppressionClock() {
  const { state } = useDemo();
  return <Text>{state.review.shieldSuppressionRemainingMinutes} minutes remaining</Text>;
}

function ConditionClock() {
  const { state } = useDemo();
  const condition = state.conditions[0];
  return <Text>{condition.cooldownRemainingMinutes} minutes · {condition.todayStatus}</Text>;
}

describe('DemoProvider review clock', () => {
  beforeEach(() => jest.useFakeTimers());
  afterEach(() => jest.useRealTimers());

  it('advances a shield-suppressed automatic prompt without debug interaction', async () => {
    const initial = createDemoState({ stage: 'home' });
    initial.review = {
      ...initial.review,
      eligibleTrigger: 'sevenDays',
      prompt: 'suppressedAfterShield',
      shieldSuppressionActive: true,
      shieldSuppressionRemainingMinutes: 30,
    };

    const view = await render(
      <DemoProvider initialState={initial}>
        <SuppressionClock />
      </DemoProvider>,
    );

    expect(view.getByText('30 minutes remaining')).toBeTruthy();
    await act(async () => {
      jest.advanceTimersByTime(60_000);
    });
    expect(view.getByText('29 minutes remaining')).toBeTruthy();
  });

  it('advances an executable repeatable event cooldown without debug interaction', async () => {
    const initial = createDemoState({ stage: 'home', showcase: true });
    initial.conditions[0] = {
      ...initial.conditions[0],
      cooldownRemainingMinutes: 2,
      repeatable: true,
      todayStatus: 'completed',
    };

    const view = await render(
      <DemoProvider initialState={initial}>
        <ConditionClock />
      </DemoProvider>,
    );

    expect(view.getByText('2 minutes · completed')).toBeTruthy();
    await act(async () => {
      jest.advanceTimersByTime(60_000);
    });
    expect(view.getByText('1 minutes · completed')).toBeTruthy();
    await act(async () => {
      jest.advanceTimersByTime(60_000);
    });
    expect(view.getByText('0 minutes · ready')).toBeTruthy();
  });
});
