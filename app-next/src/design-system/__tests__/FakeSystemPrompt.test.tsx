import { render, screen, userEvent } from '@testing-library/react-native';
import { FakeSystemPrompt } from '../FakeSystemPrompt';
import { setupCopy } from '../../content/setup';

test.each([
  ['Allow Once', true],
  ['Allow While Using App', true],
  ['Don’t Allow', false],
])('the demo location alert answers %s as iOS would', async (label, granted) => {
  const resolve = jest.fn();
  await render(<FakeSystemPrompt alert={setupCopy.alerts.location} onResolve={resolve} />);
  expect(screen.getByText('Allow “ExcerLock” to use your location?')).toBeTruthy();
  await userEvent.press(screen.getByRole('button', { name: label }));
  expect(resolve).toHaveBeenCalledWith(granted);
});
