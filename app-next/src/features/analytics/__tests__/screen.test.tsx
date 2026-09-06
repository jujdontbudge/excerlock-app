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
  expect(screen.getByText('Gaps mean no measurement. They are excluded from time reclaimed.')).toBeTruthy();
  await userEvent.press(screen.getByRole('tab', { name: 'Month' }));
  expect(screen.getByText('This month')).toBeTruthy();
  expect(screen.queryByText('Your weekly recap')).toBeNull();
});
