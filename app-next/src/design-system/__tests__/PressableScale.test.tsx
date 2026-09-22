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

test('a visually small control still gets a 44 x 44pt hit region', async () => {
  const { fireEvent } = require('@testing-library/react-native');
  await render(
    <PressableScale label="Next day" onPress={jest.fn()}>
      <Text>›</Text>
    </PressableScale>,
  );
  const control = screen.getByRole('button', { name: 'Next day' });
  await fireEvent(control, 'layout', { nativeEvent: { layout: { x: 0, y: 0, width: 24, height: 44 } } });
  expect(screen.getByRole('button', { name: 'Next day' }).props.hitSlop).toEqual({ top: 0, bottom: 0, left: 10, right: 10 });
});
