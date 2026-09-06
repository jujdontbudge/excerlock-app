import { fireEvent, render } from '@testing-library/react-native';

jest.mock('react-native-reanimated', () => ({
  __esModule: true,
  cubicBezier: () => 'ease-out',
  default: { View: require('react-native').View },
  useReducedMotion: () => false,
}));

import { ConditionCard } from '../ConditionCard';

describe('ConditionCard', () => {
  it('renders an eligible event and emits only its explicit Complete action', async () => {
    const onAction = jest.fn();

    const card = await render(
      <ConditionCard
        variant="event"
        title="Finish a workout"
        banner={{ uri: 'https://example.invalid/workout.png' }}
        status="eligible"
        onAction={onAction}
      />,
    );

    expect(card.getByText('Finish a workout')).toBeTruthy();
    fireEvent.press(card.getByRole('button', { name: 'Complete Finish a workout' }));
    expect(onAction).toHaveBeenCalledTimes(1);
  });

  it('renders the active walking state as a live, non-actionable status', async () => {
    const card = await render(
      <ConditionCard
        variant="state"
        title="Walking"
        banner={{ uri: 'https://example.invalid/walking.png' }}
        status="active"
      />,
    );

    expect(card.getByText('ACTIVE')).toBeTruthy();
    expect(card.queryByText('Apps unlocked while you keep moving')).toBeNull();
    expect(card.getByText('Balance drains normally')).toBeTruthy();
    expect(card.queryByRole('button', { name: /Complete Walking/ })).toBeNull();
  });

  it('renders a rate meter with its numeric relationship and no claim or cap action', async () => {
    const card = await render(
      <ConditionCard
        variant="rate"
        title="Today’s steps → screen time"
        banner={{ uri: 'https://example.invalid/steps.png' }}
        sourceValue="6,240 steps today"
        earnedValue="2h 05m earned"
        ratioLabel="500 steps = 10 min"
        progress={0.62}
      />,
    );

    expect(card.getByText('6,240 steps today')).toBeTruthy();
    expect(card.getByText('2h 05m earned')).toBeTruthy();
    expect(card.getByText('500 steps = 10 min')).toBeTruthy();
    expect(card.getByRole('progressbar', { name: 'Today’s steps → screen time progress' })).toBeTruthy();
    expect(card.queryByText(/cap/i)).toBeNull();
    expect(card.queryByRole('button')).toBeNull();
  });
});
