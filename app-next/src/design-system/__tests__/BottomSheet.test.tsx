import { render, screen, userEvent } from '@testing-library/react-native';
import { Text } from 'react-native';
import { BottomSheet } from '../BottomSheet';
test('sheet provides dismiss controls and hides when closed', async () => {
  const dismiss = jest.fn();
  const result = await render(
    <BottomSheet open title="Choose a time" onDismiss={dismiss}>
      <Text>Time wheel</Text>
    </BottomSheet>,
  );
  expect(screen.getByText('Time wheel')).toBeTruthy();
  await userEvent.press(screen.getByRole('button', { name: 'Close' }));
  expect(dismiss).toHaveBeenCalledTimes(1);
  await result.rerender(
    <BottomSheet open={false} title="Choose a time" onDismiss={dismiss}>
      <Text>Time wheel</Text>
    </BottomSheet>,
  );
  expect(screen.queryByText('Time wheel')).toBeNull();
});
