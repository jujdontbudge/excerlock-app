import { fireEvent, render, screen, within } from '@testing-library/react-native';
import { StyleSheet, Text } from 'react-native';
import * as safeArea from 'react-native-safe-area-context';
import { ScreenShell } from '../ScreenShell';
import { tokens as t } from '../tokens';
test('content and fixed footer remain independently accessible', async () => {
  await render(
    <ScreenShell footer={<Text>Continue</Text>}>
      <Text>Content</Text>
    </ScreenShell>,
  );
  expect(screen.getByText('Content')).toBeTruthy();
  expect(screen.getByText('Continue')).toBeTruthy();
});

test('scrolling can be disabled for gesture-driven screens', async () => {
  await render(<ScreenShell scrollEnabled={false}><Text>Dial</Text></ScreenShell>);
  expect(screen.getByTestId('screen-scroll')).toHaveProp('scrollEnabled', false);
});

test('caller content style is merged last, so a caller padding is not silently overridden', async () => {
  await render(
    <ScreenShell header={<Text>Back</Text>} contentStyle={{ paddingTop: 0 }}>
      <Text>Content</Text>
    </ScreenShell>,
  );
  expect(StyleSheet.flatten(screen.getByTestId('screen-scroll').props.contentContainerStyle)).toMatchObject({ paddingTop: 0 });
});

test('the scroll content reserves the measured footer height, so a tall footer hides nothing', async () => {
  await render(
    <ScreenShell footer={<Text>Continue</Text>}>
      <Text>Content</Text>
    </ScreenShell>,
  );
  await fireEvent(screen.getByTestId('screen-footer'), 'layout', { nativeEvent: { layout: { x: 0, y: 0, width: 402, height: 212 } } });
  expect(StyleSheet.flatten(screen.getByTestId('screen-scroll').props.contentContainerStyle).paddingBottom).toBe(212 + t.space.xl);
});

test.each([true, false])('the header stays put above the scrolling content (scrollUnderStatusBar=%s)', async (under) => {
  const insets = jest.spyOn(safeArea, 'useSafeAreaInsets').mockReturnValue({ top: 59, bottom: 34, left: 0, right: 0 });
  try {
    await render(
      <ScreenShell scrollUnderStatusBar={under} header={<Text>Back</Text>} footer={<Text>Continue</Text>}>
        <Text>Content</Text>
      </ScreenShell>,
    );
    const scroll = screen.getByTestId('screen-scroll');
    expect(screen.getByText('Back')).toBeTruthy();
    expect(within(scroll).queryByText('Back')).toBeNull();
    expect(within(scroll).queryByText('Continue')).toBeNull();
    expect(StyleSheet.flatten(scroll.props.contentContainerStyle).marginTop).toBeUndefined();
  } finally {
    insets.mockRestore();
  }
});
