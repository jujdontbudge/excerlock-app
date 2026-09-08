import { render, screen, userEvent } from '@testing-library/react-native';
import { AnalyticsScreen } from '../AnalyticsScreen';
import { createRuntime } from '../../../runtime/createRuntime';
import { AppRuntimeProvider } from '../../../runtime/AppRuntimeProvider';
import { rulesStore } from '../../../state/rulesStore';
import { ruleDaysStore } from '../../../state/ruleDaysStore';
import { historyStore } from '../../../state/historyStore';
import { HistoryDay } from '../../../ports/models';
import { analyticsCopy as c } from '../../../content/analytics';

const TODAY = '2026-09-07';
// The fake runtime owns today's measurement: `home-locked-walking` reports 42 locked-app minutes today.
const TODAY_USAGE = 42;

const sealedDay = (day: string, usageMinutes: number | null, scheduled = true, met = true): HistoryDay => ({
  day,
  usageMinutes,
  scheduled,
  met,
  activity: { walking: met ? 5000 : 1000, gym: 0, running: 0, biking: 0 },
  sealedAt: `${day}T23:59:59.000Z`,
});

/**
 * Analytics reads the sealed history store. Today's row is always recomputed from the live rule days,
 * so a fixture that says today was met has to say it where the app reads that fact.
 */
async function renderAnalytics(days: HistoryDay[]) {
  const runtime = createRuntime();
  await runtime.dev.load('home-locked-walking');
  const today = days.find((day) => day.day === TODAY);
  ruleDaysStore.getState().patch({
    days: today
      ? [{ ruleId: 'walk', day: TODAY, progress: today.met ? 5000 : 1000, met: today.met, metAt: today.met ? `${TODAY}T15:00:00.000Z` : null }]
      : [],
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
  // Both scenarios seed their own unmeasured history; nothing here needs to stand in for it.
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
  let rendered = await renderAnalytics([sealedDay('2026-08-31', 120), sealedDay(TODAY, TODAY_USAGE)]);
  expect(screen.getAllByText(c.delta(120 - TODAY_USAGE)).length).toBeGreaterThan(0);
  rendered.view.unmount();
  rendered.runtime.dispose();

  rendered = await renderAnalytics([sealedDay(TODAY, TODAY_USAGE)]);
  expect(screen.getAllByText('No previous measurement to compare').length).toBeGreaterThan(0);
  rendered.runtime.dispose();
});

test('Analytics renders its three stat tiles and the onboarding estimate baseline', async () => {
  const { runtime } = await renderAnalytics([sealedDay(TODAY, TODAY_USAGE)]);

  expect(screen.getAllByText(c.daysMet).length).toBeGreaterThan(0);
  expect(screen.getAllByText(c.current).length).toBeGreaterThan(0);
  expect(screen.getByText(c.longest)).toBeTruthy();
  expect(screen.getAllByText('1 of 1').length).toBeGreaterThan(0);
  expect(screen.getByText(c.estimate(180))).toBeTruthy();
  runtime.dispose();
});

test('the weekly period includes the specified recap rows', async () => {
  const { runtime } = await renderAnalytics([sealedDay('2026-08-31', 120), sealedDay(TODAY, TODAY_USAGE)]);
  expect(screen.getByRole('header', { name: c.recap })).toBeTruthy();
  expect(screen.getAllByText(c.daysMet).length).toBeGreaterThan(0);
  expect(screen.getAllByText(c.current).length).toBeGreaterThan(0);
  runtime.dispose();
});

test('the streak tile is current at the selected period end and period facts page independently', async () => {
  const { runtime } = await renderAnalytics([
    sealedDay('2026-08-31', 90),
    sealedDay('2026-09-01', 90, true, false),
    sealedDay('2026-09-02', 90),
    sealedDay('2026-09-03', 90),
    sealedDay(TODAY, TODAY_USAGE),
  ]);

  expect(screen.getAllByText(c.current).length).toBeGreaterThan(0);
  await userEvent.press(screen.getByLabelText(c.previous));
  expect(screen.getAllByText('2 days').length).toBeGreaterThan(0);
  expect(screen.getAllByText('3 of 4').length).toBeGreaterThan(0);
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
  const { runtime } = await renderAnalytics([sealedDay(TODAY, TODAY_USAGE)]);
  expect(screen.getByRole('header', { name: c.exercise })).toBeTruthy();
  expect(screen.queryByText(/earned/i)).toBeNull();
  runtime.dispose();
});
