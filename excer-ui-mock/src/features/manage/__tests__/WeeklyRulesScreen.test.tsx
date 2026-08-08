import type { ReactElement } from 'react';
import { fireEvent, render } from '@testing-library/react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { createDemoState } from '@/presentation';

import { CustomDayScreen, type CustomDayScreenProps } from '../WeeklyRulesScreen';

const safeAreaMetrics = {
  frame: { height: 844, width: 390, x: 0, y: 0 },
  insets: { bottom: 34, left: 0, right: 0, top: 47 },
};

const renderScreen = (screen: ReactElement) => render(
  <SafeAreaProvider initialMetrics={safeAreaMetrics}>{screen}</SafeAreaProvider>,
);

function createProps(overrides: Partial<CustomDayScreenProps> = {}): CustomDayScreenProps {
  const state = createDemoState({ stage: 'home', showcase: true });
  return {
    conditions: state.conditions,
    customValues: state.rules.weekly.customValues.monday,
    dayName: 'Monday',
    mode: 'custom',
    onBack: jest.fn(),
    onDone: jest.fn(),
    onSetCustomField: jest.fn(),
    onSelectMode: jest.fn(),
    onSelectRestBehavior: jest.fn(),
    onSetRewardOverride: jest.fn(),
    restBehavior: 'no-locking',
    ...overrides,
  };
}

describe('CustomDayScreen condition reward overrides', () => {
  it('offers kind-specific choices and applies only after confirmation', async () => {
    const onSetRewardOverride = jest.fn();
    const view = await renderScreen(
      <CustomDayScreen {...createProps({ onSetRewardOverride })} />,
    );

    await fireEvent.press(view.getByRole('button', { name: 'Condition rewards, Usual rewards' }));
    await fireEvent.press(view.getByRole('button', { name: 'Go to gym, Usual reward' }));

    expect(view.getByRole('radio', { name: 'Add 45 minutes' })).toBeTruthy();
    expect(view.queryByRole('radio', { name: '20 min per signal' })).toBeNull();
    await fireEvent.press(view.getByRole('radio', { name: 'Add 45 minutes' }));
    expect(onSetRewardOverride).not.toHaveBeenCalled();

    await fireEvent.press(view.getByRole('button', { name: 'Apply override' }));
    expect(onSetRewardOverride).toHaveBeenCalledWith('demo-gym', { kind: 'fixed', minutes: 45 });

    await fireEvent.press(view.getByRole('button', { name: 'Steps exchange, Usual reward' }));
    expect(view.getByRole('radio', { name: '20 min per signal' })).toBeTruthy();
    expect(view.queryByRole('radio', { name: 'Open for the rest of the day' })).toBeNull();
    await fireEvent.press(view.getByRole('radio', { name: '20 min per signal' }));
    const cancelButtons = view.getAllByRole('button', { name: 'Cancel' });
    await fireEvent.press(cancelButtons[cancelButtons.length - 1]);

    expect(onSetRewardOverride).toHaveBeenCalledTimes(1);
  });

  it('exposes complete allowance and kind-specific reward ranges', async () => {
    const onSetCustomField = jest.fn();
    const view = await renderScreen(
      <CustomDayScreen {...createProps({ onSetCustomField })} />,
    );

    await fireEvent.press(view.getByRole('button', { name: 'Daily free time, 90 min' }));
    expect(view.getByRole('radio', { name: '0 min · Full Lock' })).toBeTruthy();
    expect(view.getByRole('radio', { name: '5 min' })).toBeTruthy();
    expect(view.getByRole('radio', { name: '4 h' })).toBeTruthy();
    await fireEvent.press(view.getByRole('radio', { name: '5 min' }));
    const doneButtons = view.getAllByRole('button', { name: 'Done' });
    await fireEvent.press(doneButtons[doneButtons.length - 1]);
    expect(onSetCustomField).toHaveBeenCalledWith('allowance', '5 min');

    await fireEvent.press(view.getByRole('button', { name: 'Lock window, 8:00 PM–7:00 AM' }));
    await fireEvent.press(view.getByRole('button', { name: 'From, 8:00 PM' }));
    expect(view.getByRole('radio', { name: '12:00 AM' })).toBeTruthy();
    expect(view.getByRole('radio', { name: '12:15 AM' })).toBeTruthy();
    expect(view.getByRole('radio', { name: '11:45 PM' })).toBeTruthy();
    await fireEvent.press(view.getByRole('radio', { name: '12:15 AM' }));
    await fireEvent.press(view.getByRole('button', { name: 'Increase time by one minute' }));
    expect(view.getByText('12:16 AM')).toBeTruthy();
    await fireEvent.press(view.getByRole('button', { name: 'Use time' }));
    const windowDoneButtons = view.getAllByRole('button', { name: 'Done' });
    await fireEvent.press(windowDoneButtons[windowDoneButtons.length - 1]);
    expect(onSetCustomField).toHaveBeenCalledWith('window', '12:16 AM–7:00 AM');

    await fireEvent.press(view.getByRole('button', { name: 'Condition rewards, Usual rewards' }));
    await fireEvent.press(view.getByRole('button', { name: 'Go to gym, Usual reward' }));
    expect(view.getByRole('radio', { name: 'Add 5 minutes' })).toBeTruthy();
    expect(view.getByRole('radio', { name: 'Add 120 minutes' })).toBeTruthy();
    expect(view.getByRole('radio', { name: 'Open for 15 minutes' })).toBeTruthy();
    expect(view.getByRole('radio', { name: 'Open for 240 minutes' })).toBeTruthy();
  });
});
