import type { ReactElement } from 'react';
import { Alert, type AlertButton } from 'react-native';
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

  it('turns the first stepper press into an explicit phone-use choice', async () => {
    const onSetPhoneUse = jest.fn();
    const view = await renderScreen(
      <OnboardingScreen
        {...createProps({ canContinue: false, onSetPhoneUse, step: 'confession' })}
      />,
    );

    expect(view.getByLabelText('Daily phone use, 1 through 12 or more hours')).toHaveAccessibilityValue({
      min: 1,
      max: 12,
      text: 'Not chosen',
    });
    await fireEvent.press(view.getByRole('button', { name: 'Increase' }));

    expect(onSetPhoneUse).toHaveBeenCalledWith(1);
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

    expect(onSetPhoneUse).toHaveBeenCalledWith(1);
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

    expect(view.getByText(/is off in this demo/)).toBeTruthy();
    await fireEvent.press(view.getByRole('button', { name: 'Not now' }));
    expect(onSetPermission).toHaveBeenCalledWith('motion', 'denied');
    expect(onContinue).toHaveBeenCalledTimes(1);
  });

  it('derives the mirror summary from the actual local choice', async () => {
    const mirror = await renderScreen(
      <OnboardingScreen {...createProps({ phoneUseHours: 3, step: 'mirror' })} />,
    );
    expect(mirror.getByText('At 3 hours a day.')).toBeTruthy();
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
