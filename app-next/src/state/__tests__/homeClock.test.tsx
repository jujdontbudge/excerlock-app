import type { ClockPort } from '../../ports/ClockPort';
import type { Rule, RuleDay } from '../../domain/types';
import { createHomeClockSnapshot, useHomeClock } from '../homeClock';
import { act, render } from '@testing-library/react-native';
import { Text } from 'react-native';
import { AppRuntimeProvider } from '../../runtime/AppRuntimeProvider';
import { createRuntime } from '../../runtime/createRuntime';
import { rulesStore } from '../rulesStore';
import { ruleDaysStore } from '../ruleDaysStore';
import { FakeClock } from '../../demo/clock';
import { dayKey } from '../../domain/calendar';
import { useHistory, useLockDecision, useStreak, useTodayProgress } from '../selectors';

function harness(now: string, timezone = 'UTC') {
  let instant = now;
  let zone = timezone;
  const clock: ClockPort = { now: () => instant, timezone: () => zone, subscribe: () => () => undefined };
  return {
    snapshot: createHomeClockSnapshot(clock),
    set: (next: string, nextZone = zone) => {
      instant = next;
      zone = nextZone;
    },
  };
}

const rule = (window: Rule['schedule']['window'], days: Rule['schedule']['days'] = [1]): Rule => ({
  id: 'rule',
  activity: 'walking',
  mode: { kind: 'target', activity: 'walking', metric: 'steps', goal: 5000 },
  schedule: { days, window },
  enabled: true,
  createdAt: '2026-09-01T00:00:00.000Z',
  updatedAt: '2026-09-01T00:00:00.000Z',
});

test('ordinary ticks retain snapshot identity until exact start and end boundaries', () => {
  const h = harness('2026-09-07T08:59:30.000Z');
  const rules = [rule({ kind: 'range', startMinute: 540, endMinute: 600 })];
  const rows: RuleDay[] = [];
  const first = h.snapshot(rules, rows);
  h.set('2026-09-07T08:59:59.999Z');
  expect(h.snapshot(rules, rows)).toBe(first);
  h.set('2026-09-07T09:00:00.000Z');
  const active = h.snapshot(rules, rows);
  expect(active).not.toBe(first);
  h.set('2026-09-07T09:59:59.999Z');
  expect(h.snapshot(rules, rows)).toBe(active);
  h.set('2026-09-07T10:00:00.000Z');
  expect(h.snapshot(rules, rows)).not.toBe(active);
});

test('midnight, overnight ends, DST-resolved boundaries, and fixed-timezone changes publish', () => {
  const overnight = [rule({ kind: 'range', startMinute: 1380, endMinute: 60 }, [6])];
  const noRules: Rule[] = [], noRows: RuleDay[] = [];
  const h = harness('2026-11-01T04:59:30.000Z', 'America/New_York');
  const beforeEnd = h.snapshot(overnight, noRows);
  h.set('2026-11-01T05:00:00.000Z');
  expect(h.snapshot(overnight, noRows)).not.toBe(beforeEnd);

  const beforeMidnight = h.snapshot(noRules, noRows);
  h.set('2026-11-02T05:00:00.000Z');
  expect(h.snapshot(noRules, noRows)).not.toBe(beforeMidnight);
  const fixed = h.snapshot(noRules, noRows);
  h.set('2026-11-02T05:00:00.000Z', 'UTC');
  expect(h.snapshot(noRules, noRows)).not.toBe(fixed);
});

test('metAt arbitrary-second crossings, rewinds, and new row identity invalidate', () => {
  const h = harness('2026-09-07T12:00:04.000Z');
  const rules: Rule[] = [];
  const rows: RuleDay[] = [{ ruleId: 'rule', day: '2026-09-07', progress: 5000, met: true, metAt: '2026-09-07T12:00:05.250Z' }];
  const before = h.snapshot(rules, rows);
  h.set('2026-09-07T12:00:05.249Z');
  expect(h.snapshot(rules, rows)).toBe(before);
  h.set('2026-09-07T12:00:05.250Z');
  const after = h.snapshot(rules, rows);
  expect(after).not.toBe(before);
  h.set('2026-09-07T12:00:05.249Z');
  expect(h.snapshot(rules, rows)).not.toBe(after);

  const sameTime = h.snapshot(rules, rows);
  expect(h.snapshot(rules, [...rows])).not.toBe(sameTime);
});

test('the hook does not render on ordinary ticks but fresh store facts render at the current clock', async () => {
  const runtime = createRuntime();
  await runtime.dev.load('fresh-install');
  const clock = runtime.clock as FakeClock;
  clock.set('2026-09-07T01:00:00.000Z', 'UTC');
  rulesStore.getState().patch({ rules: [rule({ kind: 'range', startMinute: 540, endMinute: 600 })] });
  let renders = 0;
  const Probe = () => {
    const snapshot = useHomeClock();
    const history = useHistory(snapshot.now);
    const decision = useLockDecision(snapshot.now);
    const progress = useTodayProgress(snapshot.now);
    useStreak(snapshot.now);
    renders++;
    const today = history.find((row) => row.day === dayKey(snapshot.now, snapshot.timezone));
    return <Text>{`${snapshot.now}|${snapshot.timezone}|${today?.day}:${today?.scheduled}|${decision.state}|${progress[0]?.row.progress ?? 'none'}`}</Text>;
  };
  const view = await render(
    <AppRuntimeProvider runtime={runtime}>
      <Probe />
    </AppRuntimeProvider>,
  );
  const mounted = renders;
  await act(() => clock.advance(30_000));
  expect(renders).toBe(mounted);
  await act(() => clock.advance(7 * 3_600_000 + 59 * 60_000 + 30_000));
  expect(view.getByText(`${runtime.clock.now()}|UTC|2026-09-07:true|locked|0`)).toBeTruthy();

  await act(() =>
    ruleDaysStore.getState().patch({
      days: [{ ruleId: 'rule', day: '2026-09-07', progress: 5000, met: true, metAt: runtime.clock.now() }],
    }),
  );
  expect(renders).toBeGreaterThan(mounted);
  expect(view.getByText(`${runtime.clock.now()}|UTC|2026-09-07:true|unlockedMet|5000`)).toBeTruthy();
  const beforeZone = renders;
  await act(() => clock.set(runtime.clock.now(), 'Pacific/Honolulu'));
  expect(renders).toBeGreaterThan(beforeZone);
  expect(view.getByText(`${runtime.clock.now()}|Pacific/Honolulu|2026-09-06:false|noRulesToday|none`)).toBeTruthy();
  await view.unmount();
  runtime.dispose();
});
