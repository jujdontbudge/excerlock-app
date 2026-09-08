import { render, screen } from '@testing-library/react-native';
import { RuleCard } from '../RuleCard';
import { conditionStatus } from '../../domain/conditionState';
const props = {
  title: 'Walk 5,000 steps',
  schedule: 'Mon–Fri · 9 AM–9 PM',
  icon: 'walking' as const,
  onOpen: jest.fn(),
  onToggle: jest.fn(),
  onDelete: jest.fn(),
};
test.each([
  ['met', conditionStatus('met'), true],
  ['active', conditionStatus('blockingNow'), true],
  ['idle', conditionStatus('notScheduled'), true],
  ['paused', conditionStatus('pausedNoGym'), false],
])('renders the %s status', async (name, status, enabled) => {
  await render(<RuleCard {...props} enabled={enabled} status={status} />);
  expect(screen.getByText(status.text)).toBeTruthy();
  expect(screen.toJSON()).toMatchSnapshot(name);
});
test('a disabled card dims its icon and title', async () => {
  await render(<RuleCard {...props} enabled={false} status={conditionStatus('paused')} />);
  expect(screen.getByTestId('rule-card-identity').props.style).toMatchObject({ opacity: expect.any(Number) });
});
