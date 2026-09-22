import { fireEvent, render, screen } from '@testing-library/react-native';
import { PreBranchScreen } from '../PreBranchScreen';
import { nextStep, prevStep, resumeStep } from '../../../onboarding/flow';
import { canContinue } from '../../../onboarding/validation';
import { isOnboardingStepId } from '../../../onboarding/stepId';

const options = ['Walking', 'Lifting', 'Pilates', 'Yoga', 'Running', 'Cycling', 'Swimming', 'Something else'];

test('gender precedes name and body goal precedes exercise preference', async () => {
  expect(nextStep({ step: 'O03', answers: {} })).toBe('O07');
  expect(nextStep({ step: 'O07', answers: {} })).toBe('O04');
  expect(prevStep({ step: 'O04', answers: {} })).toBe('O07');
  expect(canContinue('O07', {})).toBe(false);
  expect(canContinue('O07', { gender: 'preferNotToSay' })).toBe(true);
  expect(canContinue('O22', {})).toBe(false);
  expect(canContinue('O22', { bodyGoal: 'maintain' })).toBe(true);
  expect(isOnboardingStepId('O22')).toBe(true);
  await render(<PreBranchScreen step="O07" answers={{}} setAnswer={jest.fn()} />);
  expect(screen.getByRole('header', { name: 'What is your gender?' })).toBeTruthy();
  expect(screen.getAllByRole('radio').map(row => row.props.accessibilityLabel)).toEqual(['Male', 'Female', 'Other', 'Prefer not to say']);
});

test('body goal choices match the requested reference without calorie claims', async () => {
  await render(<PreBranchScreen step="O22" answers={{}} setAnswer={jest.fn()} />);
  expect(screen.getAllByRole('radio').map(row => row.props.accessibilityLabel)).toEqual(['Gain weight', 'Lose weight', 'Maintain']);
  expect(screen.queryByText(/calories|macros/i)).toBeNull();
});

test.each([
  ['walking', 'walking'], ['lifting', 'lifting'], ['pilates', 'Pilates'], ['yoga', 'yoga'],
  ['running', 'running'], ['cycling', 'cycling'], ['swimming', 'swimming'], ['other', 'exercise'],
])('weekly hours reflects %s and saves a valid range', async (exercisePreference, activity) => {
  const setAnswer = jest.fn();
  await render(<PreBranchScreen step="O09" answers={{ exercisePreference }} setAnswer={setAnswer} />);
  expect(screen.getByRole('header', { name: `How many hours of ${activity} do you do per week?` })).toBeTruthy();
  expect(screen.queryByText('What’s the main reason you want to make a change?')).toBeNull();
  expect(screen.getAllByRole('radio').map(row => row.props.accessibilityLabel)).toEqual(['None yet', 'Less than 1 hour', '1–2 hours', '3–4 hours', '5–6 hours', '7+ hours']);
  await fireEvent.press(screen.getByRole('radio', { name: '1–2 hours' }));
  expect(setAnswer).toHaveBeenCalledWith('weeklyExerciseHours', '1-2');
  expect(canContinue('O09', { exercisePreference })).toBe(false);
  expect(canContinue('O09', { exercisePreference, weeklyExerciseHours: '1-2' })).toBe(true);
});

test('exercise preference follows the goal and resumes without changing the unlock activity', () => {
  const answers = { improveFirst: 'other', exercisePreference: 'pilates', activity: 'walking' };
  expect(nextStep({ step: 'O08', answers })).toBe('O22');
  expect(nextStep({ step: 'O22', answers })).toBe('O21');
  expect(prevStep({ step: 'O21', answers })).toBe('O22');
  expect(nextStep({ step: 'O21', answers })).toBe('O09');
  expect(prevStep({ step: 'O09', answers })).toBe('O21');
  expect(isOnboardingStepId('O21')).toBe(true);
  expect(resumeStep({ step: 'O21', answers })).toBe('O21');
  expect(canContinue('O21', {})).toBe(false);
  expect(canContinue('O21', { exercisePreference: 'invalid' })).toBe(false);
  expect(canContinue('O21', answers)).toBe(true);
});

test('exercise preference offers walking and lifting first and persists the selection', async () => {
  const setAnswer = jest.fn();
  await render(<PreBranchScreen step="O21" answers={{ exercisePreference: 'lifting' }} setAnswer={setAnswer} />);
  expect(screen.getByRole('header', { name: 'What exercise would you like to do more of?' })).toBeTruthy();
  expect(screen.getAllByRole('radio').map(row => row.props.accessibilityLabel)).toEqual(options);
  expect(screen.getByRole('radio', { name: 'Lifting' })).toBeChecked();
  await fireEvent.press(screen.getByRole('radio', { name: 'Pilates' }));
  expect(setAnswer).toHaveBeenCalledWith('exercisePreference', 'pilates');
  expect(setAnswer).toHaveBeenCalledTimes(1);
});
