import { render, screen } from '@testing-library/react-native';
import { Heading } from '../Heading';
import { tokens as t } from '../tokens';
test.each(['hero', 'question'] as const)('%s heading exposes a heading role and support', async (variant) => {
  await render(<Heading title="Move first" support="Make space for your day" variant={variant} />);
  expect(screen.getByRole('header', { name: 'Move first' })).toBeTruthy();
  expect(screen.getByText('Make space for your day')).toBeTruthy();
});

test('default heading preserves original question size and compact support spacing', async () => {
  await render(<Heading title="Move first" support="Make space for your day" />);
  expect(screen.getByRole('header', { name: 'Move first' })).toHaveStyle(t.type.question);
  expect(screen.getByRole('header', { name: 'Move first' }).parent).toHaveStyle({ gap: t.space.xs });
});
