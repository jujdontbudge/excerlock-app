import { Text } from 'react-native';
import { fireEvent, render } from '@testing-library/react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { AccessibleModal, AccessibleModalTitle } from '../AccessibleModal';

describe('AccessibleModal', () => {
  it('disables the native modal transition when reduced motion is requested', async () => {
    const onRequestClose = jest.fn();
    const view = await render(
      <SafeAreaProvider
        initialMetrics={{
          frame: { height: 852, width: 393, x: 0, y: 0 },
          insets: { bottom: 34, left: 0, right: 0, top: 59 },
        }}
      >
        <AccessibleModal
          accessibilityTitle="Example dialog"
          animationType="slide"
          onRequestClose={onRequestClose}
          testID="accessible-modal"
          visible
        >
          <AccessibleModalTitle>Example dialog</AccessibleModalTitle>
          <Text>Dialog body</Text>
        </AccessibleModal>
      </SafeAreaProvider>,
    );

    expect(view.getByTestId('accessible-modal').props.animationType).toBe('none');
    expect(view.getByTestId('accessible-modal').props.presentationStyle).toBe('fullScreen');
    expect(view.getByTestId('accessible-modal').props.transparent).toBe(false);
    expect(view.getByRole('header', { name: 'Example dialog' })).toBeTruthy();
    expect(view.getAllByText('Example dialog')).toHaveLength(1);

    fireEvent.press(view.getByRole('button', { name: 'Close Example dialog' }));
    expect(onRequestClose).toHaveBeenCalledTimes(1);
  });

  it('renders a question as a multiline prompt below the navigation action', async () => {
    const view = await render(
      <SafeAreaProvider
        initialMetrics={{
          frame: { height: 852, width: 393, x: 0, y: 0 },
          insets: { bottom: 34, left: 0, right: 0, top: 59 },
        }}
      >
        <AccessibleModal
          accessibilityTitle="What could work better?"
          onRequestClose={jest.fn()}
          visible
        >
          <Text>Choices</Text>
        </AccessibleModal>
      </SafeAreaProvider>,
    );

    expect(view.getByRole('header', { name: 'What could work better?' }).props.numberOfLines).toBe(3);
    expect(view.getByRole('button', { name: 'Close What could work better?' })).toBeTruthy();
  });
});
