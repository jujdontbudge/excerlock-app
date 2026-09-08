import { progressContent } from '../../features/home/progressContent';
import { unlockCopy } from '../../content/unlock';
import { homeCopy } from '../../content/home';
import { scenarios } from '../scenarios';
import { Rule, WalkingSession } from '../../domain/types';

const scenario = (id: string) => scenarios.find((s) => s.id === id)!;
const render = (rule: Rule, session: WalkingSession | null, now: string) =>
  progressContent(
    rule,
    { ruleId: rule.id, day: '2026-09-07', progress: 0, met: false, metAt: null },
    scenario('treadmill-propped-credit').permissions,
    session,
    now,
    false,
  );

test('a propped session whose lease expires invites another scan instead of a silent lock', () => {
  const s = scenario('treadmill-propped-credit');
  const lapsed: WalkingSession = {
    ...s.walkingSession!,
    phase: 'ended',
    endedAt: '2026-09-07T15:15:00.000Z',
    endReason: 'leaseLapsed',
  };
  expect(render(s.rules[0], lapsed, '2026-09-07T15:16:00.000Z')).toMatchObject({
    value: 0,
    detail: unlockCopy.scanAgain,
    action: 'walk',
  });
});

test('a handheld session that ends on its lease keeps the ordinary walk invitation', () => {
  const s = scenario('walking-lease-lapse');
  const lapsed: WalkingSession = {
    ...s.walkingSession!,
    phase: 'ended',
    endedAt: '2026-09-07T15:15:00.000Z',
    endReason: 'leaseLapsed',
  };
  expect(render(s.rules[0], lapsed, '2026-09-07T15:16:00.000Z').detail).toBe(homeCopy.walkReady);
});

test('a propped session that the window ended keeps the ordinary walk invitation', () => {
  const s = scenario('treadmill-propped-credit');
  const ended: WalkingSession = {
    ...s.walkingSession!,
    phase: 'ended',
    endedAt: '2026-09-07T15:30:00.000Z',
    endReason: 'windowEnded',
  };
  expect(render(s.rules[0], ended, '2026-09-07T15:31:00.000Z').detail).toBe(homeCopy.walkReady);
});
