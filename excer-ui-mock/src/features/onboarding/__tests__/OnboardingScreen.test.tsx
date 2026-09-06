import type { ReactElement } from 'react';
import { Alert, StyleSheet, type AlertButton } from 'react-native';
import { act, fireEvent, render } from '@testing-library/react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { OnboardingScreen, type OnboardingScreenProps } from '../OnboardingScreen';

const safeAreaMetrics = {
  frame: { height: 844, width: 390, x: 0, y: 0 },
  insets: { bottom: 34, left: 0, right: 0, top: 47 },
};

const renderScreen = (screen: ReactElement) => render(
  <SafeAreaProvider initialMetrics={safeAreaMetrics}>{screen}</SafeAreaProvider>,
);

function createProps(overrides: Partial<OnboardingScreenProps> = {}): OnboardingScreenProps {
  return {
    allowanceMinutes: null,
    canContinue: true,
    onBack: jest.fn(),
    onCommitApps: jest.fn(),
    onContinue: jest.fn(),
    onJumpStep: jest.fn(),
    onSetAllowance: jest.fn(),
    onSetPermission: jest.fn(),
    onSetPhoneUse: jest.fn(),
    permissionOutcomes: {
      screenTime: 'notAsked',
      motion: 'notAsked',
      health: 'notAsked',
      location: 'notAsked',
    },
    phoneUseHours: null,
    selectedApps: ['loop', 'clips', 'orbit'],
    step: 'screen-time',
    ...overrides,
  };
}

describe('OnboardingScreen required choices', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('keeps Screen Time in place after denial and continues only after retry approval', async () => {
    const onContinue = jest.fn();
    const onSetPermission = jest.fn();
    const props = createProps({ onContinue, onSetPermission });
    const view = await renderScreen(<OnboardingScreen {...props} />);

    await fireEvent.press(view.getByRole('button', { name: 'Continue' }));
    expect(view.getByRole('header', { name: /Allow “ExcerLock” to preview/ })).toBeTruthy();

    await fireEvent.press(view.getByRole('button', { name: 'Not now' }));

    expect(onSetPermission).toHaveBeenCalledWith('screenTime', 'denied');
    expect(onContinue).not.toHaveBeenCalled();
    await view.rerender(
      <SafeAreaProvider initialMetrics={safeAreaMetrics}>
        <OnboardingScreen
          {...props}
          permissionOutcomes={{ ...props.permissionOutcomes, screenTime: 'denied' }}
        />
      </SafeAreaProvider>,
    );
    expect(view.getByText('Screen Time preview needs attention')).toBeTruthy();
    expect(view.getByText(/required demo step in place/)).toBeTruthy();

    await fireEvent.press(view.getByRole('button', { name: 'Try the preview again' }));
    await fireEvent.press(view.getByRole('button', { name: 'Allowed in demo' }));

    expect(onSetPermission).toHaveBeenLastCalledWith('screenTime', 'allowed');
    expect(onContinue).toHaveBeenCalledTimes(1);
  });

  it('uses a true slider with the bePresent-style three-hour preview', async () => {
    const onSetPhoneUse = jest.fn();
    const view = await renderScreen(
      <OnboardingScreen
        {...createProps({ canContinue: false, onSetPhoneUse, step: 'confession' })}
      />,
    );

    expect(view.getByLabelText('Daily phone use, 1 through 12 or more hours')).toHaveAccessibilityValue({
      min: 1,
      max: 12,
      now: 3,
      text: '3h',
    });
    await fireEvent(view.getByTestId('phone-use-slider'), 'valueChange', 5);

    expect(onSetPhoneUse).toHaveBeenCalledWith(5);
  });

  it('lets assistive technology adjust the phone-use choice directly', async () => {
    const onSetPhoneUse = jest.fn();
    const view = await renderScreen(
      <OnboardingScreen
        {...createProps({ canContinue: false, onSetPhoneUse, step: 'confession' })}
      />,
    );

    const adjustable = view.getByRole('adjustable', {
      name: 'Daily phone use, 1 through 12 or more hours',
    });
    await fireEvent(adjustable, 'accessibilityAction', {
      nativeEvent: { actionName: 'increment' },
    });

    expect(onSetPhoneUse).toHaveBeenCalledWith(4);
  });

  it('places the white back control and progress in one top row', async () => {
    const view = await renderScreen(
      <OnboardingScreen {...createProps({ step: 'confession' })} />,
    );

    expect(view.getByTestId('onboarding-top-row')).toBeTruthy();
    expect(view.getByRole('button', { name: 'Back' })).toBeTruthy();
    expect(view.getByRole('progressbar', { name: 'Onboarding step 2 of 12' }))
      .toHaveAccessibilityValue({ min: 1, max: 12, now: 2 });
  });

  it('floats the action over the uninterrupted screen and avoids scrolling on a standard step', async () => {
    const view = await renderScreen(
      <OnboardingScreen {...createProps({ step: 'screen-time' })} />,
    );

    expect(StyleSheet.flatten(view.getByTestId('feature-scaffold-footer').props.style)).toMatchObject({
      bottom: 0,
      left: 0,
      position: 'absolute',
      right: 0,
    });
    expect(view.queryByTestId('feature-scaffold-scroll')).toBeNull();
  });

  it('starts onboarding copy beneath the progress row instead of centering it mid-screen', async () => {
    const view = await renderScreen(
      <OnboardingScreen {...createProps({ step: 'value' })} />,
    );

    expect(StyleSheet.flatten(view.getByTestId('onboarding-main').props.style)).toMatchObject({
      justifyContent: 'flex-start',
    });
    expect(StyleSheet.flatten(view.getByText('Earn your screen time.').props.style)).toMatchObject({
      textAlign: 'left',
    });
  });

  it('keeps the long app picker scrollable behind the floating action', async () => {
    const view = await renderScreen(
      <OnboardingScreen {...createProps({ step: 'apps' })} />,
    );

    expect(view.getByTestId('feature-scaffold-scroll')).toBeTruthy();
    expect(view.getByTestId('feature-scaffold-footer').props.pointerEvents).toBe('box-none');
  });

  it('stages app changes and restores the entry selection on discard', async () => {
    const onBack = jest.fn();
    const onCommitApps = jest.fn();
    let alertButtons: AlertButton[] | undefined;
    jest.spyOn(Alert, 'alert').mockImplementation((_title, _message, buttons) => {
      alertButtons = buttons;
    });
    const view = await renderScreen(
      <OnboardingScreen
        {...createProps({ onBack, onCommitApps, step: 'apps' })}
      />,
    );

    await fireEvent.press(view.getByRole('button', { name: 'Circle' }));
    expect(view.getByRole('button', { name: 'Circle, selected' })).toBeTruthy();
    expect(onCommitApps).not.toHaveBeenCalled();

    await fireEvent.press(view.getByRole('button', { name: 'Cancel' }));
    expect(Alert.alert).toHaveBeenCalledWith(
      'Keep these app choices?',
      'Your sample selection changed on this screen.',
      expect.any(Array),
    );

    await act(() => alertButtons?.find((button) => button.text === 'Discard and go back')?.onPress?.());

    expect(view.getByRole('button', { name: 'Circle' })).toBeTruthy();
    expect(onCommitApps).not.toHaveBeenCalled();
    expect(onBack).toHaveBeenCalledTimes(1);
  });

  it('exposes the app category filter as a selected radio group', async () => {
    const view = await renderScreen(
      <OnboardingScreen {...createProps({ step: 'apps' })} />,
    );

    expect(view.getByRole('radio', { name: 'All' }).props.accessibilityState).toMatchObject({ selected: true });
    expect(view.getByRole('radio', { name: 'Social' }).props.accessibilityState).toMatchObject({ selected: false });

    await fireEvent.press(view.getByRole('radio', { name: 'Social' }));

    expect(view.getByRole('radio', { name: 'All' }).props.accessibilityState).toMatchObject({ selected: false });
    expect(view.getByRole('radio', { name: 'Social' }).props.accessibilityState).toMatchObject({ selected: true });
  });

  it('commits the staged app selection exactly once on continue', async () => {
    const onCommitApps = jest.fn();
    const onContinue = jest.fn();
    const view = await renderScreen(
      <OnboardingScreen
        {...createProps({ onCommitApps, onContinue, step: 'apps' })}
      />,
    );

    await fireEvent.press(view.getByRole('button', { name: 'Circle' }));
    await fireEvent.press(view.getByRole('button', { name: 'Done' }));

    expect(onCommitApps).toHaveBeenCalledTimes(1);
    expect(onCommitApps).toHaveBeenCalledWith(['loop', 'clips', 'orbit', 'circle']);
    expect(onContinue).toHaveBeenCalledTimes(1);
  });

  it('retains the optional Motion denial through the presentation seam', async () => {
    const onContinue = jest.fn();
    const onSetPermission = jest.fn();
    const view = await renderScreen(
      <OnboardingScreen
        {...createProps({
          onContinue,
          onSetPermission,
          permissionOutcomes: {
            screenTime: 'allowed',
            motion: 'denied',
            health: 'notAsked',
            location: 'notAsked',
          },
          step: 'motion',
        })}
      />,
    );

    expect(view.queryByText(/is off in this demo/)).toBeNull();
    await fireEvent.press(view.getByRole('button', { name: 'Not now' }));
    expect(onSetPermission).toHaveBeenCalledWith('motion', 'denied');
    expect(onContinue).toHaveBeenCalledTimes(1);
  });

  it('derives the mirror summary from the actual local choice', async () => {
    const mirror = await renderScreen(
      <OnboardingScreen {...createProps({ phoneUseHours: 3, step: 'mirror' })} />,
    );
    expect(mirror.getByText('That’s about 46 days a year.')).toBeTruthy();
    expect(mirror.getByText(/roughly 1095 hours/)).toBeTruthy();
  });

  it('derives every review row from the actual local choices', async () => {
    const review = await renderScreen(
      <OnboardingScreen
        {...createProps({
          allowanceMinutes: 60,
          permissionOutcomes: {
            screenTime: 'allowed',
            motion: 'denied',
            health: 'allowed',
            location: 'denied',
          },
          selectedApps: ['loop', 'clips'],
          step: 'review',
        })}
      />,
    );
    expect(review.getByText('2 selected')).toBeTruthy();
    expect(review.getByText('60 min')).toBeTruthy();
    expect(review.getAllByText('Allowed in demo')).toHaveLength(2);
    expect(review.getAllByText('Not now')).toHaveLength(2);
  });
});
