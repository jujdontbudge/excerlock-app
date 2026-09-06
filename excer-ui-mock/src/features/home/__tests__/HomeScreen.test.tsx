import type { ReactElement } from 'react';
import { AccessibilityInfo } from 'react-native';
import { fireEvent, render, waitFor } from '@testing-library/react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { createDemoState } from '@/presentation';

import { HomeScreen, type HomeScreenProps } from '../HomeScreen';

const showcaseConditions = createDemoState({ stage: 'home', showcase: true }).conditions;
const safeAreaMetrics = {
  frame: { height: 844, width: 390, x: 0, y: 0 },
  insets: { bottom: 34, left: 0, right: 0, top: 47 },
};

const renderScreen = (screen: ReactElement) => render(
  <SafeAreaProvider initialMetrics={safeAreaMetrics}>{screen}</SafeAreaProvider>,
);

function createProps(overrides: Partial<HomeScreenProps> = {}): HomeScreenProps {
  const defaults: HomeScreenProps = {
    conditions: showcaseConditions,
    currentStreakDays: 12,
    earnedMinutesToday: 125,
    hasMeaningfulActivityToday: true,
    mode: 'locked',
    onAddCondition: jest.fn(),
    onAnalysis: jest.fn(),
    onEdit: jest.fn(),
    onEventAction: jest.fn(),
    onOpenCondition: jest.fn(),
    onOpenEarning: jest.fn(),
    onOpenRules: jest.fn(),
    onOpenTimeLocked: jest.fn(),
    onOpenTrend: jest.fn(),
    onStartCondition: jest.fn(),
    remainingMinutes: 0,
    screenTimeLabel: '1h 32m',
    showcaseAnalysis: true,
    statusBody: 'Complete a condition to add sample time.',
    statusTitle: 'Locked',
    walkStatus: 'inactive',
  };
  return Object.assign(defaults, overrides);
}

describe('HomeScreen entry focus and local detail actions', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it.each([
    ['nudge', 'Afternoon nudge opened. While walking is highlighted.'],
    ['lastCall', 'Streak last call opened. While walking is highlighted.'],
  ] as const)('announces the %s focus target', async (entry, announcement) => {
    const announce = jest
      .spyOn(AccessibilityInfo, 'announceForAccessibility')
      .mockImplementation(jest.fn());

    await renderScreen(<HomeScreen {...createProps({ entry })} />);

    await waitFor(() => expect(announce).toHaveBeenCalledWith(announcement));
  });

  it('routes the balance modal CTA to the cheapest state condition', async () => {
    const onStartCondition = jest.fn();
    const view = await renderScreen(<HomeScreen {...createProps({ onStartCondition })} />);

    await fireEvent.press(view.getByRole('button', { name: 'Open balance and access details' }));

    expect(view.getByRole('header', { name: 'Today’s balance' })).toBeTruthy();
    expect(view.getByText('0 min left')).toBeTruthy();
    await fireEvent.press(view.getByRole('button', { name: 'Start a walk' }));

    expect(onStartCondition).toHaveBeenCalledWith('demo-walk');
  });

  it('opens a condition detail and edits that exact condition', async () => {
    const onOpenCondition = jest.fn();
    const view = await renderScreen(<HomeScreen {...createProps({ onOpenCondition })} />);

    await fireEvent.press(view.getByRole('button', { name: 'About Go to gym' }));

    expect(view.getByRole('header', { name: 'Go to gym' })).toBeTruthy();
    expect(view.getByText('EVENT CONDITION')).toBeTruthy();
    await fireEvent.press(view.getByRole('button', { name: 'Edit condition' }));

    expect(onOpenCondition).toHaveBeenCalledWith('demo-gym');
  });

  it('starts walking from an inactive state condition card', async () => {
    const onStartCondition = jest.fn();
    const view = await renderScreen(<HomeScreen {...createProps({ onStartCondition })} />);

    await fireEvent.press(view.getByRole('button', { name: 'Start walking for While walking' }));

    expect(onStartCondition).toHaveBeenCalledWith('demo-walk');
  });

  it('routes a gym-presence State card with its exact condition identity', async () => {
    const onStartCondition = jest.fn();
    const gymPresence = {
      ...showcaseConditions[1],
      catalogId: 'gym-present',
      context: 'Northside Community Gym',
      gymId: 'northside',
      id: 'gym-presence-northside',
      name: 'Stay at Northside',
      ruleSummary: 'Stay at Northside · balance drains normally',
    };
    const view = await renderScreen(
      <HomeScreen {...createProps({ conditions: [gymPresence], onStartCondition })} />,
    );

    expect(view.queryByText('Check in at Northside Community Gym to keep apps open')).toBeNull();
    await fireEvent.press(view.getByRole('button', { name: 'Check in for Stay at Northside' }));
    expect(onStartCondition).toHaveBeenCalledWith('gym-presence-northside');
  });

  it('routes each stat to its documented destination without the removed summary header', async () => {
    const onOpenTimeLocked = jest.fn();
    const view = await renderScreen(<HomeScreen {...createProps({ onOpenTimeLocked })} />);

    await fireEvent.press(view.getByRole('button', { name: 'Open today’s Time Locked detail' }));
    await fireEvent.press(view.getByRole('button', { name: 'Open Screen Time balance details' }));

    expect(onOpenTimeLocked).toHaveBeenCalledTimes(1);
    expect(view.getByRole('header', { name: 'Today’s balance' })).toBeTruthy();
    expect(view.queryByText('Friday · Active day')).toBeNull();
    expect(view.queryByText('50% of goal completed')).toBeNull();
  });

  it('opens the weekly Rules summary during a rule holiday', async () => {
    const onOpenRules = jest.fn();
    const view = await renderScreen(
      <HomeScreen
        {...createProps({
          mode: 'rest-day-no-locking',
          onOpenRules,
          statusBody: 'Your streak stays neutral.',
          statusTitle: 'No limits today',
        })}
      />,
    );

    await fireEvent.press(view.getByRole('button', { name: 'Open rules summary' }));

    expect(view.getByRole('header', { name: 'No limits today' })).toBeTruthy();
    expect(view.getByText('Today is a planned Rest day. Your streak stays neutral and limits resume tomorrow.')).toBeTruthy();
    await fireEvent.press(view.getByRole('button', { name: 'Edit rules' }));
    expect(onOpenRules).toHaveBeenCalledTimes(1);
  });

  it('opens earning analysis from the Rate card body and local detail from its info button', async () => {
    const onOpenEarning = jest.fn();
    const rateCondition = showcaseConditions.find((condition) => condition.kind === 'rate');
    expect(rateCondition).toBeDefined();
    const view = await renderScreen(
      <HomeScreen {...createProps({ conditions: rateCondition ? [rateCondition] : [], onOpenEarning })} />,
    );

    await fireEvent.press(view.getByRole('button', { name: 'Open Steps exchange details' }));
    expect(onOpenEarning).toHaveBeenCalledWith(rateCondition?.id);

    await fireEvent.press(view.getByRole('button', { name: 'About Steps exchange' }));
    expect(view.getByText('RATE CONDITION')).toBeTruthy();
  });

  it('renders and routes non-step Rate identity without collapsing it to steps', async () => {
    const onOpenEarning = jest.fn();
    const runRate = {
      ...showcaseConditions[2],
      catalogId: 'run-distance-rate',
      id: 'morning-run-rate',
      name: 'Morning run exchange',
      ruleSummary: '1 mi = 15 min · continuous',
    };
    const view = await renderScreen(
      <HomeScreen {...createProps({ conditions: [runRate], onOpenEarning })} />,
    );

    expect(view.getByText('Morning run exchange')).toBeTruthy();
    expect(view.getByText('3.4 mi recorded')).toBeTruthy();
    expect(view.queryByText('6,240 steps today')).toBeNull();
    await fireEvent.press(view.getByRole('button', { name: 'Open Morning run exchange details' }));
    expect(onOpenEarning).toHaveBeenCalledWith('morning-run-rate');
  });

  it('preserves a saved metric Rate unit on both the Home card and condition detail', async () => {
    const metricRun = {
      ...showcaseConditions[2],
      catalogId: 'run-distance-rate',
      id: 'metric-run-rate',
      name: 'Metric run exchange',
      rateMinutes: 15,
      ruleSummary: '1 km = 15 min · continuous · Anytime',
    };
    const view = await renderScreen(
      <HomeScreen {...createProps({ conditions: [metricRun] })} />,
    );

    expect(view.getByText('5.5 km recorded')).toBeTruthy();
    expect(view.getByText('1h 23m earned')).toBeTruthy();
    expect(view.queryByText(/\bmi\b/)).toBeNull();

    await fireEvent.press(view.getByRole('button', { name: 'About Metric run exchange' }));
    expect(view.getByText('5.5 km recorded · 1h 23m credited.')).toBeTruthy();
  });

  it('presents the current Custom-weekday fixed Rate reward on the card and detail', async () => {
    const rateCondition = showcaseConditions.find((condition) => condition.kind === 'rate');
    expect(rateCondition).toBeDefined();
    const view = await renderScreen(
      <HomeScreen
        {...createProps({
          conditions: rateCondition ? [rateCondition] : [],
          currentRewardOverrides: { 'demo-steps': { kind: 'fixed', minutes: 7 } },
          executableConditionIds: ['demo-steps'],
        })}
      />,
    );

    expect(view.getByText('44 min earned')).toBeTruthy();
    expect(view.getByText('1,000 steps = 7 min · continuous · Custom today')).toBeTruthy();
    expect(view.queryByText('2h 05m earned')).toBeNull();

    await fireEvent.press(view.getByRole('button', { name: 'About Steps exchange' }));
    expect(view.getByText('6,240 steps · 44 min credited.')).toBeTruthy();
  });

  it('keeps an Off-this-weekday State condition visible but prevents execution', async () => {
    const onStartCondition = jest.fn();
    const stateCondition = showcaseConditions.find((condition) => condition.kind === 'state');
    expect(stateCondition).toBeDefined();
    const view = await renderScreen(
      <HomeScreen
        {...createProps({
          conditions: stateCondition ? [stateCondition] : [],
          currentRewardOverrides: { 'demo-walk': { kind: 'off' } },
          executableConditionIds: [],
          onStartCondition,
        })}
      />,
    );

    expect(view.getByText('OFF TODAY')).toBeTruthy();
    expect(view.queryByText('Off this weekday. This condition cannot earn credit today.')).toBeNull();
    expect(view.queryByRole('button', { name: 'Start walking for While walking' })).toBeNull();
    expect(onStartCondition).not.toHaveBeenCalled();

    await fireEvent.press(view.getByRole('button', { name: 'About While walking' }));
    expect(view.getByText('This condition is Off for the current Custom weekday.')).toBeTruthy();
    expect(view.queryByRole('button', { name: 'Start walking' })).toBeNull();
  });

  it('auto-opens the exact condition requested by the Home query seam', async () => {
    const view = await renderScreen(
      <HomeScreen {...createProps({ openConditionId: 'demo-walk' })} />,
    );

    expect(view.getByRole('header', { name: 'While walking' })).toBeTruthy();
    expect(view.getByText('STATE CONDITION')).toBeTruthy();
  });

  it('keeps a natural first condition separate from explicit showcase history', async () => {
    const view = await renderScreen(
      <HomeScreen
        {...createProps({
          conditions: [showcaseConditions[0]],
          currentStreakDays: 0,
          earnedMinutesToday: 0,
          hasMeaningfulActivityToday: false,
          screenTimeLabel: '45 min',
          showcaseAnalysis: false,
          timeLockedLabel: '0 min',
        })}
      />,
    );

    expect(view.getByText('45 min')).toBeTruthy();
    expect(view.queryByText('0 min earned today')).toBeNull();
    expect(view.queryByText('Today’s goal is ready')).toBeNull();
    expect(view.queryByText('2h 05m earned today')).toBeNull();
    expect(view.queryByRole('button', { name: '50% of today’s streak goal completed.' })).toBeNull();
  });

  it('uses an incomplete Event as the low-time recovery when no State condition exists', async () => {
    const onEventAction = jest.fn();
    const eventCondition = showcaseConditions.find((condition) => condition.kind === 'event');
    expect(eventCondition).toBeDefined();
    const view = await renderScreen(
      <HomeScreen
        {...createProps({
          conditions: eventCondition ? [{ ...eventCondition, todayStatus: 'ready' }] : [],
          mode: 'low',
          onEventAction,
        })}
      />,
    );

    await fireEvent.press(view.getByRole('button', { name: 'Earn more' }));
    expect(onEventAction).toHaveBeenCalledWith(eventCondition?.id);
  });

  it('uses each non-gym Event threshold and reward instead of the sample gym subtitle', async () => {
    const activeMinutesEvent = {
      ...showcaseConditions[0],
      catalogId: 'active-minutes-event',
      context: undefined,
      eventThreshold: 35,
      id: 'active-minutes-event',
      name: 'Active-minutes goal',
      ruleSummary: '35 active min · add 20 min · once daily · no cooldown · Anytime',
    };
    const view = await renderScreen(
      <HomeScreen {...createProps({ conditions: [activeMinutesEvent] })} />,
    );

    expect(view.queryByText('35 active min · add 20 min')).toBeNull();
    expect(view.queryByText(/Harbor Strength/)).toBeNull();
  });

  it('never renders a disabled condition or chooses it as an earning route', async () => {
    const onEventAction = jest.fn();
    const onStartCondition = jest.fn();
    const disabledWalk = { ...showcaseConditions[1], enabled: false };
    const readyEvent = { ...showcaseConditions[0], todayStatus: 'ready' as const };
    const view = await renderScreen(
      <HomeScreen
        {...createProps({
          conditions: [disabledWalk, readyEvent],
          mode: 'low',
          onEventAction,
          onStartCondition,
        })}
      />,
    );

    expect(view.queryByText('While walking')).toBeNull();
    await fireEvent.press(view.getByRole('button', { name: 'Earn more' }));
    expect(onEventAction).toHaveBeenCalledWith('demo-gym');
    expect(onStartCondition).not.toHaveBeenCalled();
  });

  it('shows complete balance arithmetic and sends See trend to the trend callback', async () => {
    const onOpenTrend = jest.fn();
    const view = await renderScreen(
      <HomeScreen {...createProps({ earnedMinutesToday: 155, onOpenTrend, remainingMinutes: 30 })} />,
    );

    await fireEvent.press(view.getByRole('button', { name: 'Open balance and access details' }));
    expect(view.getByRole('header', { name: 'Today’s balance' })).toBeTruthy();
    expect(view.getByText('30 min left')).toBeTruthy();
    expect(view.getByText('Daily free time')).toBeTruthy();
    expect(view.getByText('2h 35m')).toBeTruthy();
    expect(view.getByText('Used')).toBeTruthy();

    await fireEvent.press(view.getByRole('button', { name: 'See trend' }));
    expect(onOpenTrend).toHaveBeenCalledTimes(1);
  });

  it('shows the current Custom-day allowance in the balance arithmetic', async () => {
    const view = await renderScreen(
      <HomeScreen
        {...createProps({
          dailyAllowanceMinutes: 240,
          earnedMinutesToday: 0,
          remainingMinutes: 195,
          screenTimeUsedMinutes: 45,
        })}
      />,
    );

    await fireEvent.press(view.getByRole('button', { name: 'Open balance and access details' }));
    expect(view.getByText('195 min left')).toBeTruthy();
    expect(view.getByText('4h')).toBeTruthy();
    expect(view.getAllByText('0 min').length).toBeGreaterThan(0);
    expect(view.getByText('45 min')).toBeTruthy();
    expect(view.queryByText('2h 35m')).toBeNull();
  });

  it('shows banner, evidence, window, and the correct action in each condition detail', async () => {
    const onEventAction = jest.fn();
    const onOpenEarning = jest.fn();
    const onStartCondition = jest.fn();
    const view = await renderScreen(
      <HomeScreen {...createProps({ onEventAction, onOpenEarning, onStartCondition })} />,
    );

    await fireEvent.press(view.getByRole('button', { name: 'About Go to gym' }));
    expect(view.getByText('Not completed today.')).toBeTruthy();
    expect(view.getByText('6:00 AM–10:00 PM')).toBeTruthy();
    await fireEvent.press(view.getByRole('button', { name: 'Check in' }));
    expect(onEventAction).toHaveBeenCalledWith('demo-gym');

    await fireEvent.press(view.getByRole('button', { name: 'About While walking' }));
    expect(view.getByText('0 min active today.')).toBeTruthy();
    expect(view.getByText('7:00 AM–10:00 PM')).toBeTruthy();
    await fireEvent.press(view.getByRole('button', { name: 'Start walking' }));
    expect(onStartCondition).toHaveBeenCalledWith('demo-walk');

    await fireEvent.press(view.getByRole('button', { name: 'About Steps exchange' }));
    expect(view.getByText('6,240 steps · 2h 05m credited.')).toBeTruthy();
    expect(view.getByText('Anytime')).toBeTruthy();
    await fireEvent.press(view.getByRole('button', { name: 'View analysis' }));
    expect(onOpenEarning).toHaveBeenCalledWith('demo-steps');
  });

  it('keeps rule-holiday state in the primary Home content after removing the summary header', async () => {
    const view = await renderScreen(
      <HomeScreen
        {...createProps({
          mode: 'rest-day-no-locking',
          statusBody: 'Your streak stays neutral.',
          statusTitle: 'No limits today',
        })}
      />,
    );

    expect(view.getByText('No limits today')).toBeTruthy();
    expect(view.getByText('Your streak stays neutral.')).toBeTruthy();
    expect(view.queryByText('Sunday · Rest day')).toBeNull();
  });

  it('makes Allowance only Rest days neutral and keeps earning controls read-only', async () => {
    const view = await renderScreen(
      <HomeScreen
        {...createProps({
          mode: 'locked',
          restDayAllowanceOnly: true,
          statusBody: 'Today is a Rest day. Earning is paused; only your daily free allowance applies.',
          statusTitle: 'Daily allowance used',
        })}
      />,
    );

    expect(view.queryByText('Friday · Rest day')).toBeNull();
    expect(view.getByText('REST DAY · Conditions are read-only right now')).toBeTruthy();
    expect(view.queryByRole('button', { name: 'Start walking for While walking' })).toBeNull();
    await fireEvent.press(view.getByRole('button', { name: 'About Go to gym' }));
    expect(view.getByText('This condition is read-only while today’s neutral rule holiday is active.')).toBeTruthy();
    expect(view.queryByRole('button', { name: 'Check in' })).toBeNull();
  });

  it('retains an event-holiday source and exact expiry across the card and balance detail', async () => {
    const holidayEvent = {
      ...showcaseConditions[0],
      reward: { kind: 'rest-of-day' as const },
      todayStatus: 'completed' as const,
    };
    const view = await renderScreen(
      <HomeScreen
        {...createProps({
          accessHoliday: {
            kind: 'restOfDay',
            sourceConditionId: holidayEvent.id,
            sourceName: holidayEvent.name,
            expiresAt: 'Midnight',
            durationMinutes: null,
          },
          conditions: [holidayEvent],
          mode: 'rest-of-day',
          remainingMinutes: 30,
          statusBody: 'Go to gym completed. Balance on hold.',
          statusTitle: 'Unlocked for today',
        })}
      />,
    );

    expect(view.getAllByText('OPEN TIME')).toHaveLength(2);
    expect(view.queryByText('Unlocked for today · balance on hold.')).toBeNull();
    await fireEvent.press(view.getByRole('button', { name: 'Open balance and access details' }));
    expect(view.getByText('Go to gym opened the selected apps for the rest of today.')).toBeTruthy();
    expect(view.getByText('Midnight')).toBeTruthy();
    await fireEvent.press(view.getByRole('button', { name: 'View condition' }));
    expect(view.getByText('Completed today · open until Midnight.')).toBeTruthy();
    expect(view.getByText('Balance on hold · expires Midnight')).toBeTruthy();
  });

  it('never renders an Adding 0 min transition label', async () => {
    const view = await renderScreen(
      <HomeScreen {...createProps({ earnTransitionMinutes: 0 })} />,
    );

    expect(view.queryByText('Adding 0 min')).toBeNull();
    expect(view.getByText('Opening access…')).toBeTruthy();
  });

  it('completes the earned-minutes count immediately when reduced motion is requested', async () => {
    const view = await renderScreen(
      <HomeScreen {...createProps({ earnTransitionMinutes: 30 })} />,
    );

    expect(view.getByText('Adding 30 min')).toBeTruthy();
  });

  it('moves to a notification entry target without animated scrolling when reduced motion is requested', async () => {
    const scrollTo = jest.fn();
    const scrollRef = { current: null } as HomeScreenProps['scrollRef'];
    const view = await renderScreen(
      <HomeScreen {...createProps({ entry: 'nudge', scrollRef })} />,
    );
    if (!scrollRef?.current) throw new Error('Expected Home to assign its scroll handle');
    scrollRef.current.scrollTo = scrollTo;

    await fireEvent(view.getByTestId('home-conditions-section'), 'layout', {
      nativeEvent: { layout: { height: 100, width: 390, x: 0, y: 200 } },
    });
    await fireEvent(view.getByTestId('home-condition-list'), 'layout', {
      nativeEvent: { layout: { height: 100, width: 390, x: 0, y: 40 } },
    });
    await fireEvent(view.getByTestId('home-entry-target-demo-walk'), 'layout', {
      nativeEvent: { layout: { height: 100, width: 390, x: 0, y: 80 } },
    });

    await waitFor(() => expect(scrollTo).toHaveBeenCalledWith(
      expect.objectContaining({ animated: false }),
    ));
  });

  it('renders and dismisses the full Home notification-entry context around the enabled target', async () => {
    const onDismissEntry = jest.fn();
    const disabledWalk = { ...showcaseConditions[1], enabled: false };
    const view = await renderScreen(
      <HomeScreen
        {...createProps({
          conditions: [disabledWalk, showcaseConditions[0]],
          entry: 'nudge',
          onDismissEntry,
        })}
      />,
    );

    expect(view.getByText('FROM NOTIFICATION PREVIEW')).toBeTruthy();
    expect(view.getByText('A little room is waiting.')).toBeTruthy();
    expect(view.getByText('Opened from a sample notification. Nothing was delivered.')).toBeTruthy();
    expect(view.getByTestId('home-entry-target-demo-gym')).toBeTruthy();
    expect(view.queryByText('While walking')).toBeNull();
    await fireEvent.press(view.getByRole('button', { name: 'Dismiss notification preview context.' }));
    expect(onDismissEntry).toHaveBeenCalledTimes(1);
  });
});
