import { fireEvent, render, screen } from '@testing-library/react-native';
import { DotGridReveal } from '../scenes/DotGridReveal';
import { LoopStory } from '../scenes/LoopStory';
test('year grid retains its accessible identity as free and scrolling time are revealed', async () => {
  const props = { answers: { estimatedDailyMinutes: 180 }, setAnswer: jest.fn() };
  const view = await render(<DotGridReveal {...props} step="O12" />);
  expect(screen.getByLabelText('365 days, one dot per day')).toBeTruthy();
  await view.rerender(<DotGridReveal {...props} step="O13" />);
  expect(screen.getByLabelText('122 days of free-time equivalent remain')).toBeTruthy();
  await view.rerender(<DotGridReveal {...props} step="O14" />);
  // The percentage counts up visually; its accessible value is always the final figure.
  expect(screen.getByLabelText('38%')).toBeTruthy();
  expect(screen.getByText('of your free time spent on your phone')).toBeTruthy();
  expect(screen.getByLabelText('46 of 122 free-time equivalent days spent scrolling')).toBeTruthy();
});
test('loop story keeps its headings and one illustrated scene through all three phases', async () => {
  const view = await render(<LoopStory step="O16" />);
  expect(screen.getByTestId('loop-heading-O16')).toBeTruthy();
  expect(screen.getByTestId('loop-heading-O17', { includeHiddenElements: true })).toBeTruthy();
  expect(screen.getByTestId('loop-heading-O18', { includeHiddenElements: true })).toBeTruthy();
  expect(screen.getByLabelText('Scrolling is the habit')).toBeTruthy();
  // The scene waits for the space under the heading, then fills it.
  await fireEvent(screen.getByTestId('loop-scene-box'), 'layout', {
    nativeEvent: { layout: { width: 360, height: 420 } },
  });
  const scene = screen.getByTestId('loop-scene');
  expect(scene.props.accessibilityLabel).toBe('A person hunched over their phone, pulled in by an endless feed.');
  await view.rerender(<LoopStory step="O17" />);
  expect(screen.getByTestId('loop-scene')).toBe(scene);
  expect(screen.getByLabelText('Exercise becomes the habit')).toBeTruthy();
  expect(scene.props.accessibilityLabel).toBe('ExcerLock locks the phone and the person looks up, free of the feed.');
  await view.rerender(<LoopStory step="O18" />);
  expect(screen.getByRole('header', { name: 'You become ADDICTED to exercise' })).toBeTruthy();
  expect(screen.getByText('ADDICTED')).toHaveStyle({ color: '#C94710' });
  expect(screen.getByTestId('loop-scene').props.accessibilityLabel).toBe('The phone is put away and the person walks.');
});
