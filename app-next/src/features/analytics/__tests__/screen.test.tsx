import { render, screen, userEvent } from '@testing-library/react-native';
import { AnalyticsScreen } from '../AnalyticsScreen';
import { createRuntime } from '../../../runtime/createRuntime';
import { AppRuntimeProvider } from '../../../runtime/AppRuntimeProvider';
import { rulesStore } from '../../../state/rulesStore';
import { ruleDaysStore } from '../../../state/ruleDaysStore';
import { historyStore } from '../../../state/historyStore';
import { startProgressSync } from '../../home/progressSync';
import { HistoryDay } from '../../../ports/models';
import { analyticsCopy as c } from '../../../content/analytics';

/** Analytics reads sealed history rows, the ledger `sealDay` writes. */
const persistedDay = (day: string, usageMinutes: number | null, scheduled = true, met = true): HistoryDay => ({
  day,
  usageMinutes,
  scheduled,
  met,
  sealedAt: `${day}T23:59:59.000Z`,
  activity: { walking: met ? 5000 : 1000, gym: 0, running: 0, biking: 0 },
});

/**
 * Sealed rows are the caller's to choose; today is live, so its measurement is the scenario's own
 * 42 minutes and its met flag follows today's rule row.
 */
async function renderAnalytics(days: HistoryDay[], todayMet = false) {
  const runtime = createRuntime();
  await runtime.dev.load('home-locked-walking');
  if (todayMet)
    ruleDaysStore.getState().patch({
      days: [{ ruleId: 'walk', day: '2026-09-07', progress: 5000, met: true, metAt: '2026-09-07T14:00:00.000Z' }],
    });
  historyStore.getState().patch({ days });
  const view = await render(
    <AppRuntimeProvider runtime={runtime}>
      <AnalyticsScreen />
    </AppRuntimeProvider>,
  );
  return { runtime, view };
}
test.each([
  ['analytics-day-zero', 'Your first week starts today'],
  ['analytics-no-measurement', 'No measurement yet'],
])('%s reports unavailable measurements honestly', async (id, title) => {
  const runtime = createRuntime();
  await runtime.dev.load(id);
  historyStore
    .getState()
    .patch({ days: id === 'analytics-day-zero' ? [] : [persistedDay('2026-09-01', null, true, false)] });
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
test('a measured previous period renders the delta and a missing one renders no comparison', async () => {
  let rendered = await renderAnalytics([persistedDay('2026-08-31', 120)]);
  expect(screen.getAllByText('+78 min vs previous period').length).toBeGreaterThan(0);
  rendered.view.unmount();
  rendered.runtime.dispose();

  rendered = await renderAnalytics([]);
  expect(screen.getAllByText('No previous measurement to compare').length).toBeGreaterThan(0);
  rendered.runtime.dispose();
});

test('Analytics renders its three stat tiles and the onboarding estimate baseline', async () => {
  const { runtime } = await renderAnalytics([], true);

  expect(screen.getAllByText(c.daysMet).length).toBeGreaterThan(0);
  expect(screen.getAllByText(c.current).length).toBeGreaterThan(0);
  expect(screen.getByText(c.longest)).toBeTruthy();
  expect(screen.getAllByText('1 of 1').length).toBeGreaterThan(0);
  expect(screen.getByText(c.estimate(180))).toBeTruthy();
  runtime.dispose();
});

test('the weekly period includes the specified recap rows', async () => {
  const { runtime } = await renderAnalytics([persistedDay('2026-08-31', 120)]);
  expect(screen.getByRole('header', { name: c.recap })).toBeTruthy();
  expect(screen.getAllByText(c.daysMet).length).toBeGreaterThan(0);
  expect(screen.getAllByText(c.current).length).toBeGreaterThan(0);
  runtime.dispose();
});

test('the streak tile is current at the selected period end and period facts page independently', async () => {
  const { runtime } = await renderAnalytics([
    persistedDay('2026-08-31', 90),
    persistedDay('2026-09-01', 90, true, false),
    persistedDay('2026-09-02', 90),
    persistedDay('2026-09-03', 90),
  ]);

  expect(screen.getAllByText(c.current).length).toBeGreaterThan(0);
  await userEvent.press(screen.getByLabelText(c.previous));
  expect(screen.getAllByText('2 days').length).toBeGreaterThan(0);
  // Friday 2026-09-04 has no row, so sealing writes it as a missed scheduled day: five scheduled, three met.
  expect(screen.getAllByText('3 of 5').length).toBeGreaterThan(0);
  runtime.dispose();
});

test('with zero conditions Analytics renders the no-conditions empty state and no charts', async () => {
  const runtime = createRuntime();
  await runtime.dev.load('home-locked-walking');
  rulesStore.getState().patch({ rules: [] });
  await render(
    <AppRuntimeProvider runtime={runtime}>
      <AnalyticsScreen />
    </AppRuntimeProvider>,
  );

  expect(screen.getByRole('header', { name: c.noRules })).toBeTruthy();
  expect(screen.queryByLabelText('Screen time and time reclaimed chart')).toBeNull();
  runtime.dispose();
});

test("no Analytics string contains 'earned'", async () => {
  const { runtime } = await renderAnalytics([]);
  expect(screen.getByRole('header', { name: c.exercise })).toBeTruthy();
  expect(screen.queryByText(/earned/i)).toBeNull();
  runtime.dispose();
});

test('gym dwell reaches Analytics through progressSync, the single applier', async () => {
  const runtime = createRuntime();
  await runtime.dev.load('gym-time-user');
  const stopSync = startProgressSync(runtime);
  await runtime.gym.checkIn(runtime.gym.listPlaces()[0].id);
  runtime.dev.advance(18 * 60000 + 9000);
  await render(
    <AppRuntimeProvider runtime={runtime}>
      <AnalyticsScreen />
    </AppRuntimeProvider>,
  );

  expect(screen.getByRole('header', { name: c.exercise })).toBeTruthy();
  expect(screen.getAllByText('Time reclaimed').length).toBeGreaterThan(0);
  expect(screen.getByLabelText('Screen time and time reclaimed chart')).toBeTruthy();
  stopSync();
  runtime.dispose();
});
