import { fireEvent, render } from '@testing-library/react-native';

jest.mock('react-native-reanimated', () => {
  const ReactNative = require('react-native');
  return {
    __esModule: true,
    cubicBezier: () => 'linear',
    default: { Image: ReactNative.Image, Text: ReactNative.Text, View: ReactNative.View },
    useReducedMotion: () => false,
  };
});

import { NotificationPreviewScreen } from '../NotificationPreviewScreen';

describe('NotificationPreviewScreen', () => {
  it('enters the selected destination from the unopened preview without claiming delivery', async () => {
    const onEnterDestination = jest.fn();
    const view = await render(
      <NotificationPreviewScreen
        onDismiss={jest.fn()}
        onEnterDestination={onEnterDestination}
        slug="recap"
      />,
    );

    expect(view.getByText(/No notification was scheduled or delivered/)).toBeTruthy();
    fireEvent.press(view.getByRole('button', { name: 'Tap notification preview' }));
    expect(onEnterDestination).toHaveBeenCalledTimes(1);
    expect(onEnterDestination).toHaveBeenCalledWith('recap');
  });

  it('keeps the tapped destination preview inspectable behind an explicit phase', async () => {
    const onEnterDestination = jest.fn();
    const view = await render(
      <NotificationPreviewScreen
        onDismiss={jest.fn()}
        onEnterDestination={onEnterDestination}
        phase="tapped"
        slug="last-call"
      />,
    );

    expect(view.getByText('STREAK REMINDER PREVIEW')).toBeTruthy();
    fireEvent.press(view.getByRole('button', { name: 'Open focused screen' }));
    expect(onEnterDestination).toHaveBeenCalledWith('last-call');
  });
});
