import { render, screen, userEvent } from '@testing-library/react-native';
import { BackButton } from '../BackButton';
import { tokens as t } from '../tokens';
test('the one back affordance is a labelled chevron on a 44 x 44pt target', async () => {
  const back = jest.fn();
  await render(<BackButton onPress={back} />);
  const button = screen.getByRole('button', { name: 'Back' });
  expect(button.children[0]).toHaveStyle({ width: t.control.inline, height: t.control.inline });
  await userEvent.press(button);
  expect(back).toHaveBeenCalledTimes(1);
});
