import { render, screen } from '@testing-library/react-native';
import { ActivityCard } from '../ActivityCard';
test.each([false, true])('activity cards expose selected=%s with a semantic label', async (selected) => {
  await render(<ActivityCard activity="walking" title="Walking" selected={selected} onPress={jest.fn()} />);
  expect(screen.getByRole('radio', { name: 'Walking' }).props.accessibilityState.checked).toBe(selected);
});
