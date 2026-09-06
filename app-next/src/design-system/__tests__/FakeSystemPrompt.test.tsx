import { render, screen, userEvent } from '@testing-library/react-native';
import { FakeSystemPrompt } from '../FakeSystemPrompt';
test.each(['Allow', 'Don’t allow'])('fake system prompt resolves %s locally', async (label) => {
  const resolve = jest.fn();
  await render(<FakeSystemPrompt title="Allow Health access?" body="This is a local preview." onResolve={resolve} />);
  await userEvent.press(screen.getByRole('button', { name: label }));
  expect(resolve).toHaveBeenCalledWith(label === 'Allow');
});
