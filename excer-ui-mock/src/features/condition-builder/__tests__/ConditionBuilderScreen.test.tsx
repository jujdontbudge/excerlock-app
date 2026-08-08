import type { ReactElement } from 'react';
import { fireEvent, render } from '@testing-library/react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { bannerOptions } from '@/content';
import { createDemoState } from '@/presentation';

import {
  ConditionBuilderScreen,
  eventRangeFor,
  type ConditionBuilderScreenProps,
} from '../ConditionBuilderScreen';

const safeAreaMetrics = {
  frame: { height: 844, width: 390, x: 0, y: 0 },
  insets: { bottom: 34, left: 0, right: 0, top: 47 },
};

const renderScreen = (screen: ReactElement) => render(
  <SafeAreaProvider initialMetrics={safeAreaMetrics}>{screen}</SafeAreaProvider>,
);

function createProps(
  overrides: Partial<ConditionBuilderScreenProps> = {},
): ConditionBuilderScreenProps {
  const draft = createDemoState({ stage: 'builder' }).builder;
  return {
    canContinue: false,
    draft: {
      ...draft,
      active: true,
      step: 'banner',
      path: ['catalog', 'configure-rate', 'banner', 'preview'],
      catalogId: 'walk-steps-rate',
      kind: 'rate',
      name: 'Steps exchange',
      rateMinutes: 20,
    },
    onAddGym: jest.fn(),
    onBack: jest.fn(),
    onClose: jest.fn(),
    onContinue: jest.fn(),
    onEditGym: jest.fn(),
    onPreviewAction: jest.fn(),
    onSave: jest.fn(),
    onSelectActiveWindow: jest.fn(),
    onSelectActiveWindowTime: jest.fn(),
    onSelectBanner: jest.fn(),
    onSelectCatalog: jest.fn(),
    onSelectCooldown: jest.fn(),
    onSelectDailyCap: jest.fn(),
    onSetEnabled: jest.fn(),
    onSetName: jest.fn(),
    onSelectEventThreshold: jest.fn(),
    onSelectGym: jest.fn(),
    onSelectRateMinutes: jest.fn(),
    onSelectRepeatable: jest.fn(),
    onSelectReward: jest.fn(),
    onSelectStateGrace: jest.fn(),
    primaryLabel: 'Next',
    savedGyms: [],
    title: 'Choose card artwork',
    ...overrides,
  };
}

describe('ConditionBuilderScreen photo seam', () => {
  it('moves through a local picker and crop before selecting the deterministic bundled banner', async () => {
    expect(
      bannerOptions.reduce((count, family) => count + family.options.length, 0) - 1,
    ).toBe(21);

    const onSelectBanner = jest.fn();
    const view = await renderScreen(
      <ConditionBuilderScreen {...createProps({ onSelectBanner })} />,
    );

    await fireEvent.press(view.getByRole('button', { name: 'Choose a sample photo…' }));
    expect(view.getByRole('header', { name: 'Sample photo library' })).toBeTruthy();
    expect(view.getByText(/No photo-library permission is requested/)).toBeTruthy();

    await fireEvent.press(view.getByRole('button', { name: 'Choose sample photo' }));
    expect(view.getByRole('header', { name: 'Crop sample photo' })).toBeTruthy();
    expect(view.getByText(/hardcoded local crop preview/)).toBeTruthy();

    await fireEvent.press(view.getByRole('button', { name: 'Use crop' }));
    expect(onSelectBanner).toHaveBeenCalledWith('general-city-motion');
    expect(view.queryByRole('header', { name: 'Crop sample photo' })).toBeNull();
  });

  it('exposes artwork filters as a selected radio group', async () => {
    const view = await renderScreen(<ConditionBuilderScreen {...createProps()} />);

    expect(view.getByRole('radio', { name: 'Show All artwork' }).props.accessibilityState)
      .toMatchObject({ selected: true });
    expect(view.getByRole('radio', { name: 'Show Gym artwork' }).props.accessibilityState)
      .toMatchObject({ selected: false });

    await fireEvent.press(view.getByRole('radio', { name: 'Show Gym artwork' }));

    expect(view.getByRole('radio', { name: 'Show All artwork' }).props.accessibilityState)
      .toMatchObject({ selected: false });
    expect(view.getByRole('radio', { name: 'Show Gym artwork' }).props.accessibilityState)
      .toMatchObject({ selected: true });
  });

  it('exposes catalog filters as a selected radio group', async () => {
    const base = createDemoState({ stage: 'builder' }).builder;
    const view = await renderScreen(
      <ConditionBuilderScreen {...createProps({
        draft: { ...base, active: true, step: 'catalog' },
      })} />,
    );

    expect(view.getByRole('radio', { name: 'Show All conditions' }).props.accessibilityState)
      .toMatchObject({ selected: true });
    expect(view.getByRole('radio', { name: 'Show Walking conditions' }).props.accessibilityState)
      .toMatchObject({ selected: false });

    await fireEvent.press(view.getByRole('radio', { name: 'Show Walking conditions' }));

    expect(view.getByRole('radio', { name: 'Show Walking conditions' }).props.accessibilityState)
      .toMatchObject({ selected: true });
  });
});

describe('ConditionBuilderScreen strict rule controls', () => {
  it('lets assistive technology adjust an unset numeric rule directly', async () => {
    const onSelectRateMinutes = jest.fn();
    const base = createDemoState({ stage: 'builder' }).builder;
    const view = await renderScreen(
      <ConditionBuilderScreen {...createProps({
        draft: {
          ...base,
          active: true,
          catalogId: 'walk-steps-rate',
          kind: 'rate',
          path: ['catalog', 'configure-rate', 'banner', 'preview'],
          rateMinutes: null,
          step: 'configure-rate',
        },
        onSelectRateMinutes,
      })} />,
    );

    const adjustable = view.getByRole('adjustable', { name: 'minutes, not chosen' });
    await fireEvent(adjustable, 'accessibilityAction', {
      nativeEvent: { actionName: 'increment' },
    });

    expect(onSelectRateMinutes).toHaveBeenCalledWith(5);
  });

  it('uses the exact metric and imperial event ranges', () => {
    expect(eventRangeFor('run-distance-event', 'kilometers')).toEqual({
      label: 'kilometers', min: 1, max: 42, step: 0.5,
    });
    expect(eventRangeFor('run-distance-event', 'miles')).toEqual({
      label: 'miles', min: 1, max: 26, step: 0.5,
    });
    expect(eventRangeFor('cycle-distance-event', 'kilometers')).toEqual({
      label: 'kilometers', min: 5, max: 200, step: 5,
    });
    expect(eventRangeFor('cycle-distance-event', 'miles')).toEqual({
      label: 'miles', min: 3, max: 120, step: 3,
    });
  });

  it('renders all active-window modes and selectable start/end clocks', async () => {
    const onSelectActiveWindow = jest.fn();
    const onSelectActiveWindowTime = jest.fn();
    const base = createDemoState({ stage: 'builder' }).builder;
    const view = await renderScreen(
      <ConditionBuilderScreen {...createProps({
        draft: {
          ...base,
          active: true,
          activeWindow: 'start-end',
          activeWindowStartMinutes: 420,
          activeWindowEndMinutes: 1320,
          catalogId: 'walk-state',
          kind: 'state',
          path: ['catalog', 'configure-state', 'banner', 'preview'],
          stateGraceSeconds: 120,
          step: 'configure-state',
        },
        onSelectActiveWindow,
        onSelectActiveWindowTime,
      })} />,
    );

    expect(view.getByRole('button', { name: 'Anytime' })).toBeTruthy();
    expect(view.getByRole('button', { name: 'Start time only' })).toBeTruthy();
    expect(view.getByRole('button', { name: 'End time only' })).toBeTruthy();
    expect(view.getByRole('button', { name: 'Start and end' })).toBeTruthy();
    expect(view.getByText('7:00 AM')).toBeTruthy();
    expect(view.getByText('10:00 PM')).toBeTruthy();

    await fireEvent.press(view.getByRole('button', { name: 'Start time only' }));
    await fireEvent.press(view.getByRole('button', { name: 'Increase start time' }));
    expect(onSelectActiveWindow).toHaveBeenCalledWith('start-only');
    expect(onSelectActiveWindowTime).toHaveBeenCalledWith('start', 421);
  });

  it('exposes caps 1–10, Unlimited, and the 15-minute cooldown wheel', async () => {
    const onSelectCooldown = jest.fn();
    const base = createDemoState({ stage: 'builder' }).builder;
    const view = await renderScreen(
      <ConditionBuilderScreen {...createProps({
        draft: {
          ...base,
          active: true,
          catalogId: 'active-minutes-event',
          eventThreshold: 30,
          kind: 'event',
          path: ['catalog', 'configure-event', 'reward', 'banner', 'preview'],
          step: 'reward',
        },
        onSelectCooldown,
      })} />,
    );

    expect(view.getByRole('button', { name: 'Once' })).toBeTruthy();
    expect(view.getByRole('button', { name: '10 times' })).toBeTruthy();
    expect(view.getByRole('button', { name: 'Unlimited' })).toBeTruthy();
    await fireEvent.press(view.getByRole('button', { name: 'Increase cooldown' }));
    expect(onSelectCooldown).toHaveBeenCalledWith(0);
  });

  it('uses the Home card contract and prints the exact configured rule in preview', async () => {
    const base = createDemoState({ stage: 'builder' }).builder;
    const view = await renderScreen(
      <ConditionBuilderScreen {...createProps({
        canContinue: true,
        draft: {
          ...base,
          active: true,
          activeWindow: 'end-only',
          activeWindowEndMinutes: 1230,
          bannerId: 'general-sunrise',
          catalogId: 'active-minutes-event',
          cooldownMinutes: 45,
          dailyCap: 3,
          eventThreshold: 30,
          kind: 'event',
          name: 'Move for thirty',
          path: ['catalog', 'configure-event', 'reward', 'banner', 'preview'],
          repeatable: true,
          reward: 'fixed',
          rewardMinutes: 25,
          step: 'preview',
        },
        primaryLabel: 'Save condition',
        title: 'Preview your condition',
      })} />,
    );

    expect(view.getByText('Move for thirty')).toBeTruthy();
    expect(view.getByRole('button', { name: 'Complete Move for thirty' })).toBeTruthy();
    expect(view.getByText(
      '30 active min · add 25 min · up to 3× daily · 45 min cooldown · until 8:30 PM',
    )).toBeTruthy();
  });

  it('does not offer a Back action from the first immutable edit step', async () => {
    const base = createDemoState({ stage: 'builder' }).builder;
    const view = await renderScreen(
      <ConditionBuilderScreen {...createProps({
        draft: {
          ...base,
          active: true,
          catalogId: 'walk-state',
          editingConditionId: 'condition-1',
          kind: 'state',
          path: ['configure-state', 'banner', 'preview'],
          stateGraceSeconds: 120,
          step: 'configure-state',
        },
      })} />,
    );

    expect(view.queryByRole('button', { name: 'Back' })).toBeNull();
  });
});
