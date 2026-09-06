import { render, screen } from '@testing-library/react-native';
import { TickingNumber } from '../TickingNumber';
test('reduced-motion metrics expose the final number and its unit immediately', async () => {
  await render(<TickingNumber value={90} label="hours a month" />);
  expect(screen.getByLabelText('90 hours a month')).toBeTruthy();
});
test('half-hour estimates keep their fraction instead of rounding up', async () => {
  await render(<TickingNumber value={3.5} precision={1} label="hours a day" />);
  expect(screen.getByLabelText('3.5 hours a day')).toBeTruthy();
});
