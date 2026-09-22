import { render, screen } from '@testing-library/react-native';
import { Heading } from '../Heading';
import { tokens as t } from '../tokens';
test.each(['display', 'section'] as const)('%s heading exposes a heading role and support', async (variant) => {
  await render(<Heading title="Move first" support="Make space for your day" variant={variant} />);
  expect(screen.getByRole('header', { name: 'Move first' })).toBeTruthy();
  expect(screen.getByText('Make space for your day')).toBeTruthy();
});

test('default heading uses the display role and compact support spacing', async () => {
  await render(<Heading title="Move first" support="Make space for your day" />);
  expect(screen.getByRole('header', { name: 'Move first' })).toHaveStyle(t.type.display);
  expect(screen.getByRole('header', { name: 'Move first' }).parent).toHaveStyle({ gap: t.space.xs });
});

test('alignment is an explicit prop: a question is not centred just because it ends in "?"', async () => {
  await render(<Heading title="Where do you walk?" />);
  expect(screen.getByRole('header', { name: 'Where do you walk?' })).toHaveStyle({ textAlign: 'left' });
  await render(<Heading title="Where do you walk?" centered />);
  expect(screen.getByRole('header', { name: 'Where do you walk?' })).toHaveStyle({ textAlign: 'center' });
});
