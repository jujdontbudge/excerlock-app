import { createDraft, toRule } from '../../rules/draft';
import { gymUnlockSubline, unlockKind } from '../entry';

const schedule = { days: [1, 2, 3, 4, 5], window: { kind: 'range', startMinute: 540, endMinute: 1260 } } as const;
const gym = (gymMode: 'arrival' | 'presence' | 'time') => toRule({ ...createDraft('gym'), gymMode }, { ...schedule, days: [...schedule.days] });

test('every gym condition, including "Be at the gym", checks in at the gym', () => {
  expect(unlockKind(gym('arrival'))).toBe('gym');
  expect(unlockKind(gym('presence'))).toBe('gym');
  expect(unlockKind(gym('time'))).toBe('gym');
  expect(unlockKind(toRule(createDraft('walking'), { ...schedule, days: [...schedule.days] }))).toBeNull();
});

test('the gym unlock subline matches what each gym condition grants', () => {
  expect(gymUnlockSubline(gym('arrival'), '9 PM')).toBe('Unlocked until 9 PM');
  expect(gymUnlockSubline(gym('presence'), '9 PM')).toBe("Unlocked while you're at the gym");
  expect(gymUnlockSubline(gym('time'), '9 PM')).toBe('Your gym time is counting');
});
