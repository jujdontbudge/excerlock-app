import { Text } from 'react-native';
import { render } from '@testing-library/react-native';

import { AccessibleModal, AccessibleModalTitle } from '../AccessibleModal';

describe('AccessibleModal', () => {
  it('disables the native modal transition when reduced motion is requested', async () => {
    const view = await render(
      <AccessibleModal
        accessibilityTitle="Example dialog"
        animationType="slide"
        onRequestClose={jest.fn()}
        testID="accessible-modal"
        visible
      >
        <AccessibleModalTitle>Example dialog</AccessibleModalTitle>
        <Text>Dialog body</Text>
      </AccessibleModal>,
    );

    expect(view.getByTestId('accessible-modal').props.animationType).toBe('none');
  });
});
