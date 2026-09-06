import { render, screen } from '@testing-library/react-native';
import { DotGridReveal } from '../scenes/DotGridReveal';
import { LoopStory } from '../scenes/LoopStory';
test('year grid retains its accessible identity as free and scrolling time are revealed', async () => {
  const props = { answers: { estimatedDailyMinutes: 180 }, setAnswer: jest.fn() };
  const view = await render(<DotGridReveal {...props} step="O12" />);
  expect(screen.getByLabelText('Your year in days')).toHaveAccessibilityValue({ text: '0 of 365' });
  await view.rerender(<DotGridReveal {...props} step="O13" />);
  expect(screen.getByLabelText('Free-time equivalent across your year')).toHaveAccessibilityValue({
    text: '122 of 365',
  });
  await view.rerender(<DotGridReveal {...props} step="O14" />);
  expect(screen.getByLabelText('Scrolling-time equivalent across your year')).toHaveAccessibilityValue({
    text: '46 of 365',
  });
});
test('loop story changes the cue-to-reward path without losing its diagram', async () => {
  const view = await render(<LoopStory step="O16" />);
  expect(screen.getByText('A scroll')).toBeTruthy();
  await view.rerender(<LoopStory step="O17" />);
  expect(screen.getByText('Move first')).toBeTruthy();
  await view.rerender(<LoopStory step="O18" />);
  expect(screen.getByText('Unlock & enjoy')).toBeTruthy();
});
