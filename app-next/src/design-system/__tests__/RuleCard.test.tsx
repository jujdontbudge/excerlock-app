import { render, screen } from '@testing-library/react-native';
import { RuleCard } from '../RuleCard';
const props = {
  title: 'Walk 5,000 steps',
  schedule: 'Mon–Fri · 9 AM–9 PM',
  icon: 'walking' as const,
  onOpen: jest.fn(),
  onToggle: jest.fn(),
  onDelete: jest.fn(),
};
test.each([
  ['met', { text: 'Met today', tone: 'met' as const }, true],
  ['active', { text: 'Blocking now', tone: 'active' as const }, true],
  ['idle', { text: 'Not scheduled today', tone: 'idle' as const }, true],
  ['paused', { text: 'Paused — save a gym', tone: 'paused' as const }, false],
])('renders the %s status', (name, status, enabled) => {
  const tree = render(<RuleCard {...props} enabled={enabled} status={status} />);
  expect(screen.getByText(status.text)).toBeTruthy();
  expect(tree.toJSON()).toMatchSnapshot(name);
});
test('a disabled card dims its icon and title', () => {
  render(<RuleCard {...props} enabled={false} status={{ text: 'Paused', tone: 'paused' }} />);
  expect(screen.getByTestId('rule-card-identity').props.style).toMatchObject({ opacity: expect.any(Number) });
});
