import { fireEvent, render, screen, userEvent, waitFor } from '@testing-library/react-native';
import { AnalyticsScreen } from '../AnalyticsScreen';
import { createRuntime } from '../../../runtime/createRuntime';
import { AppRuntimeProvider } from '../../../runtime/AppRuntimeProvider';

async function mountScenario(id: string) {
  const runtime = createRuntime();
  await runtime.dev.load(id);
  await render(<AppRuntimeProvider runtime={runtime}><AnalyticsScreen /></AppRuntimeProvider>);
  return runtime;
}

test('walking analytics follows the reference Day, Week, and Month hierarchy', async () => {
  const runtime = await mountScenario('home-locked-walking');
  expect(screen.queryByText('This week')).toBeNull();
  expect(screen.queryByLabelText('Previous period')).toBeNull();
  expect(screen.queryByLabelText('Next period')).toBeNull();
  await waitFor(() => expect(screen.getAllByText('3,200').length).toBeGreaterThan(0));
  const scrubber = screen.getByTestId('Analytics trend scrubber');
  expect(scrubber).toHaveAccessibilityValue({ text: 'SEP' });
  await fireEvent(scrubber, 'accessibilityAction', { nativeEvent: { actionName: 'decrement' } });
  await fireEvent(screen.getByTestId('Analytics trend scrubber'), 'accessibilityAction', { nativeEvent: { actionName: 'decrement' } });
  await waitFor(() => expect(screen.getByTestId('Analytics trend scrubber')).toHaveAccessibilityValue({ text: 'AUG' }));
  expect(screen.getByRole('tab', { name: 'D' })).toBeTruthy();
  expect(screen.getByRole('tab', { name: 'W' })).toBeTruthy();
  expect(screen.getByRole('tab', { name: 'M' })).toBeTruthy();
  expect(screen.getByLabelText('Walking chart')).toBeTruthy();
  expect(screen.getByText('Streak')).toBeTruthy();
  expect(screen.getByText('Calories')).toBeTruthy();
  expect(screen.getByText('Distance')).toBeTruthy();
  expect(screen.getByText('Minutes')).toBeTruthy();
  expect(screen.getByText('Floors')).toBeTruthy();
  expect(screen.getByLabelText('Steps trend')).toBeTruthy();
  expect(screen.queryByRole('header', { name: 'Screen Time' })).toBeNull();
  await userEvent.press(screen.getByRole('tab', { name: 'D' }));
  expect(screen.getByLabelText('Daily steps ring')).toBeTruthy();
  await userEvent.press(screen.getByRole('tab', { name: 'M' }));
  expect(screen.getByLabelText('Monthly activity calendar')).toBeTruthy();
  runtime.dispose();
});

test('gym condition replaces Walking with Gym without a Screen Time section', async () => {
  const runtime = await mountScenario('gym-time-user');
  expect(screen.queryByRole('header', { name: 'Gym' })).toBeNull();
  expect(screen.queryByRole('header', { name: 'Walking' })).toBeNull();
  expect(screen.queryByRole('header', { name: 'Screen Time' })).toBeNull();
  expect(screen.getByLabelText('Gym chart')).toBeTruthy();
  runtime.dispose();
});

test('arrival-only gym conditions still show measured workout duration', async () => {
  const runtime = await mountScenario('gym-arrival-user');
  expect(screen.queryByRole('header', { name: 'Gym' })).toBeNull();
  expect(screen.getByLabelText('Gym chart')).toBeTruthy();
  expect(screen.getByText('minutes at the gym')).toBeTruthy();
  expect(screen.queryByText('Gym time')).toBeNull();
  runtime.dispose();
});

test('Gym stays above analytics whenever any enabled gym condition exists', async () => {
  const runtime = await mountScenario('multi-rule-overlap');
  expect(screen.queryByRole('header', { name: 'Gym' })).toBeNull();
  expect(screen.getByLabelText('Gym chart')).toBeTruthy();
  expect(screen.queryByLabelText('Walking chart')).toBeNull();
  runtime.dispose();
});

test('walking analytics offers Apple step connection when motion access is absent', async () => {
  const runtime = await mountScenario('fresh-install');
  expect(screen.getByRole('button', { name: 'Connect Apple steps' })).toBeTruthy();
  runtime.dispose();
});
