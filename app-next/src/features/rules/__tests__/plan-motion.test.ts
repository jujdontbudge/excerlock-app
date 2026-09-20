import { taskMotion, PLAN_MOTION } from '../planMotion';
test('100% holds, then the whole loading screen fades out as one piece', () => {
  expect(PLAN_MOTION.ready).toBe(PLAN_MOTION.count);
  expect(PLAN_MOTION.hold).toBeGreaterThan(0);
  expect(PLAN_MOTION.hold).toBeLessThan(300);
  expect(PLAN_MOTION.fadeout).toBeLessThanOrEqual(200);
});
test('pills fade out in place and the stack closes the gap behind them', () => {
  expect(taskMotion(0, 100).checked).toBe(false);
  expect(taskMotion(0, 200).checked).toBe(true);
  expect(taskMotion(0, 390).exit).toBe(0);
  expect(taskMotion(0, 460).exit).toBeGreaterThan(0);
  expect(taskMotion(0, 700).exit).toBe(1);
  expect(taskMotion(1, 549).slot).toBe(1);
  expect(taskMotion(1, 900).slot).toBe(0);
  expect(taskMotion(1, 900).checked).toBe(false);
  expect(taskMotion(1, 1100).checked).toBe(true);
});
test('the celebration sequence mirrors the reference replay', () => {
  expect(PLAN_MOTION.gap).toBeGreaterThan(0);
  expect(PLAN_MOTION.badgeIn).toBeGreaterThan(PLAN_MOTION.gap);
  expect(PLAN_MOTION.burst).toBeGreaterThan(PLAN_MOTION.badgeIn + 300);
  expect(PLAN_MOTION.covered).toBeGreaterThan(PLAN_MOTION.burst);
  expect(PLAN_MOTION.covered - PLAN_MOTION.burst).toBeLessThanOrEqual(300);
  expect(PLAN_MOTION.reveal).toBeGreaterThan(PLAN_MOTION.covered);
  expect(PLAN_MOTION.done).toBeGreaterThan(PLAN_MOTION.reveal);
});
