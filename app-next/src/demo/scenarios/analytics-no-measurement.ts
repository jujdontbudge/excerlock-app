import { base, history } from './base';
export const scenario21 = base('analytics-no-measurement', 'Analytics · no measurements', {
  history: history().map((d) => ({ ...d, usageMinutes: null })),
  usageMinutesToday: null,
});
