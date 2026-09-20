import { taskMotion, PLAN_MOTION } from '../planMotion';
test('completion holds before the pill exits toward the upper-right corner', () => {
  expect(taskMotion(0, 500).checked).toBe(false);
  expect(taskMotion(0, 700).checked).toBe(true);
  expect(taskMotion(0, 700).exit).toBe(0);
  expect(taskMotion(0, 1000).exit).toBeGreaterThan(0);
  expect(taskMotion(0, 1200).exit).toBe(1);
  expect(taskMotion(1, 1400).slot).toBe(0);
});
test('100% holds visibly before celebration covers and then reveals the summary', () => {
  expect(PLAN_MOTION.ready).toBeGreaterThan(PLAN_MOTION.count);
  expect(PLAN_MOTION.covered).toBeLessThan(PLAN_MOTION.fade);
  expect(PLAN_MOTION.fade).toBeLessThan(PLAN_MOTION.done);
});
