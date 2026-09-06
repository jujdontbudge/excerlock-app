import { render, screen } from '@testing-library/react-native';
import { O02 } from '../screens/O02';
import { O03 } from '../screens/O03';
test('progress intro labels both illustrative series', async () => {
  await render(<O02 />);
  expect(screen.getByRole('header', { name: 'See your progress' })).toBeTruthy();
  expect(screen.getByText('Screen time')).toBeTruthy();
  expect(screen.getByText('Exercise')).toBeTruthy();
});
test('control intro explains the user-owned schedule and exercise', async () => {
  await render(<O03 />);
  expect(screen.getByRole('header', { name: 'Stay in control' })).toBeTruthy();
  expect(screen.getByText('Your schedule')).toBeTruthy();
  expect(screen.getByText('Your exercise')).toBeTruthy();
});
