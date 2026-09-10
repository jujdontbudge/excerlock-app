import { projectStepHistory } from '../projectStepHistory';
import { rule } from './fixtures';
import type { Rule } from '../types';
test('historical steps credit enabled step targets without crediting minutes or state', () => {
  const variants: Rule[] = [rule, { ...rule, id: 'minutes', mode: { kind: 'target', activity: 'walking', metric: 'minutes', goal: 30 } }, { ...rule, id: 'state', mode: { kind: 'state', activity: 'walking' } }, { ...rule, id: 'paused', enabled: false }];
  const rows = projectStepHistory(variants, [], { '2026-09-07': 6000 }, 'UTC', '2026-09-07T08:00:00Z');
  expect(rows).toEqual([{ ruleId: rule.id, day: '2026-09-07', progress: 6000, met: true, metAt: '2026-09-07T08:00:00Z' }]);
});
test('reprojection is idempotent and preserves existing earned timestamp and unrelated rows', () => {
  const observed = '2026-09-07T08:00:00Z';
  const initial = projectStepHistory([rule], [{ ruleId: 'gym', day: '2026-09-07', progress: 30, met: true, metAt: observed }], { '2026-09-07': 6000 }, 'UTC', observed);
  expect(projectStepHistory([rule], initial, { '2026-09-07': 6000 }, 'UTC', '2026-09-07T09:00:00Z')).toEqual(initial);
});
