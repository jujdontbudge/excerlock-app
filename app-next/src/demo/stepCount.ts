import { FakeContext } from './FakeContext';
import { dayKey } from '../domain/calendar';
/** One source for the fake pedometer and today's Analytics activity. */
export function stepCount(ctx: FakeContext): number {
  const now = ctx.clock.now(),
    today = dayKey(now, ctx.clock.timezone()),
    override = ctx.snapshot().stepsOverride;
  if (override?.day === today) return override.value;
  if (dayKey(ctx.scenario.clock.now, ctx.clock.timezone()) !== today) return 0;
  return (
    ctx.scenario.steps.today +
    Math.floor(Math.max(0, Date.parse(now) - Date.parse(ctx.scenario.clock.now)) / 1000) *
      (ctx.scenario.steps.autoIncrementPerSecond ?? 0)
  );
}
