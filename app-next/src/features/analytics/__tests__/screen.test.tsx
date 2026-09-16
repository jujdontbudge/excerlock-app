import { render, screen, userEvent } from '@testing-library/react-native';
import { AnalyticsScreen } from '../AnalyticsScreen';
import { createRuntime } from '../../../runtime/createRuntime';
import { AppRuntimeProvider } from '../../../runtime/AppRuntimeProvider';
test.each([
  ['analytics-day-zero', 'Your first week starts today'],
  ['analytics-no-measurement', 'No measurement yet'],
])('%s reports unavailable measurements honestly', async (id, title) => {
  const runtime = createRuntime();
  await runtime.dev.load(id);
  await render(
    <AppRuntimeProvider runtime={runtime}>
      <AnalyticsScreen />
    </AppRuntimeProvider>,
  );
  expect(screen.getByRole('header', { name: title })).toBeTruthy();
  await userEvent.press(screen.getByRole('tab', { name: 'All time' }));
  expect(screen.getByText(/^Since /)).toBeTruthy();
  await userEvent.press(screen.getByRole('tab', { name: 'Day' }));
  expect(screen.getByText('Today')).toBeTruthy();
  expect(screen.getByLabelText('Days met this week')).toBeTruthy();
  expect(screen.queryByText('Your weekly recap')).toBeNull();
});
test('tiles follow the gym-minutes condition as the fake gym clock ticks', async () => {
  const runtime = createRuntime();
  await runtime.dev.load('gym-time-user');
  await runtime.gym.checkIn(runtime.gym.listPlaces()[0].id);
  runtime.dev.advance(18 * 60000 + 9000);
  await render(
    <AppRuntimeProvider runtime={runtime}>
      <AnalyticsScreen />
    </AppRuntimeProvider>,
  );
  expect(screen.getByLabelText(/^At the gym, 30m/)).toBeTruthy();
  expect(screen.getByLabelText(/^Streak, /)).toBeTruthy();
  expect(screen.queryByLabelText(/^Gym arrivals/)).toBeNull();
  expect(screen.queryByLabelText(/^Steps, /)).toBeNull();
  expect(screen.getByRole('header', { name: 'How you earned time' })).toBeTruthy();
  expect(screen.getByText('30 minutes')).toBeTruthy();
  expect(screen.getAllByText('Screen time replaced').length).toBeGreaterThan(0);
  expect(screen.getByLabelText('Screen time replaced chart')).toBeTruthy();
  runtime.dispose();
});
test('an arrival condition shows check-ins instead of gym minutes', async () => {
  const runtime = createRuntime();
  await runtime.dev.load('gym-arrival-user');
  await render(
    <AppRuntimeProvider runtime={runtime}>
      <AnalyticsScreen />
    </AppRuntimeProvider>,
  );
  expect(screen.getByLabelText(/^Gym arrivals, /)).toBeTruthy();
  runtime.dispose();
});
