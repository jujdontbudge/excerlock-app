import type { ReactElement } from 'react';
import { act, fireEvent, render } from '@testing-library/react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import {
  GymSessionScreen,
  type GymSessionScreenProps,
  WalkSessionScreen,
  type WalkSessionScreenProps,
} from '../SessionScreens';

const safeAreaMetrics = {
  frame: { height: 844, width: 390, x: 0, y: 0 },
  insets: { bottom: 34, left: 0, right: 0, top: 47 },
};

const renderScreen = (screen: ReactElement) => render(
  <SafeAreaProvider initialMetrics={safeAreaMetrics}>{screen}</SafeAreaProvider>,
);

function createWalkProps(overrides: Partial<WalkSessionScreenProps> = {}): WalkSessionScreenProps {
  return {
    alwaysShow: true,
    conditionSummary: {
      ruleSummary: 'Apps stay open while moving · balance drains normally',
      title: 'While walking',
    },
    graceDurationSeconds: 42,
    onBack: jest.fn(),
    onCancel: jest.fn(),
    onEnd: jest.fn(),
    onGraceExpired: jest.fn(),
    onOpenPermission: jest.fn(),
    onPause: jest.fn(),
    onResume: jest.fn(),
    onStart: jest.fn(),
    onToggleAlwaysShow: jest.fn(),
    onWhyLocked: jest.fn(),
    phase: 'ready',
    ...overrides,
  };
}

function createGymProps(overrides: Partial<GymSessionScreenProps> = {}): GymSessionScreenProps {
  return {
    condition: {
      kind: 'event',
      name: 'Lift at Northside',
      ruleSummary: 'Northside Community Gym · add 25 min · once daily',
    },
    gym: {
      banner: require('../../../../assets/banners/gym-squat-rack.png'),
      name: 'Northside Community Gym',
      radiusMeters: 125,
    },
    onBack: jest.fn(),
    onCancel: jest.fn(),
    onDone: jest.fn(),
    onOpenPermission: jest.fn(),
    onRetry: jest.fn(),
    onStart: jest.fn(),
    onViewCondition: jest.fn(),
    phase: 'ready',
    ...overrides,
  };
}

describe('WalkSessionScreen callbacks and local clocks', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.clearAllTimers();
    jest.useRealTimers();
  });

  it('updates live metrics and confirms pause before emitting it', async () => {
    const onPause = jest.fn();
    const view = await renderScreen(
      <WalkSessionScreen {...createWalkProps({ onPause, phase: 'active' })} />,
    );

    expect(view.getByText('ACTIVE')).toBeTruthy();
    expect(view.getByText('While walking')).toBeTruthy();
    expect(view.getByText('Apps stay open while moving · balance drains normally')).toBeTruthy();
    expect(view.getByText('2,146 sample steps · 7:00 left')).toBeTruthy();

    await act(() => jest.advanceTimersByTime(2000));

    expect(view.getByText('2,147 sample steps · 6:58 left')).toBeTruthy();
    await fireEvent.press(view.getByRole('button', { name: 'Pause' }));

    expect(onPause).not.toHaveBeenCalled();
    expect(view.getByRole('header', { name: 'Pause walking?' })).toBeTruthy();
    await fireEvent.press(view.getByRole('button', { name: 'Confirm pause' }));
    expect(onPause).toHaveBeenCalledTimes(1);
  });

  it('routes each ready permission row to its exact permission detail', async () => {
    const onOpenPermission = jest.fn();
    const view = await renderScreen(
      <WalkSessionScreen {...createWalkProps({ onOpenPermission, phase: 'ready' })} />,
    );

    await fireEvent.press(view.getByRole('button', { name: 'Motion & Fitness, Allowed in demo' }));
    await fireEvent.press(view.getByRole('button', { name: 'Location, Allowed in demo' }));

    expect(onOpenPermission.mock.calls).toEqual([['motion'], ['location']]);
  });

  it('keeps the specified secondary Cancel action visible on the ready screen', async () => {
    const onCancel = jest.fn();
    const view = await renderScreen(
      <WalkSessionScreen {...createWalkProps({ onCancel, phase: 'ready' })} />,
    );

    await fireEvent.press(view.getByRole('button', { name: 'Cancel' }));
    expect(onCancel).toHaveBeenCalledTimes(1);
  });

  it('confirms an active user-ended session before emitting it', async () => {
    const onEnd = jest.fn();
    const view = await renderScreen(
      <WalkSessionScreen {...createWalkProps({ onEnd, phase: 'active' })} />,
    );

    await fireEvent.press(view.getByRole('button', { name: 'End session' }));

    expect(onEnd).not.toHaveBeenCalled();
    expect(view.getByRole('header', { name: 'End this walking session?' })).toBeTruthy();
    await fireEvent.press(view.getByRole('button', { name: 'Confirm end session' }));
    expect(onEnd).toHaveBeenCalledWith('user');
  });

  it('uses the configured grace duration, expires once, and exposes resume/end actions', async () => {
    const onEnd = jest.fn();
    const onGraceExpired = jest.fn();
    const onResume = jest.fn();
    const view = await renderScreen(
      <WalkSessionScreen
        {...createWalkProps({ graceDurationSeconds: 120, onEnd, onGraceExpired, onResume, phase: 'grace' })}
      />,
    );

    expect(view.getByLabelText('120 seconds grace remaining')).toBeTruthy();
    expect(view.getByText('2:00')).toBeTruthy();
    await fireEvent.press(view.getByRole('button', { name: 'Resume walking' }));
    expect(onResume).toHaveBeenCalledTimes(1);

    await act(() => jest.advanceTimersByTime(120_000));

    expect(onGraceExpired).toHaveBeenCalledTimes(1);
    expect(view.getByLabelText('0 seconds grace remaining')).toBeTruthy();
    await fireEvent.press(view.getByRole('button', { name: 'End session' }));
    expect(onEnd).not.toHaveBeenCalled();
    await fireEvent.press(view.getByRole('button', { name: 'Confirm end session' }));
    expect(onEnd).toHaveBeenCalledWith('stopped');
  });

  it('keeps paused distinct from grace and resumes without expiring a countdown', async () => {
    const onGraceExpired = jest.fn();
    const onResume = jest.fn();
    const view = await renderScreen(
      <WalkSessionScreen
        {...createWalkProps({ graceDurationSeconds: 120, onGraceExpired, onResume, phase: 'paused' })}
      />,
    );

    expect(view.getByText('Walking paused.')).toBeTruthy();
    expect(view.getByLabelText('Walking paused, ready to resume')).toBeTruthy();
    expect(view.queryByLabelText(/seconds grace remaining/)).toBeNull();
    await act(() => jest.advanceTimersByTime(120_000));
    expect(onGraceExpired).not.toHaveBeenCalled();

    await fireEvent.press(view.getByRole('button', { name: 'Resume walking' }));
    expect(onResume).toHaveBeenCalledTimes(1);
  });

  it.each([
    ['ended-by-user', 'Start again'],
    ['ended-stopped', 'Keep walking'],
  ] as const)('restarts the %s state through %s', async (phase, label) => {
    const onStart = jest.fn();
    const view = await renderScreen(
      <WalkSessionScreen {...createWalkProps({ onStart, phase })} />,
    );

    await fireEvent.press(view.getByRole('button', { name: label }));
    expect(onStart).toHaveBeenCalledTimes(1);
  });

  it('opens permission repair and retries from permission-lost state', async () => {
    const onOpenPermission = jest.fn();
    const onStart = jest.fn();
    const view = await renderScreen(
      <WalkSessionScreen
        {...createWalkProps({ onOpenPermission, onStart, phase: 'permission-lost' })}
      />,
    );

    await fireEvent.press(view.getByRole('button', { name: 'Instructions' }));
    await fireEvent.press(view.getByRole('button', { name: 'Try again' }));
    expect(onOpenPermission).toHaveBeenCalledTimes(1);
    expect(onStart).toHaveBeenCalledTimes(1);
  });

  it.each(['ready', 'verifying', 'active', 'paused', 'grace', 'ended-by-user', 'ended-stopped', 'permission-lost'] as const)(
    'keeps the selected condition visible in the %s phase',
    async (phase) => {
      const view = await renderScreen(<WalkSessionScreen {...createWalkProps({ phase })} />);
      expect(view.getByText('While walking')).toBeTruthy();
      expect(view.getByText('Apps stay open while moving · balance drains normally')).toBeTruthy();
    },
  );

  it('opens the active condition row into its exact summary sheet', async () => {
    const view = await renderScreen(<WalkSessionScreen {...createWalkProps({ phase: 'active' })} />);

    await fireEvent.press(view.getByRole('button', { name: 'Open While walking condition summary' }));
    expect(view.getByRole('header', { name: 'While walking' })).toBeTruthy();
    expect(view.getByText('Access stays open while the fake walking session remains active. The sample balance drains normally.')).toBeTruthy();
  });

  it('opens ended details and stages the why flow before leaving the screen', async () => {
    const onWhyLocked = jest.fn();
    const view = await renderScreen(
      <WalkSessionScreen
        {...createWalkProps({ onWhyLocked, phase: 'ended-stopped' })}
      />,
    );

    await fireEvent.press(view.getByRole('button', { name: 'Session details' }));
    expect(view.getByRole('header', { name: 'Walk details' })).toBeTruthy();
    expect(view.getByText('24:18 moving')).toBeTruthy();
    expect(view.getByText('2,804 sample steps')).toBeTruthy();
    expect(view.getByText('24 min access kept open')).toBeTruthy();
    await fireEvent.press(view.getByRole('button', { name: 'Close walk details' }));

    await fireEvent.press(view.getByRole('button', { name: 'Why did apps lock?' }));
    expect(onWhyLocked).not.toHaveBeenCalled();
    expect(view.getByRole('header', { name: 'Why did apps lock?' })).toBeTruthy();
    await fireEvent.press(view.getByRole('button', { name: 'View lock moment' }));
    expect(onWhyLocked).toHaveBeenCalledTimes(1);
  });
});

describe('GymSessionScreen repair and condition actions', () => {
  it('keeps the specified secondary Cancel action visible on the ready screen', async () => {
    const onCancel = jest.fn();
    const view = await renderScreen(<GymSessionScreen {...createGymProps({ onCancel, phase: 'ready' })} />);

    await fireEvent.press(view.getByRole('button', { name: 'Cancel' }));
    expect(onCancel).toHaveBeenCalledTimes(1);
  });

  it.each([
    ['ready', 'Sample ready'],
    ['verifying', 'Checking locally'],
    ['verified', 'Verified in demo'],
    ['failed', 'Needs attention'],
  ] as const)('reports truthful Location health in the %s phase', async (phase, value) => {
    const view = await renderScreen(<GymSessionScreen {...createGymProps({ phase })} />);
    expect(view.getByText(value)).toBeTruthy();
  });

  it('visibly carries the selected condition, gym, and radius through verification', async () => {
    const view = await renderScreen(
      <GymSessionScreen {...createGymProps({ phase: 'verifying' })} />,
    );

    expect(view.getByText('Lift at Northside')).toBeTruthy();
    expect(view.getByText('Northside Community Gym · add 25 min · once daily')).toBeTruthy();
    expect(view.getByText('Northside Community Gym · 125 m radius')).toBeTruthy();
    expect(view.getByLabelText('Checking Northside Community Gym within a 125 meter sample radius')).toBeTruthy();
  });

  it.each(['ready', 'verifying', 'verified', 'failed'] as const)(
    'keeps the exact gym and condition visible in the %s phase',
    async (phase) => {
      const view = await renderScreen(<GymSessionScreen {...createGymProps({ phase })} />);
      expect(view.getByText('Lift at Northside')).toBeTruthy();
      expect(view.getAllByText(/Northside Community Gym/).length).toBeGreaterThan(0);
    },
  );

  it('opens instructions and retries a failed verification', async () => {
    const onOpenPermission = jest.fn();
    const onRetry = jest.fn();
    const view = await renderScreen(
      <GymSessionScreen {...createGymProps({ onOpenPermission, onRetry, phase: 'failed' })} />,
    );

    await fireEvent.press(view.getByRole('button', { name: 'Instructions' }));
    await fireEvent.press(view.getByRole('button', { name: 'Try again' }));
    expect(onOpenPermission).toHaveBeenCalledTimes(1);
    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  it('opens the saved condition after a verified check-in', async () => {
    const onDone = jest.fn();
    const onViewCondition = jest.fn();
    const view = await renderScreen(
      <GymSessionScreen {...createGymProps({ onDone, onViewCondition, phase: 'verified' })} />,
    );

    expect(view.getByText('VERIFIED')).toBeTruthy();
    await fireEvent.press(view.getByRole('button', { name: 'View condition' }));
    await fireEvent.press(view.getByRole('button', { name: 'Done' }));
    expect(onViewCondition).toHaveBeenCalledTimes(1);
    expect(onDone).toHaveBeenCalledTimes(1);
  });
});
