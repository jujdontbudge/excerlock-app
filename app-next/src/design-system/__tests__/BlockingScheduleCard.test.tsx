import { render, screen } from '@testing-library/react-native';
import { Text } from 'react-native';
import { BlockingScheduleCard } from '../BlockingScheduleCard';

test('an action row and progress rows both render', async () => {
  await render(
    <BlockingScheduleCard
      message="Block from 9 AM to 9 PM"
      start="9 AM"
      end="9 PM"
      icon="walking"
      lock
      action={<Text>I'm using a treadmill</Text>}>
      <Text>1,240 / 5,000 steps</Text>
    </BlockingScheduleCard>,
  );

  expect(screen.getByText("I'm using a treadmill")).toBeTruthy();
  expect(screen.getByText('1,240 / 5,000 steps')).toBeTruthy();
});
