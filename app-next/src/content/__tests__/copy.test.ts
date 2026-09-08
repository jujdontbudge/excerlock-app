import { readFileSync } from 'fs';
import { join } from 'path';
import { analyticsCopy } from '../analytics';

const timeBank = /earned time|time bank|earn(ed|s)? (back )?minutes|allowance/i;

function strings(value: unknown): string[] {
  if (typeof value === 'string') return [value];
  if (typeof value === 'function') return [];
  if (Array.isArray(value)) return value.flatMap(strings);
  if (value && typeof value === 'object') return Object.values(value).flatMap(strings);
  return [];
}

test('no Analytics copy uses time-bank vocabulary', () => {
  expect(strings(analyticsCopy).filter((line) => timeBank.test(line))).toEqual([]);
});

const analyticsScreen = () => readFileSync(join(__dirname, '../../features/analytics/AnalyticsScreen.tsx'), 'utf8');

test('the Analytics screen source carries no time-bank vocabulary', () => {
  expect(analyticsScreen()).not.toMatch(timeBank);
});

test('the Analytics screen takes its copy props from the content file', () => {
  const copyProps = /\b(title|label|body|subtitle|support|value|accessibilityLabel)="/g;
  expect(analyticsScreen().match(copyProps) ?? []).toEqual([]);
});
