import { render, screen } from '@testing-library/react-native';
import { Heading } from '../Heading';
test.each(['hero', 'question'] as const)('%s heading exposes a heading role and support', async (variant) => {
  await render(<Heading title="Move first" support="Make space for your day" variant={variant} />);
  expect(screen.getByRole('header', { name: 'Move first' })).toBeTruthy();
  expect(screen.getByText('Make space for your day')).toBeTruthy();
});
