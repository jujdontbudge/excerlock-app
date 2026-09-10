import { conditionSentence } from '../conditionSentence';
import { draftFromAnswers } from '../answersDraft';
import { Answers } from '../../../onboarding/types';
import { toSchedule, scheduleDraft } from '../scheduleDraft';
const say = (answers: Answers, schedule?: ReturnType<typeof toSchedule>) =>
  conditionSentence(answers, draftFromAnswers(answers, 'mi'), { schedule, goalChosen: false });
test('the sentence stays silent until the first dependency is chosen', () => {
  expect(say({ activity: 'gym' })).toBeNull();
  expect(say({ activity: 'running' })).toBeNull();
  expect(say({ activity: 'biking' })).toBeNull();
  expect(say({ activity: 'walking' })).toBeNull();
});
test('a duration condition blanks the amount until the goal question is answered', () => {
  expect(say({ activity: 'gym', gymMode: 'time' })).toBe('Your apps are blocked until you spend _____ at the gym');
  expect(say({ activity: 'gym', gymMode: 'time', gymMinutes: '45' })).toBe(
    'Your apps are blocked until you spend 45 minutes at the gym',
  );
});
test('each activity phrases its own condition', () => {
  expect(say({ activity: 'gym', gymMode: 'arrival' })).toBe('Your apps are blocked until you arrive at the gym');
  expect(say({ activity: 'running', runMode: 'minutes', runMinutes: '20' })).toBe(
    'Your apps are blocked until you spend 20 minutes running',
  );
  expect(say({ activity: 'biking', bikeMode: 'minutes', bikeMinutes: '30' })).toBe(
    'Your apps are blocked until you spend 30 minutes biking',
  );
  expect(say({ activity: 'running', runMode: 'distance', runDistance: '3', runUnit: 'mi' })).toBe(
    'Your apps are blocked until you run 3 mi',
  );
  expect(say({ activity: 'biking', bikeMode: 'distance', bikeDistance: '8', bikeUnit: 'km' })).toBe(
    'Your apps are blocked until you bike 8 km',
  );
  expect(say({ activity: 'biking', bikeMode: 'distance' })).toBe('Your apps are blocked until you bike _____ mi');
});
test('walking carries the place and switches to unless while walking', () => {
  expect(say({ activity: 'walking', walkPlace: 'outside' })).toBe(
    'Your apps are blocked until you walk _____ steps outside',
  );
  expect(say({ activity: 'walking', walkPlace: 'treadmill', walkingMode: 'target', stepGoal: '5000' })).toBe(
    'Your apps are blocked until you walk 5,000 steps on a treadmill',
  );
  expect(say({ activity: 'walking', walkPlace: 'either', walkingMode: 'state' })).toBe(
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
  expect(conditionSentence(answers, draftFromAnswers(answers, 'mi'), { goalChosen: true })).toBe(
    'Your apps are blocked until you spend 30 minutes at the gym',
  );
});
