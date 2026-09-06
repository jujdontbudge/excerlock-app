import { render, screen, userEvent } from '@testing-library/react-native';
import { Text } from 'react-native';
import { PressableScale } from '../PressableScale';
test('the feedback primitive preserves disabled semantics and custom content', async () => {
  const action = jest.fn();
  await render(
    <PressableScale label="Choose walking" onPress={action} disabled>
      <Text>Walking</Text>
    </PressableScale>,
  );
  await userEvent.press(screen.getByRole('button', { name: 'Choose walking' }));
  expect(action).not.toHaveBeenCalled();
});
