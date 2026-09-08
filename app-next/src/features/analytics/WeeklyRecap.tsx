import { Activity } from '../../domain/types';
import { CompactGroup, CompactRow } from '../../design-system/CompactGroup';
import { analyticsCopy as c } from '../../content/analytics';

type RecapModel = {
  activities: Record<Activity, number>;
  delta: number;
  met: number;
  previous: { measuredDays: number };
  reclaimed: { minutes: number };
  scheduled: number;
  streak: { current: number };
};

export function WeeklyRecap({ model }: { model: RecapModel }) {
  const activities = (Object.keys(c.activities) as Activity[]).filter((activity) => model.activities[activity] > 0);
  return (
    <CompactGroup title={c.recap}>
      <CompactRow
        icon="clock"
        title={c.timeReclaimed}
        value={c.duration(model.reclaimed.minutes)}
        subtitle={model.previous.measuredDays ? c.delta(model.delta) : c.noComparison}
      />
      <CompactRow icon="chart" title={c.daysMet} value={c.metOfScheduled(model.met, model.scheduled)} />
      {activities.map((activity) => (
        <CompactRow
          key={activity}
          icon={activity}
          title={c.activities[activity]}
          value={c.activityTotal(activity, model.activities[activity])}
        />
      ))}
      <CompactRow icon="flame" title={c.current} value={c.streakDays(model.streak.current)} />
    </CompactGroup>
  );
}
