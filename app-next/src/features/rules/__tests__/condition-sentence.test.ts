import { conditionSentence } from '../conditionSentence';
import { draftFromAnswers } from '../answersDraft';
import { Answers } from '../../../onboarding/types';
import { toSchedule, scheduleDraft } from '../scheduleDraft';
const say = (answers: Answers, schedule?: ReturnType<typeof toSchedule>) =>
  conditionSentence(answers, draftFromAnswers(answers), { schedule, goalChosen: false });
test('the sentence reads from the draft default before the first dependency is chosen', () => {
  expect(say({ activity: 'gym' })).toBe('Your apps are blocked until you spend _____ at the gym');
  expect(say({ activity: 'walking' })).toBe('Your apps are blocked until you walk _____ steps');
});
test('a duration condition blanks the amount until the goal question is answered', () => {
  expect(say({ activity: 'gym', gymMode: 'time' })).toBe('Your apps are blocked until you spend _____ at the gym');
  expect(say({ activity: 'gym', gymMode: 'time', gymMinutes: '45' })).toBe(
    'Your apps are blocked until you spend 45 minutes at the gym',
  );
});
test('each activity phrases its own condition', () => {
  expect(say({ activity: 'gym', gymMode: 'arrival' })).toBe('Your apps are blocked until you arrive at the gym');
  expect(say({ activity: 'gym', gymMode: 'time', gymMinutes: '60' })).toBe(
    'Your apps are blocked until you spend 60 minutes at the gym',
  );
});
test('walking modes do not depend on preferred walking places', () => {
  expect(say({ activity: 'walking', walkingMode: 'steps', stepGoal: '5000' })).toBe(
    'Your apps are blocked until you walk 5,000 steps',
  );
  expect(say({ activity: 'walking', walkingMode: 'minutes', walkMinutes: '20' })).toBe(
    'Your apps are blocked until you walk for 20 minutes',
  );
  expect(say({ activity: 'walking', walkingMode: 'state' })).toBe(
    'Your apps are blocked unless you are walking',
  );
});
test('the schedule question adds the window and the days', () => {
  const answers = { activity: 'gym', gymMode: 'arrival' };
  expect(say(answers, toSchedule(scheduleDraft({ ...answers, days: [1, 2, 3, 4, 5] })))).toBe(
    'Your apps are blocked until you arrive at the gym from 9 AM to 9 PM on weekdays',
  );
  expect(say(answers, toSchedule(scheduleDraft({ ...answers, days: [0, 1, 2, 3, 4, 5, 6] })))).toBe(
    'Your apps are blocked until you arrive at the gym from 9 AM to 9 PM every day',
  );
  expect(say(answers, toSchedule(scheduleDraft({ ...answers, days: [1, 3], allDay: true })))).toBe(
    'Your apps are blocked until you arrive at the gym all day on Mon, Wed',
  );
});
test('the goal question itself fills the blank from the value the wheel is resting on', () => {
  const answers = { activity: 'gym', gymMode: 'time' };
  expect(conditionSentence(answers, draftFromAnswers(answers), { goalChosen: true })).toBe(
    'Your apps are blocked until you spend 30 minutes at the gym',
  );
});
