import { render, screen } from '@testing-library/react-native';
import { O02 } from '../screens/O02';
import { O03 } from '../screens/O03';
test('progress intro explains the illustrative screen-time reduction', async () => {
  await render(<O02 />);
  expect(screen.getByRole('header', { name: 'Block apps. Exercise more.' })).toBeTruthy();
  expect(screen.getByText('-3h 12m')).toBeTruthy();
  expect(screen.getByLabelText('Illustrative screen-time reduction of 3 hours and 12 minutes')).toBeTruthy();
  expect(screen.getByLabelText('Introduction, page 2 of 3')).toBeTruthy();
  expect(screen.getByText('Reduce your screen time and track your progress.')).toBeTruthy();
});
test('control intro explains the user-owned schedule and exercise', async () => {
  await render(<O03 />);
  expect(screen.getByRole('header', { name: 'Stay in control' })).toBeTruthy();
  expect(screen.getByText('Your schedule')).toBeTruthy();
  expect(screen.getByText('Your exercise')).toBeTruthy();
});
