import { fireEvent, render, screen } from '@testing-library/react-native';
import { PlanTrialPreview } from '../PlanTrialPreview';
import { createDraft, toRule } from '../draft';
import { domainCopy } from '../../../content/domain';
import { homeCopy } from '../../../content/home';
import { Schedule } from '../../../domain/types';

const layout = () =>
  fireEvent(screen.getByTestId('trial-phone-box'), 'layout', { nativeEvent: { layout: { width: 354, height: 520 } } });
const schedule: Schedule = { days: [1, 2, 3, 4, 5], window: { kind: 'range', startMinute: 540, endMinute: 1260 } };

test('the phone shows the Home screen this user will get for their own condition', async () => {
  await render(<PlanTrialPreview rule={toRule(createDraft('walking'), schedule)} />);
  await layout();
  expect(screen.getByTestId('trial-phone-frame')).toBeTruthy();
  expect(screen.getByText('ExcerLock', { includeHiddenElements: true })).toBeTruthy();
  expect(screen.queryByText(/Hello,|Your day/, { includeHiddenElements: true })).toBeNull();
  expect(screen.getByText('Walk 10,000 steps', { includeHiddenElements: true })).toBeTruthy();
  expect(screen.getByText('0 / 10,000 steps', { includeHiddenElements: true })).toBeTruthy();
  expect(screen.getByText('Mon–Fri · 9 AM–9 PM', { includeHiddenElements: true })).toBeTruthy();
});

test('a "Be at the gym" plan previews the gym presence card', async () => {
  await render(<PlanTrialPreview rule={toRule(createDraft('gym'), schedule)} />);
  await layout();
  expect(screen.getByText(domainCopy.gymPresence, { includeHiddenElements: true })).toBeTruthy();
  expect(screen.getByText(homeCopy.gymReady, { includeHiddenElements: true })).toBeTruthy();
  expect(screen.getByLabelText(`Your ExcerLock Home screen: ${domainCopy.gymPresence}`)).toBeTruthy();
});
