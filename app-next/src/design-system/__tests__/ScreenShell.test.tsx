import { render, screen } from '@testing-library/react-native';
import { Text } from 'react-native';
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
