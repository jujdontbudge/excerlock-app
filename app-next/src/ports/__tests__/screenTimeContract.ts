import { ApplyResult, ScreenTimePort } from '../ScreenTimePort';
import { LockDecision } from '../../domain/types';
import { MonitorPlan } from '../../domain/monitorPlan';

type Subject = { port: ScreenTimePort; dispose: () => void };

const locked: LockDecision = {
  state: 'locked',
  activeRuleIds: ['walk'],
  nextUnlockHint: { ruleId: 'walk', action: 'progress', remaining: 5000, goal: 5000, unit: 'steps' },
};
const open: LockDecision = { state: 'noRulesToday', nextLockAt: null };
const plan = (truncatedAt: string | null = null): MonitorPlan => ({
  monitors: [
    {
      name: 'window',
      start: '2026-09-07T09:00:00.000Z',
      end: '2026-09-07T21:00:00.000Z',
      ruleIds: ['walk'],
      timezone: 'UTC',
      repeats: false,
    },
  ],
  horizonEnd: '2026-09-07T21:00:00.000Z',
  truncatedAt,
  planHash: truncatedAt ? 'truncated' : 'complete',
});

export function describeScreenTimePort(make: () => Promise<Subject>) {
  describe('ScreenTimePort contract', () => {
    let subject: Subject;
    beforeEach(async () => {
      subject = await make();
    });
    afterEach(() => subject.dispose());

    test('applyLock reports shields, monitor count, and observable enforcement', async () => {
      const observed: string[] = [];
      const stop = subject.port.observeEnforcement((result) => observed.push(result.shields));
      await expect(subject.port.applyLock(locked, plan())).resolves.toEqual({
        applied: true,
        shields: 'up',
        monitors: 1,
      });
      await expect(subject.port.applyLock(open, plan())).resolves.toEqual({
        applied: true,
        shields: 'down',
        monitors: 1,
      });
      expect(observed).toEqual(['up', 'down']);
      stop();
    });

    test('an over-budget plan fails closed with shields up', async () => {
      await expect(subject.port.applyLock(open, plan('2026-09-08T09:00:00.000Z'))).resolves.toEqual({
        applied: false,
        shields: 'up',
        monitors: 1,
        reason: 'monitorBudget',
      });
    });

    test('reapplying the same decision and plan is idempotent', async () => {
      const observed: ApplyResult[] = [];
      const stop = subject.port.observeEnforcement((result) => observed.push(result));
      await subject.port.applyLock(locked, plan());
      await subject.port.applyLock(locked, plan());
      expect(observed).toHaveLength(1);
      stop();
    });

    test('describeSelection returns an opaque selection and a null handle is always empty', async () => {
      const selection = await subject.port.describeSelection();
      expect(selection).toEqual({
        handle: selection.handle === null ? null : { token: expect.any(String) },
        appCount: expect.any(Number),
        categoryCount: expect.any(Number),
      });
      expect(selection.appCount).toBeGreaterThanOrEqual(0);
      expect(selection.categoryCount).toBeGreaterThanOrEqual(0);
      if (selection.handle === null) expect(selection.appCount + selection.categoryCount).toBe(0);
    });
  });
}
