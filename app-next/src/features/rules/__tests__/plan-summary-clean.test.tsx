import { render, screen } from '@testing-library/react-native';
import { PlanSummary } from '../PlanSummary';
import { createDraft } from '../draft';

test('onboarding summary keeps the rule and icon metrics, without the removed editor and footnotes', async () => {
  await render(<PlanSummary draft={createDraft('walking')} schedule={{ days: [1,2,3,4,5], window: { kind: 'allDay' } }}
    answers={{ activity: 'walking', currentDailySteps: 7500, bodyGoal: 'gain' }} onEdit={jest.fn()} />);
  expect(screen.getByTestId('condition-preview')).toBeTruthy();
  expect(screen.getByText('150% more steps')).toBeTruthy();
  expect(screen.getByText('Build muscle')).toBeTruthy();
  expect(screen.getByText('50% less screen time')).toBeTruthy();
  expect(screen.queryByText('Weekly goals')).toBeNull();
  expect(screen.queryByText('Your goals')).toBeNull();
  expect(screen.queryByText('Activity & goal')).toBeNull();
  expect(screen.queryByText('Days & times')).toBeNull();
  expect(screen.queryByText(/Suggested weekly targets, not guaranteed/)).toBeNull();
  expect(screen.queryByText('Unlocks your apps for the rest of the day')).toBeNull();
  expect(screen.getByTestId('plan-goal-icon-screen')).toBeTruthy();
  expect(screen.getByTestId('plan-goal-icon-movement')).toBeTruthy();
  expect(screen.getByTestId('plan-goal-icon-body')).toBeTruthy();
});
