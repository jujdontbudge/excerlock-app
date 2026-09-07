import { render, screen } from '@testing-library/react-native';
import { DotGridReveal } from '../scenes/DotGridReveal';
import { LoopStory } from '../scenes/LoopStory';
test('year grid retains its accessible identity as free and scrolling time are revealed', async () => {
  const props = { answers: { estimatedDailyMinutes: 180 }, setAnswer: jest.fn() };
  const view = await render(<DotGridReveal {...props} step="O12" />);
  expect(screen.getByLabelText('365 days, one dot per day')).toBeTruthy();
  await view.rerender(<DotGridReveal {...props} step="O13" />);
  expect(screen.getByLabelText('122 days of free-time equivalent remain')).toBeTruthy();
  await view.rerender(<DotGridReveal {...props} step="O14" />);
  expect(screen.getByText('38%')).toBeTruthy();
  expect(screen.getByText('of your free time spent on your phone')).toBeTruthy();
  expect(screen.getByLabelText('46 of 122 free-time equivalent days spent scrolling')).toBeTruthy();
});
test('loop story changes the cue-to-reward path without losing its diagram', async () => {
  const view = await render(<LoopStory step="O16" />);
  expect(screen.getByText('The urge')).toBeTruthy();
  expect(screen.getByText('The reward')).toBeTruthy();
  expect(screen.getByText('Reinforcement')).toBeTruthy();
  expect(screen.getByText('Becomes a habit')).toBeTruthy();
  await view.rerender(<LoopStory step="O17" />);
  expect(screen.getByText('Move first')).toBeTruthy();
  await view.rerender(<LoopStory step="O18" />);
  expect(screen.getByText('Unlock & enjoy')).toBeTruthy();
});
