import { render, screen, userEvent, waitFor } from '@testing-library/react-native';
import { AnalyticsScreen } from '../AnalyticsScreen';
import { createRuntime } from '../../../runtime/createRuntime';
import { AppRuntimeProvider } from '../../../runtime/AppRuntimeProvider';

async function mountScenario(id: string) {
  const runtime = createRuntime();
  await runtime.dev.load(id);
  await render(<AppRuntimeProvider runtime={runtime}><AnalyticsScreen /></AppRuntimeProvider>);
  return runtime;
}

test('walking analytics uses D/W/M periods and always pairs movement with Screen Time', async () => {
  const runtime = await mountScenario('home-locked-walking');
  expect(screen.getByRole('header', { name: 'Walking' })).toBeTruthy();
  expect(screen.getByRole('header', { name: 'Screen Time' })).toBeTruthy();
  expect(screen.getByLabelText('Walking chart')).toBeTruthy();
  expect(screen.getByLabelText('Screen Time chart')).toBeTruthy();
  await waitFor(() => expect(screen.getAllByText('3,200').length).toBeGreaterThan(0));
  await userEvent.press(screen.getByRole('tab', { name: 'M' }));
  expect(screen.getByText('This month')).toBeTruthy();
  expect(screen.getByLabelText('Monthly activity calendar')).toBeTruthy();
  await userEvent.press(screen.getByRole('tab', { name: 'D' }));
  expect(screen.getAllByText('Today').length).toBeGreaterThan(0);
  runtime.dispose();
});

test('gym condition replaces Walking with Gym and keeps Screen Time', async () => {
  const runtime = await mountScenario('gym-time-user');
  expect(screen.getByRole('header', { name: 'Gym' })).toBeTruthy();
  expect(screen.queryByRole('header', { name: 'Walking' })).toBeNull();
  expect(screen.getByRole('header', { name: 'Screen Time' })).toBeTruthy();
  expect(screen.getByLabelText('Gym chart')).toBeTruthy();
  runtime.dispose();
});

test('arrival-only gym conditions still show measured workout duration', async () => {
  const runtime = await mountScenario('gym-arrival-user');
  expect(screen.getByRole('header', { name: 'Gym' })).toBeTruthy();
  expect(screen.getByText('Gym time')).toBeTruthy();
  expect(screen.getByText('minutes at the gym')).toBeTruthy();
  expect(screen.queryByText('Visits')).toBeNull();
  expect(screen.queryByText('gym visits')).toBeNull();
  runtime.dispose();
});

test('Gym stays above analytics whenever any enabled gym condition exists', async () => {
  const runtime = await mountScenario('multi-rule-overlap');
  expect(screen.getByRole('header', { name: 'Gym' })).toBeTruthy();
  expect(screen.queryByRole('header', { name: 'Walking' })).toBeNull();
  runtime.dispose();
});

test('walking analytics offers Apple step connection when motion access is absent', async () => {
  const runtime = await mountScenario('fresh-install');
  expect(screen.getByRole('button', { name: 'Connect Apple steps' })).toBeTruthy();
  runtime.dispose();
});
