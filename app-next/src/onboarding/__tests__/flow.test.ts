import { pathFor, nextStep, prevStep, progressFraction, resumeStep } from '../flow';
import { onboardingCopy, onboardingLabels, screenTimeSlider } from '../../content/onboarding';
import { welcomeCopy } from '../../content/welcome';
import { activities } from '../../content/activities';
const pre = Array.from({ length: 20 }, (_, i) => 'O' + String(i + 1).padStart(2, '0'));
const tail = ['S1', 'S2', 'S3', 'S4', 'T1', 'T2', 'T3', 'T4', 'P'];
test.each([
  [{ activity: 'walking', walkingMode: 'steps' }, ['W1', 'W2', 'W3']],
  [{ activity: 'walking', walkingMode: 'minutes' }, ['W1', 'W2', 'W4']],
  [{ activity: 'walking', walkingMode: 'state' }, ['W1', 'W2']],
  [{ activity: 'gym', gymMode: 'time' }, ['G1', 'G2']],
  [{ activity: 'gym', gymMode: 'arrival' }, ['G1']],
  [{ activity: 'running', runMode: 'minutes' }, ['R1', 'R2']],
  [{ activity: 'running', runMode: 'distance' }, ['R1', 'D']],
  [{ activity: 'biking', bikeMode: 'minutes' }, ['B1', 'B2']],
  [{ activity: 'biking', bikeMode: 'distance' }, ['B1', 'D']],
] as const)('each branch walks forward, back and monotonically to P: %j', (answers, branch) => {
  const expected = [...pre, ...branch, ...tail];
  expect(pathFor(answers)).toEqual(expected);
  expected.forEach((step, i) => {
    const state = { step, answers };
    expect(nextStep(state)).toBe(expected[Math.min(i + 1, expected.length - 1)]);
    expect(prevStep(state)).toBe(expected[Math.max(0, i - 1)]);
    expect(resumeStep(state)).toBe(step);
    if (i) expect(progressFraction(state)).toBeGreaterThan(progressFraction({ step: expected[i - 1], answers }));
  });
  expect(progressFraction({ step: 'P', answers })).toBe(1);
});
test('corrupt resume state falls back safely to O01', () => {
  expect(resumeStep(null)).toBe('O01');
  expect(resumeStep({ step: 'missing', answers: {} })).toBe('O01');
});

test('the path includes O19 between O18 and O20 and resumes there', () => {
  const answers = { activity: 'walking' } as const;
  const path = pathFor(answers);
  expect(path.slice(path.indexOf('O18'), path.indexOf('O20') + 1)).toEqual(['O18', 'O19', 'O20']);
  expect(resumeStep({ step: 'O19', answers })).toBe('O19');
});

test('O10 renders a slider from 1 to 12 hours', () => {
  expect(screenTimeSlider).toEqual({ minMinutes: 60, maxMinutes: 720, stepMinutes: 30 });
  expect(onboardingLabels.hours).toBe('Hours scrolling per day');
});

test('O02 and O03 headings differ from O01', () => {
  const headings = [onboardingCopy.O01.title, onboardingCopy.O02.title, onboardingCopy.O03.title];
  expect(new Set(headings).size).toBe(3);
});

test('O03 lists walking, gym, running and biking', () => {
  expect(welcomeCopy.activities).toEqual(activities.map(({ title }) => title));
});
