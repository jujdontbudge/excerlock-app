import { render, screen } from '@testing-library/react-native';
import { O02 } from '../screens/O02';
import { O03 } from '../screens/O03';
import { activities } from '../../../content/activities';
import { welcomeCopy } from '../../../content/welcome';

test('O03 activity names come from the canonical activity titles', () => {
  expect(welcomeCopy.activities).toEqual(activities.map(({ title }) => title));
});
test('O02 explains the illustrative screen-time reduction', async () => {
  await render(<O02 />);
  expect(screen.getByRole('header', { name: 'See your progress' })).toBeTruthy();
  expect(screen.getByText('-3h 12m')).toBeTruthy();
  expect(screen.getByText('Illustrative, not a forecast')).toBeTruthy();
  expect(screen.getByLabelText('Illustrative screen-time reduction of 3 hours and 12 minutes')).toBeTruthy();
  expect(screen.getByLabelText('Introduction, page 2 of 3')).toBeTruthy();
  expect(screen.getByText('Reduce your screen time and track your progress.')).toBeTruthy();
});
test('O03 uses the canonical four activity names and final page marker', async () => {
  await render(<O03 />);
  expect(screen.getByRole('header', { name: 'Stay in control' })).toBeTruthy();
  for (const name of ['Walking', 'Gym', 'Running', 'Biking'])
    expect(screen.getByRole('image', { name })).toBeTruthy();
  expect(screen.getByLabelText('Introduction, page 3 of 3')).toBeTruthy();
  expect(screen.getByText('Exercise more each week and stay consistent.')).toBeTruthy();
});
