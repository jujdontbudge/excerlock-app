import { fireEvent, render } from '@testing-library/react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import LockMomentRoute from '@/app/lock-moment/[kind]';
import { createDemoState, type DemoState } from '@/presentation';

const mockBack = jest.fn();
const mockDispatch = jest.fn();
let mockKind = 'time-out';
const mockReplace = jest.fn();
let mockState: DemoState;

jest.mock('expo-router', () => ({
  useLocalSearchParams: () => ({ kind: mockKind }),
  useRouter: () => ({ back: mockBack, replace: mockReplace }),
}));

jest.mock('@/presentation', () => {
  const actual = jest.requireActual('@/presentation');
  return {
    ...actual,
    useDemo: () => ({ dispatch: mockDispatch, state: mockState }),
  };
});

const safeAreaMetrics = {
  frame: { height: 844, width: 390, x: 0, y: 0 },
  insets: { bottom: 34, left: 0, right: 0, top: 47 },
};

const renderRoute = () => render(
  <SafeAreaProvider initialMetrics={safeAreaMetrics}>
    <LockMomentRoute />
  </SafeAreaProvider>,
);

describe('LockMomentRoute', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockKind = 'time-out';
    mockState = createDemoState({ stage: 'home', showcase: true });
  });

  it('opens the exact cheapest enabled Walk condition from time-out', async () => {
    const view = await renderRoute();

    expect(view.getByText('While walking is your quickest enabled way forward in this sample setup.')).toBeTruthy();
    await fireEvent.press(view.getByRole('button', { name: 'Start walking' }));

    expect(mockReplace).toHaveBeenCalledWith('/walk-session?conditionId=demo-walk');
  });

  it('opens the exact cheapest enabled Gym condition when Walk is unavailable', async () => {
    mockState = {
      ...mockState,
      conditions: mockState.conditions.map((condition) => condition.id === 'demo-walk'
        ? { ...condition, enabled: false }
        : condition),
    };
    const view = await renderRoute();

    expect(view.getByText('Go to gym is your quickest enabled way forward in this sample setup.')).toBeTruthy();
    await fireEvent.press(view.getByRole('button', { name: 'Check in' }));

    expect(mockReplace).toHaveBeenCalledWith('/gym-check-in?conditionId=demo-gym');
  });

  it('skips a State condition that is Off on the current Custom weekday', async () => {
    mockState = {
      ...mockState,
      rules: {
        ...mockState.rules,
        weekly: {
          ...mockState.rules.weekly,
          dayModes: { ...mockState.rules.weekly.dayModes, friday: 'custom' },
          customValues: {
            ...mockState.rules.weekly.customValues,
            friday: {
              ...mockState.rules.weekly.customValues.friday,
              rewardOverrides: { 'demo-walk': { kind: 'off' } },
              window: 'All day',
            },
          },
        },
      },
    };
    const view = await renderRoute();

    expect(view.getByText('Go to gym is your quickest enabled way forward in this sample setup.')).toBeTruthy();
    await fireEvent.press(view.getByRole('button', { name: 'Check in' }));
    expect(mockReplace).toHaveBeenCalledWith('/gym-check-in?conditionId=demo-gym');
  });

  it('skips active-window-ineligible State and Event conditions for an Anytime Rate fallback', async () => {
    mockState = {
      ...mockState,
      clock: { ...mockState.clock, minuteOfDay: 23 * 60 },
    };
    const view = await renderRoute();

    await fireEvent.press(view.getByRole('button', { name: 'View Steps exchange' }));
    expect(mockReplace).toHaveBeenCalledWith('/(tabs)/home?conditionId=demo-steps');
  });

  it('opens the exact Home condition detail when the cheapest path is not Walk or Gym', async () => {
    mockState = {
      ...mockState,
      conditions: mockState.conditions.map((condition) => {
        if (condition.id === 'demo-walk') return { ...condition, enabled: false };
        if (condition.id === 'demo-gym') return { ...condition, todayStatus: 'completed' as const };
        return condition;
      }),
    };
    const view = await renderRoute();

    await fireEvent.press(view.getByRole('button', { name: 'View Steps exchange' }));

    expect(mockReplace).toHaveBeenCalledWith('/(tabs)/home?conditionId=demo-steps');
  });

  it('sends See all ways to earn to the selected Home condition instead of the builder', async () => {
    const view = await renderRoute();

    await fireEvent.press(view.getByRole('button', { name: 'See all ways to earn' }));

    expect(mockReplace).toHaveBeenCalledWith('/(tabs)/home?conditionId=demo-walk');
  });

  it.each(['balance-empty', 'full-lock'])(
    'hands the %s shield primary action to the matching time-out screen',
    async (kind) => {
      mockKind = kind;
      const view = await renderRoute();

      await fireEvent.press(view.getByRole('button', { name: 'Open ExcerLock' }));

      expect(mockReplace).toHaveBeenCalledWith('/lock-moment/time-out');
    },
  );

  it('shows only a truthful Home recovery when there are no enabled conditions', async () => {
    mockState = createDemoState({ stage: 'home' });
    const view = await renderRoute();

    expect(view.getByText('No enabled ways to earn are set up right now.')).toBeTruthy();
    expect(view.getByText('Head home to add or enable one when you’re ready.')).toBeTruthy();
    expect(view.queryByText(/20-minute walk/i)).toBeNull();
    expect(view.queryByRole('button', { name: 'Start walking' })).toBeNull();
    expect(view.queryByRole('button', { name: 'See all ways to earn' })).toBeNull();

    await fireEvent.press(view.getByRole('button', { name: 'Review Home' }));
    expect(mockReplace).toHaveBeenCalledWith('/(tabs)/home');
  });

  it('shows the truthful Home fallback when the weekly policy makes every condition ineligible', async () => {
    mockState = {
      ...mockState,
      rules: {
        ...mockState.rules,
        weekly: {
          ...mockState.rules.weekly,
          lockWindowEnabled: true,
          lockWindowFrom: '8:00 PM',
          lockWindowTo: '7:00 AM',
        },
      },
    };
    const view = await renderRoute();

    expect(view.getByText('No ways to earn are available under the current rules right now.')).toBeTruthy();
    expect(view.getByText('Review Home to see today’s rules and when each condition becomes available.')).toBeTruthy();
    expect(view.queryByRole('button', { name: 'Start walking' })).toBeNull();
    expect(view.queryByRole('button', { name: 'See all ways to earn' })).toBeNull();
    await fireEvent.press(view.getByRole('button', { name: 'Review Home' }));
    expect(mockReplace).toHaveBeenCalledWith('/(tabs)/home');
  });

  it.each(['balance-empty', 'full-lock'])(
    'does not advertise a nonexistent Walk offer on the zero-condition %s shield',
    async (kind) => {
      mockKind = kind;
      mockState = createDemoState({ stage: 'home' });
      const view = await renderRoute();

      expect(view.getByText('No enabled ways to earn are set up right now.')).toBeTruthy();
      expect(view.queryByText(/20-minute walk/i)).toBeNull();
    },
  );
});
