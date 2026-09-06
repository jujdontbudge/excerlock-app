import type { ReactElement } from 'react';
import { useState } from 'react';
import { fireEvent, render } from '@testing-library/react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { milestoneFixtures } from '@/content';

import {
  AnalysisScreen,
  BadgeDetailScreen,
  DayDetailScreen,
  EarningDetailScreen,
  ShareCardPreview,
  type AnalysisRange,
} from '..';

const safeAreaMetrics = {
  frame: { height: 844, width: 390, x: 0, y: 0 },
  insets: { bottom: 34, left: 0, right: 0, top: 47 },
};

const renderScreen = (screen: ReactElement) => render(
  <SafeAreaProvider initialMetrics={safeAreaMetrics}>{screen}</SafeAreaProvider>,
);

const noOp = jest.fn();

function AnalysisHarness() {
  const [range, setRange] = useState<AnalysisRange>('week');
  return (
    <AnalysisScreen
      activityCount={43}
      currentStreakDays={12}
      earnedMinutes={590}
      history="populated"
      onBadgePress={noOp}
      onDayPress={noOp}
      onEarningPress={noOp}
      onMethodPress={noOp}
      onRangeChange={setRange}
      onShareRecap={noOp}
      onStartToday={noOp}
      onTrendPress={noOp}
      range={range}
      showcase
      showRecap={false}
      timeLockedMinutes={134}
    />
  );
}

function EarningHarness() {
  const [range, setRange] = useState<'week' | 'month'>('week');
  const [fallbackConditionId, setFallbackConditionId] = useState<string | null>(null);
  return (
    <EarningDetailScreen
      fallbackConditionId={fallbackConditionId}
      focusedConditionId="demo-gym"
      onBack={noOp}
      onConditionPress={setFallbackConditionId}
      onDismissFallbackCondition={() => setFallbackConditionId(null)}
      onRangeChange={setRange}
      range={range}
    />
  );
}

function NewBadgeHarness() {
  const [status, setStatus] = useState<'new' | 'unlocked'>('new');
  const badge = milestoneFixtures.find((item) => item.assetId === 'time-reclaimed-50-hours')!;
  return (
    <BadgeDetailScreen
      badge={badge}
      onBack={noOp}
      onClearNew={() => setStatus('unlocked')}
      onPrimary={noOp}
      status={status}
    />
  );
}

describe('Analysis rendered compliance seams', () => {
  it('shows the exact empty explanation while preserving all analytic shells', async () => {
    const view = await renderScreen(
      <AnalysisScreen
        history="empty"
        onBadgePress={noOp}
        onDayPress={noOp}
        onEarningPress={noOp}
        onMethodPress={noOp}
        onRangeChange={noOp}
        onShareRecap={noOp}
        onStartToday={noOp}
        onTrendPress={noOp}
        showRecap={false}
      />,
    );

    expect(view.getByText('Your first insight starts with one active day.')).toBeTruthy();
    expect(view.getByText(/chart, streak map, earning breakdown/)).toBeTruthy();
    expect(view.getByText('0 min')).toBeTruthy();
    expect(view.getByText(/All 22 milestones/)).toBeTruthy();
  });

  it('renders complete recap facts and reports the milestone shelf only after reveal', async () => {
    const onMilestoneShelfVisible = jest.fn();
    const view = await renderScreen(
      <AnalysisScreen
        activityCount={43}
        currentStreakDays={12}
        earnedMinutes={590}
        history="populated"
        onBadgePress={noOp}
        onDayPress={noOp}
        onEarningPress={noOp}
        onMethodPress={noOp}
        onMilestoneShelfVisible={onMilestoneShelfVisible}
        onRangeChange={noOp}
        onShareRecap={noOp}
        onStartToday={noOp}
        onTrendPress={noOp}
        showcase
        showRecap
        timeLockedMinutes={134}
      />,
    );

    expect(view.getByText('4h 50m earned · 5h 25m spent')).toBeTruthy();
    expect(view.getByText('7-day streak at week’s end')).toBeTruthy();
    await fireEvent(view.getByTestId('analysis-milestone-shelf'), 'layout', { nativeEvent: { layout: { height: 600, width: 390, x: 0, y: 1400 } } });
    await fireEvent.scroll(view.getByTestId('analysis-scroll'), {
      nativeEvent: { contentOffset: { y: 900 }, layoutMeasurement: { height: 600 } },
    });
    expect(onMilestoneShelfVisible).toHaveBeenCalledTimes(1);
  });

  it('shows and dismisses recap notification context honestly', async () => {
    const onDismissEntryContext = jest.fn();
    const view = await renderScreen(
      <AnalysisScreen
        activityCount={43}
        currentStreakDays={12}
        earnedMinutes={590}
        entryContext="recap"
        freshRecap
        history="populated"
        onBadgePress={noOp}
        onDayPress={noOp}
        onDismissEntryContext={onDismissEntryContext}
        onEarningPress={noOp}
        onMethodPress={noOp}
        onRangeChange={noOp}
        onShareRecap={noOp}
        onStartToday={noOp}
        onTrendPress={noOp}
        showcase
        showRecap
        timeLockedMinutes={134}
      />,
    );

    expect(view.getByText('WEEKLY RECAP PREVIEW')).toBeTruthy();
    expect(view.getByText('Opened from a sample notification. Nothing was delivered.')).toBeTruthy();
    await fireEvent.press(view.getByRole('button', { name: 'Dismiss notification preview context' }));
    expect(onDismissEntryContext).toHaveBeenCalledTimes(1);
  });
  it('replots the overview with period-specific labels when range changes', async () => {
    const view = await renderScreen(<AnalysisHarness />);

    expect(view.getByText('Aug 3–9, 2026 · daily view')).toBeTruthy();
    expect(view.getByLabelText(/From Monday through Friday/)).toBeTruthy();

    await fireEvent.press(view.getByRole('radio', { name: 'Month' }));
    expect(view.getByText('August 2026 · weekly view')).toBeTruthy();
    expect(view.getByLabelText('Sample reclaimed time by week in August 2026')).toBeTruthy();

    await fireEvent.press(view.getByRole('radio', { name: 'Year' }));
    expect(view.getByText('2026 · monthly view')).toBeTruthy();
    expect(view.getByText('You reclaimed 68h across the sample year.')).toBeTruthy();
  });

  it('renders natural sparse history from persisted activity instead of the debug fixture', async () => {
    const view = await renderScreen(
      <AnalysisScreen
        activityCount={1}
        activityDays={[{ date: '2026-08-07', kind: 'event' }]}
        currentStreakDays={1}
        earnedMinutes={30}
        history="populated"
        onBadgePress={noOp}
        onDayPress={noOp}
        onEarningPress={noOp}
        onMethodPress={noOp}
        onRangeChange={noOp}
        onShareRecap={noOp}
        onStartToday={noOp}
        onTrendPress={noOp}
        showcase={false}
        showRecap={false}
        timeLockedMinutes={18}
      />,
    );

    expect(view.getByText('Your real local sample has started.')).toBeTruthy();
    expect(view.getAllByText('1 qualifying activity recorded across 1 day.').length).toBeGreaterThan(0);
    expect(view.getByText('30 min earned')).toBeTruthy();
    expect(view.getByText('18 min of Time Locked is recorded in this local sample.')).toBeTruthy();
    expect(view.getByLabelText('Current streak, 1 day')).toBeTruthy();
    expect(view.queryByText('18h 42m')).toBeNull();
    expect(view.queryByText('4h 50m earned · 5h 25m spent')).toBeNull();
    expect(view.queryByTestId('weekly-recap-card')).toBeNull();
  });

  it('reflects the persisted week-start choice in the heat-map columns', async () => {
    const props = {
      history: 'populated' as const,
      onBadgePress: noOp,
      onDayPress: noOp,
      onEarningPress: noOp,
      onMethodPress: noOp,
      onRangeChange: noOp,
      onShareRecap: noOp,
      onStartToday: noOp,
      onTrendPress: noOp,
      showRecap: false,
    };
    const view = await renderScreen(<AnalysisScreen {...props} startWeek="monday" />);

    expect(view.getByLabelText('Week starts on Monday')).toBeTruthy();
    await view.rerender(
      <SafeAreaProvider initialMetrics={safeAreaMetrics}>
        <AnalysisScreen {...props} startWeek="sunday" />
      </SafeAreaProvider>,
    );
    expect(view.getByLabelText('Week starts on Sunday')).toBeTruthy();
  });

  it('sends an exact fired condition from day detail to its earning callback', async () => {
    const onConditionPress = jest.fn();
    const view = await renderScreen(
      <DayDetailScreen
        dateLabel="Thursday, Aug 6"
        kind="event"
        onBack={noOp}
        onConditionPress={onConditionPress}
        onPrimary={noOp}
      />,
    );

    expect(view.getByRole('header', { name: 'Thursday, Aug 6' })).toBeTruthy();
    await fireEvent.press(view.getByRole('button', { name: 'Open Go to gym earning detail' }));
    expect(onConditionPress).toHaveBeenCalledWith('demo-gym');
  });

  it('changes earning aggregates and opens an exact in-place fallback detail', async () => {
    const view = await renderScreen(<EarningHarness />);

    expect(view.getByText('3h 46m banked this week')).toBeTruthy();
    expect(view.queryByText(/Selected from day detail/)).toBeNull();
    await fireEvent.press(view.getByRole('radio', { name: 'Month' }));
    expect(view.getByText('9h 50m banked this month')).toBeTruthy();

    await fireEvent.press(view.getByRole('button', { name: 'Open Distance goal condition detail' }));
    expect(view.getByRole('header', { name: 'Distance goal' })).toBeTruthy();
    expect(view.getByText('105 min · 18% this month')).toBeTruthy();
  });

  it('renders badge-specific unlocked and locked identity, art, threshold, and month', async () => {
    const unlocked = milestoneFixtures.find((badge) => badge.assetId === 'activity-5')!;
    const unlockedView = await renderScreen(
      <BadgeDetailScreen badge={unlocked} onBack={noOp} onPrimary={noOp} status="unlocked" />,
    );
    expect(unlockedView.getByLabelText('High five badge art')).toBeTruthy();
    expect(unlockedView.getByText('High five was unlocked in May 2026.')).toBeTruthy();
    await unlockedView.unmount();

    const locked = milestoneFixtures.find((badge) => badge.assetId === 'time-reclaimed-100-hours')!;
    const lockedView = await renderScreen(
      <BadgeDetailScreen badge={locked} onBack={noOp} onPrimary={noOp} status="locked" />,
    );
    expect(lockedView.getByLabelText('Hundred hours back badge art')).toBeTruthy();
    expect(lockedView.getByText('Reach 100 hours to unlock this sample milestone.')).toBeTruthy();
    expect(lockedView.getByText('Threshold: 100 hours')).toBeTruthy();
  });

  it('clears the visible New glint when the badge art is tapped', async () => {
    const view = await renderScreen(<NewBadgeHarness />);

    expect(view.getByText(/NEW MILESTONE/)).toBeTruthy();
    await fireEvent.press(view.getByRole('button', { name: 'Clear new badge highlight' }));
    expect(view.queryByText(/NEW MILESTONE/)).toBeNull();
    expect(view.getByText('UNLOCKED MILESTONE')).toBeTruthy();
  });

  it('makes the compact share preview identify the selected badge', async () => {
    const badge = milestoneFixtures.find((item) => item.assetId === 'activity-5')!;
    const view = await renderScreen(
      <ShareCardPreview badge={badge} compact format="square" kind="milestone" />,
    );

    expect(view.getByLabelText('Achievement preview thumbnail, 5, High five, May 2026')).toBeTruthy();
  });
});
