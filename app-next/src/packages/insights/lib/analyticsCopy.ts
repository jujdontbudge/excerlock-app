import { Activity } from '../../model/types';
const date = (day: string, options: Intl.DateTimeFormatOptions) =>
  new Date(day + 'T12:00:00Z').toLocaleDateString('en-US', { timeZone: 'UTC', ...options });
export const analyticsCopy = {
  metricTitles: { walking: 'Steps', gym: 'Time in gym' },
  chooseMetric: 'Show activity',
  changeMetric: (title: string) => `${title}, change activity`,
  periods: ['D', 'W', 'M'],
  periodIds: { D: 'Day', W: 'Week', M: 'Month' } as const,
  previous: 'Previous period',
  next: 'Next period',
  replaced: 'Screen time replaced',
  replacedSupport: (baselineMinutes: number, period: string) =>
    period === 'Day'
      ? `Against your ${Math.round(baselineMinutes / 60)}h starting estimate`
      : 'Against your starting screen time',
  chart: 'Screen time replaced chart',
  monthTrendHint: 'Shows the latest eight weeks. Drag to highlight a week.',
  chartAverage: (n: number) => `${Math.round(n)}m a day on average`,
  weekDots: 'Days met this week',
  measured: (n: number, m: number) => `Measured on ${n} of ${m} days`,
  delta: (n: number) => `${n >= 0 ? '+' : ''}${Math.round(n)} min vs previous period`,
  noComparison: 'No previous measurement to compare',
  usage: 'Locked-app minutes',
  average: 'Average daily locked-app minutes',
  estimate: (n: number) => `Dashed line: your starting estimate, ${n} min/day`,
  gaps: 'Gaps mean no measurement. They are excluded from time reclaimed.',
  exercise: 'Your movement',
  activities: { walking: 'Walking', gym: 'Gym' },
  activityUnit: (a: Activity) => (a === 'walking' ? 'steps' : 'minutes'),
  tiles: {
    gymMinutes: 'At the gym',
    gymArrival: 'Gym arrivals',
    steps: 'Steps',
    walking: 'Walking',
    streak: 'Streak',
  },
  arrivals: (n: number) => (n === 1 ? '1 check-in' : `${n} check-ins`),
  best: (n: number) => `Best ${n} ${n === 1 ? 'day' : 'days'}`,
  daysMet: (met: number, scheduled: number) => `${met} of ${scheduled} scheduled days met`,
  scheduled: (n: number) => `${n} scheduled`,
  current: 'Current streak',
  longest: 'Longest streak',
  days: 'days',
  dayUnit: (n: number) => (n === 1 ? 'day' : 'days'),
  recap: 'Your weekly recap',
  total: 'Total movement',
  earned: 'How you earned time',
  noData: 'No measurement yet',
  noDataBody: 'Your screen time replaced will appear when locked-app usage is available.',
  dayZero: 'Your first week starts today',
  dayZeroBody: 'Every bit of movement is a start. Your progress will grow here.',
  noRules: 'Make room for movement',
  noRulesBody: 'Add a condition to start tracking your progress.',
  thisPeriod: (p: string) => (p === 'Day' ? 'Today' : p === 'Week' ? 'This week' : 'This month'),
  range: (start: string, end: string) =>
    start === end
      ? date(start, { weekday: 'short', month: 'short', day: 'numeric' })
      : `${date(start, { month: 'short', day: 'numeric' })} – ${date(end, { month: 'short', day: 'numeric', year: 'numeric' })}`,
  since: (start: string) => `Since ${date(start, { month: 'short', day: 'numeric', year: 'numeric' })}`,
  point: (day: string, period: string) =>
    period === 'Month' ? date(day, { day: 'numeric' }) : date(day, { weekday: 'short' }),
  noMeasurement: 'No measurement',
} as const;
