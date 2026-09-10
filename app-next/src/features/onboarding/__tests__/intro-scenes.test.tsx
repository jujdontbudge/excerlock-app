import { render, screen } from '@testing-library/react-native';
import { O02 } from '../screens/O02';
import { O03 } from '../screens/O03';
import { TrendHero } from '../scenes/TrendHero';
import { trendCopy } from '../../../content/trend';
test('progress intro explains the illustrative screen-time reduction', async () => {
  await render(<O02 />);
  expect(screen.getByRole('header', { name: 'Block apps. Exercise more.' })).toBeTruthy();
  expect(screen.getByText('-3h 12m')).toBeTruthy();
  expect(screen.getByLabelText('Illustrative screen-time reduction of 3 hours and 12 minutes')).toBeTruthy();
  expect(screen.getByLabelText('Introduction, page 2 of 3')).toBeTruthy();
  expect(screen.getByText('Reduce your screen time and track your progress.')).toBeTruthy();
});
test('third introduction shows the two activities and the final page marker', async () => {
  await render(<O03 />);
  expect(screen.getByRole('header', { name: 'Block apps. Exercise more.' })).toBeTruthy();
  for (const name of ['Walking', 'Gym'])
    expect(screen.getByRole('image', { name })).toBeTruthy();
  expect(screen.getByLabelText('Introduction, page 3 of 3')).toBeTruthy();
  expect(screen.getByText('Exercise more each week and stay consistent.')).toBeTruthy();
});
test('trend illustration exposes image semantics and its description', async () => {
  await render(<TrendHero />);
  expect(screen.getByRole('image', { name: trendCopy.description })).toBeTruthy();
});
