import { render, screen, userEvent, fireEvent, act } from '@testing-library/react-native';
import { Linking } from 'react-native';
import { BugReportScreen } from '../BugReportScreen';
import { SubscriptionScreen } from '../SubscriptionScreen';
import { LegalHubScreen } from '../LegalHubScreen';
import { LegalScreen } from '../LegalScreen';
import { AccountScreen } from '../AccountScreen';
import { createRuntime } from '../../../runtime/createRuntime';
import { AppRuntimeProvider } from '../../../runtime/AppRuntimeProvider';
import { supportDelivery } from '../../../runtime/SupportDelivery';
import { supportEmail, supportServerCategory } from '../../../content/support';
import { subscriptionCopy } from '../../../content/subscription';
import { settingsCopy as c } from '../../../content/settings';
import { legalCopy } from '../../../content/legal';
import { SupportPort } from '../../../ports/SupportPort';

const bug =
  'Gym arrival never unlocked Instagram this morning. I was inside Equinox Bryant Park for 18 minutes, auto-detect is on, and the Home card stayed Locked. Happened after I edited the gym radius yesterday.';
const feedback =
  'Help & feedback should let me attach a screenshot. I keep typing the same gym-unlock bug from memory.';

test('a realistic Problem report opens mail with the mapped bug subject and keeps Idea as support', async () => {
  const openURL = jest.spyOn(Linking, 'openURL').mockResolvedValue(undefined);
  const inner: SupportPort = { send: jest.fn(async () => ({ via: 'server' as const })) };
  await supportDelivery(inner).send('Problem', bug);
  await supportDelivery(inner).send('Idea', feedback);
  const [bugUrl, ideaUrl] = openURL.mock.calls.map(([url]) => String(url));
  const bugParams = new URLSearchParams(bugUrl.slice(bugUrl.indexOf('?') + 1));
  const ideaParams = new URLSearchParams(ideaUrl.slice(ideaUrl.indexOf('?') + 1));
  expect(bugUrl.startsWith(`mailto:${supportEmail}?`)).toBe(true);
  expect(bugParams.get('subject')).toBe('[ExcerLock] Problem');
  expect(bugParams.get('body')).toContain('Equinox Bryant Park');
  expect(supportServerCategory.Problem).toBe('bug');
  expect(ideaParams.get('subject')).toBe('[ExcerLock] Idea');
  expect(supportServerCategory.Idea).toBe('support');
  expect(ideaParams.get('body')).not.toContain('· iOS');
  openURL.mockRestore();
});

test('bug report keeps a typed bug when send fails', async () => {
  const runtime = createRuntime();
  runtime.support.send = jest.fn().mockRejectedValue(new Error('no mail'));
  await runtime.dev.load('fresh-install');
  await render(
    <AppRuntimeProvider runtime={runtime}>
      <BugReportScreen />
    </AppRuntimeProvider>,
  );
  await fireEvent.changeText(screen.getByLabelText('Reply email'), 'alex@example.com');
  await fireEvent.changeText(screen.getByLabelText('Describe the issue'), bug);
  await userEvent.press(screen.getByRole('button', { name: 'Send report' }));
  expect(await screen.findByRole('alert')).toHaveTextContent(new RegExp(supportEmail));
  expect(screen.getByLabelText('Describe the issue')).toHaveProp('value', bug);
});

test('expired membership can still restore and shows the App Store cancel path', async () => {
  const runtime = createRuntime();
  runtime.subscription.manageSubscription = jest.fn().mockRejectedValue(new Error('unavailable'));
  await runtime.dev.load('trial-expired');
  const paywall = jest.spyOn(runtime.subscription, 'presentPaywall');
  await render(
    <AppRuntimeProvider runtime={runtime}>
      <SubscriptionScreen onBack={() => {}} />
    </AppRuntimeProvider>,
  );
  expect(screen.getByText(c.plan('expired'))).toBeTruthy();
  await userEvent.press(screen.getByRole('button', { name: 'Manage in App Store' }));
  expect(screen.getByRole('alert')).toHaveTextContent(subscriptionCopy.manageFallback);
  await userEvent.press(screen.getByRole('button', { name: 'Restore purchases' }));
  await act(async () => {
    await Promise.resolve();
  });
  expect(screen.getByRole('alert')).toHaveTextContent(c.noRestore);
  expect(paywall).not.toHaveBeenCalled();
});

test('privacy and terms remain readable placeholder documents', async () => {
  const navigate = jest.fn();
  await render(<LegalHubScreen navigate={navigate} onBack={() => {}} />);
  await userEvent.press(screen.getByRole('button', { name: 'Privacy Policy' }));
  await userEvent.press(screen.getByRole('button', { name: 'Terms of Use' }));
  expect(navigate).toHaveBeenCalledWith('legal/privacy');
  expect(navigate).toHaveBeenCalledWith('legal/terms');
  await render(<LegalScreen doc="privacy" />);
  expect(screen.getByRole('header', { name: legalCopy.privacy.title })).toBeTruthy();
  expect(screen.getByText(legalCopy.privacy.sections[0]!.body)).toBeTruthy();
  await render(<LegalScreen doc="terms" />);
  expect(screen.getByText(/Deleting an ExcerLock account does not cancel a subscription/)).toBeTruthy();
});

test('signed-in account delete lists the five facts and does not cancel a subscription', async () => {
  const runtime = createRuntime();
  await runtime.dev.load('signed-in-apple');
  await render(
    <AppRuntimeProvider runtime={runtime}>
      <AccountScreen onSignIn={() => {}} onBack={() => {}} />
    </AppRuntimeProvider>,
  );
  await userEvent.press(screen.getByRole('button', { name: c.delete }));
  for (const fact of c.deleteFacts) expect(screen.getByText(fact)).toBeTruthy();
  expect(screen.getByText(/does not cancel an App Store subscription/)).toBeTruthy();
  await userEvent.press(screen.getByRole('button', { name: c.deleteConfirm }));
  expect(await screen.findByText(c.deleted)).toBeTruthy();
});

test('anonymous account deletion is available and a failure keeps visible retry', async () => {
  const runtime = createRuntime();
  await runtime.dev.load('fresh-install');
  runtime.auth.deleteAccount = jest.fn().mockRejectedValue(new Error('server unavailable'));
  await render(
    <AppRuntimeProvider runtime={runtime}>
      <AccountScreen onSignIn={() => {}} onBack={() => {}} />
    </AppRuntimeProvider>,
  );
  await userEvent.press(screen.getByRole('button', { name: c.delete }));
  await userEvent.press(screen.getByRole('button', { name: c.deleteConfirm }));
  expect(await screen.findByRole('alert')).toHaveTextContent(c.error);
  expect(screen.getByRole('button', { name: c.deleteConfirm })).toBeEnabled();
});
