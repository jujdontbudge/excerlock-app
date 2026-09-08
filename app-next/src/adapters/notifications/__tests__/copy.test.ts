import { notificationCopy as c } from '../../../content/notifications';

const lines = [
  ...[1, 2, 3, 7].map((days) => ({ title: c.trial.title(days), body: c.trial.body })),
  c.lease.handheld,
  c.lease.propped,
];

test.each(lines)('"%s" fits the lock screen: title ≤ 35, body ≤ 90', ({ title, body }) => {
  expect(title.length).toBeLessThanOrEqual(c.titleMax);
  expect(body.length).toBeLessThanOrEqual(c.bodyMax);
});

test('the copy is payoff-first and free of hype or guilt', () => {
  for (const { title, body } of lines) {
    expect(`${title} ${body}`).not.toMatch(/!/);
    expect(`${title} ${body}`).not.toMatch(/\b(don't miss|hurry|last chance|missed|failed)\b/i);
  }
  expect(c.trial.title(1)).toBe('Your free trial ends tomorrow');
  expect(c.trial.title(2)).toBe('Your free trial ends in 2 days');
  expect(c.lease.propped.title).toBe('Scan again to keep counting');
});
