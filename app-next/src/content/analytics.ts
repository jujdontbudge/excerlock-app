import { Activity } from '../domain/types';
export const analyticsCopy = {
  title: 'Analytics',
  periods: ['Week', 'Month', 'Year'],
  previous: 'Previous period',
  next: 'Next period',
  reclaimed: 'minutes reclaimed',
  measured: (n: number, m: number) => `Measured on ${n} of ${m} days`,
  delta: (n: number) => `${n >= 0 ? '+' : ''}${Math.round(n)} min vs previous period`,
  noComparison: 'No previous measurement to compare',
  usage: 'Locked-app minutes',
  average: 'Average daily locked-app minutes',
  estimate: (n: number) => `Dashed line: your starting estimate, ${n} min/day`,
  gaps: 'Gaps mean no measurement. They are excluded from time reclaimed.',
  exercise: 'Your movement',
  activities: { walking: 'Walking', gym: 'Gym', running: 'Running', biking: 'Biking' },
  activityUnit: (a: Activity) => (a === 'walking' ? 'steps' : 'minutes'),
  daysMet: 'Days met',
  scheduled: (n: number) => `${n} scheduled`,
  current: 'Current streak',
  longest: 'Longest streak',
  days: 'days',
  recap: 'Your weekly recap',
  total: 'Total movement',
  noData: 'No measurement yet',
  noDataBody: 'Your time reclaimed will appear when locked-app usage is available.',
  dayZero: 'Your first week starts today',
  dayZeroBody: 'Every bit of movement is a start. Your progress will grow here.',
  noRules: 'Make room for movement',
  noRulesBody: 'Add a condition to start tracking your progress.',
  thisPeriod: (p: string) => `This ${p.toLowerCase()}`,
  range: (start: string, end: string) =>
    `${new Date(start + 'T12:00:00Z').toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' })} – ${new Date(end + 'T12:00:00Z').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC' })}`,
  point: (day: string, period: string) =>
    new Date(day + 'T12:00:00Z').toLocaleDateString('en-US', {
      timeZone: 'UTC',
      ...(period === 'Week'
        ? { weekday: 'short' }
        : period === 'Year'
          ? { month: 'short' }
          : { month: 'short', day: 'numeric' }),
    }),
  noMeasurement: 'No measurement',
} as const;
