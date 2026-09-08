import { render, screen } from '@testing-library/react-native';
import { Text } from 'react-native';
import { BlockingScheduleCard } from '../BlockingScheduleCard';
import { LockShackle } from '../LockShackle';

test('an action row and progress rows both render', async () => {
  await render(
    <BlockingScheduleCard
      message="Block from 9 AM to 9 PM"
      start="9 AM"
      end="9 PM"
      icon="walking"
      lock
      statusTitle="Apps are blocked"
      statusSubtitle="Until you walk 1,800 steps">
      <Text>I&apos;m using a treadmill</Text>
      <Text>1,240 / 5,000 steps</Text>
    </BlockingScheduleCard>,
  );

  expect(screen.getByText("I'm using a treadmill")).toBeTruthy();
  expect(screen.getByText('1,240 / 5,000 steps')).toBeTruthy();
  expect(screen.getByRole('header', { name: 'Apps are blocked' })).toBeTruthy();
  expect(screen.getByText('Until you walk 1,800 steps')).toBeTruthy();
  expect(screen.getByRole('header', { name: 'Block from 9 AM to 9 PM' })).toBeTruthy();
});

test('the unlocked day captions the lock and lifts the shackle', async () => {
  await render(
    <BlockingScheduleCard
      message="Block from 9 AM to 9 PM"
      start="9 AM"
      end="9 PM"
      icon="walking"
      lock
      open
      glyph="lock-open"
      caption="Unlocked by Walk 5,000 steps"
    />,
  );
  expect(screen.getByText('Unlocked by Walk 5,000 steps')).toBeTruthy();

  const shackle = async (open: boolean) =>
    JSON.stringify((await render(<LockShackle bodyWidth={200} open={open} />)).toJSON());
  expect(await shackle(true)).not.toBe(await shackle(false));
});
