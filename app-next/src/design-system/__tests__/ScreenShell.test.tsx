import { render, screen, within } from '@testing-library/react-native';
import { StyleSheet, Text } from 'react-native';
import * as safeArea from 'react-native-safe-area-context';
import { ScreenShell } from '../ScreenShell';
test('content and fixed footer remain independently accessible', async () => {
  await render(
    <ScreenShell footer={<Text>Continue</Text>}>
      <Text>Content</Text>
    </ScreenShell>,
  );
  expect(screen.getByText('Content')).toBeTruthy();
  expect(screen.getByText('Continue')).toBeTruthy();
});

test('headers scroll with content below the notch while the footer stays outside', async () => {
  const insets = jest.spyOn(safeArea, 'useSafeAreaInsets').mockReturnValue({ top: 59, bottom: 34, left: 0, right: 0 });
  try {
    await render(
      <ScreenShell header={<Text>Back</Text>} footer={<Text>Continue</Text>}>
        <Text>Content</Text>
      </ScreenShell>,
    );
    const scroll = screen.getByTestId('screen-scroll');
    expect(StyleSheet.flatten(scroll.props.contentContainerStyle)).toMatchObject({ paddingTop: 63 });
    expect(within(scroll).getByText('Back')).toBeTruthy();
    expect(within(scroll).queryByText('Continue')).toBeNull();
  } finally {
    insets.mockRestore();
  }
});
