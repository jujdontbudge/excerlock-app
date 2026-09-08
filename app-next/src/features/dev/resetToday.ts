import { dayKey } from '../../domain/calendar';
import { historyStore } from '../../state/historyStore';
import { ruleDaysStore } from '../../state/ruleDaysStore';

/** Only what deciding "today" needs; the dev menu passes the runtime's clock. */
export type TodayClock = { now(): string; timezone(): string };

/**
 * Puts the day back to how it started, so a device test can be run again without reinstalling.
 *
 * The runbook walks the same scenario several times in an afternoon — meet a goal, watch the shield
 * clear, relock — and the second run is impossible once the day is met. Reinstalling would take the
 * Screen Time authorization and the whole session with it, so this clears the day instead.
 *
 * Only today. Yesterday's rows are the evidence a previous scenario produced, and several checks in
 * the runbook read them back. Today's history row is zeroed rather than dropped, because `scheduled`
 * says the rules covered the day and that is still true.
 *
 * Enforcement re-applies on its own: it subscribes to both stores.
 */
export function resetTodaysProgress(clock: TodayClock): void {
  const today = dayKey(clock.now(), clock.timezone());
  const { days, earnedUnlocks } = ruleDaysStore.getState().data;
  ruleDaysStore.getState().patch({
    days: days.filter((row) => row.day !== today),
    earnedUnlocks: earnedUnlocks.filter((earned) => earned.day !== today),
    walkingSession: null,
  });
  const history = historyStore.getState().data.days;
  if (!history.some((row) => row.day === today)) return;
  historyStore.getState().patch({
    days: history.map((row) =>
      row.day === today
        ? { ...row, usageMinutes: null, activity: { walking: 0, gym: 0, running: 0, biking: 0 }, met: false }
        : row,
    ),
  });
}
