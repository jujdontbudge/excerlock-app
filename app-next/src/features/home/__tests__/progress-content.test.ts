import { createDraft, toRule } from '../../rules/draft';
import { progressContent } from '../progressContent';
import { homeCopy } from '../../../content/home';
import { inactiveWalkingStatus } from '../../../ports/WalkingPort';

const schedule = { days: [1, 2, 3, 4, 5], window: { kind: 'allDay' } } as const;
const granted = { screenTime: 'granted', motion: 'granted', location: 'whenInUse', camera: 'granted', notifications: 'granted' } as const;
const today = (ruleId: string) => ({ ruleId, day: '2026-09-07', progress: 0, met: false, metAt: null });

test('"Be at the gym" reads as gym presence and checks in at the gym, not as walking', () => {
  const rule = toRule(createDraft('gym'), { ...schedule, days: [...schedule.days] });
  const model = progressContent(rule, today(rule.id), granted, inactiveWalkingStatus, false);
  expect(model).toMatchObject({ title: 'Be at the gym', detail: homeCopy.gymReady, action: 'checkin' });
});

test('walking while unlocked keeps the walking card', () => {
  const rule = toRule({ ...createDraft('walking'), walkingMode: 'state' }, { ...schedule, days: [...schedule.days] });
  expect(progressContent(rule, today(rule.id), granted, inactiveWalkingStatus, false)).toMatchObject({ detail: homeCopy.walkReady, action: 'walk' });
});
