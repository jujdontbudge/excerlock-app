import { act, fireEvent, render, screen, userEvent, waitFor } from '@testing-library/react-native';
import { Linking } from 'react-native';
import { feedback } from '../../../motion/haptics';
import { AppRuntimeProvider } from '../../../runtime/AppRuntimeProvider';
import { createRuntime } from '../../../runtime/createRuntime';
import { permissionsStore } from '../../../state/permissionsStore';
import { rulesStore } from '../../../state/rulesStore';
import { sessionStore } from '../../../state/sessionStore';
import { settingsStore } from '../../../state/settingsStore';
import { AccountScreen } from '../AccountScreen';
import { PermissionDetail } from '../PermissionDetail';
import { SettingsScreen } from '../SettingsScreen';
import { SupportScreen, SupportSent } from '../SupportScreen';

jest.mock('../../../motion/haptics', () => ({ feedback: jest.fn(), setHapticsEnabled: jest.fn() }));
// A development run has no native bundle values; the About row falls back to app.json.
jest.mock('expo-application', () => ({ nativeApplicationVersion: null, nativeBuildVersion: null }));

function withRuntime(runtime: ReturnType<typeof createRuntime>, child: React.ReactElement) {
  return <AppRuntimeProvider runtime={runtime}>{child}</AppRuntimeProvider>;
}

beforeEach(() => {
  jest.clearAllMocks();
});

test('Settings renders six permission rows including Camera, one Account row and no More settings state', async () => {
  const runtime = createRuntime();
  await runtime.dev.load('multi-rule-overlap');
  const navigate = jest.fn();
  await render(withRuntime(runtime, <SettingsScreen navigate={navigate} onDev={() => {}} />));

  expect(screen.getAllByRole('button', { name: /, Granted$/ })).toHaveLength(6);
  expect(screen.getByRole('button', { name: 'Camera, Granted' })).toBeTruthy();
  expect(screen.getAllByRole('button', { name: /^Account(?:,|$)/ })).toHaveLength(1);
  expect(screen.queryByRole('button', { name: 'More settings' })).toBeNull();
  expect(screen.getAllByRole('button', { name: /^Reminders,/ })).toHaveLength(1);
  expect(screen.queryByRole('header', { name: 'More settings' })).toBeNull();
  expect(screen.getAllByRole('header').map((header) => header.props.children)).toEqual([
    'Settings',
    'Subscription',
    'Data & permissions',
    'Preferences',
    'Your plan',
    'Support',
    'Legal',
    'Account',
    'About',
  ]);
  await userEvent.press(screen.getByRole('button', { name: /^Alex, / }));
  expect(navigate).toHaveBeenCalledWith('account');
});

test('Settings required rows work on one screen and the seventh version tap opens the developer menu', async () => {
  const runtime = createRuntime();
  await runtime.dev.load('multi-rule-overlap');
  const dev = jest.fn();
  const navigate = jest.fn();
  await render(withRuntime(runtime, <SettingsScreen navigate={navigate} onDev={dev} />));

  for (const name of [
    'Manage subscription',
    'Restore purchases',
    'Conditions',
    'Saved gyms',
    'Contact support',
    'Rate ExcerLock',
    'Share ExcerLock',
    'Terms of Use',
    'Privacy Policy',
    'Account',
  ])
    expect(screen.getByRole('button', { name: new RegExp(`^${name}(?:,|$)`) })).toBeTruthy();

  await userEvent.press(screen.getByRole('button', { name: 'Terms of Use' }));
  expect(navigate).toHaveBeenCalledWith('legal/terms');
  await userEvent.press(screen.getByRole('button', { name: 'Privacy Policy' }));
  expect(navigate).toHaveBeenCalledWith('legal/privacy');
  const openURL = jest.spyOn(Linking, 'openURL').mockResolvedValue(true);
  await userEvent.press(screen.getByRole('button', { name: 'Manage subscription' }));
  expect(openURL).toHaveBeenCalledWith('https://apps.apple.com/account/subscriptions');

  const footer = screen.getByRole('button', { name: /ExcerLock 1\.0\.0/ });
  for (let i = 0; i < 7; i++) await userEvent.press(footer);
  expect(dev).toHaveBeenCalledTimes(1);
});

test('restore exposes pending feedback on its row without leaving Settings', async () => {
  const runtime = createRuntime();
  await runtime.dev.load('multi-rule-overlap');
  let finish!: (value: Awaited<ReturnType<typeof runtime.subscription.restore>>) => void;
  runtime.subscription.restore = () => new Promise((resolve) => (finish = resolve));
  await render(withRuntime(runtime, <SettingsScreen navigate={() => {}} onDev={() => {}} />));

  await userEvent.press(screen.getByRole('button', { name: 'Restore purchases' }));
  expect(screen.getByRole('button', { name: 'Restore purchases, Restoring purchases…' })).toBeTruthy();
  finish({ status: 'active', renewsAt: null });
  await waitFor(() => expect(screen.queryByText('Restoring purchases…')).toBeNull());
});

test('denied permission opens iOS Settings', async () => {
  const runtime = createRuntime();
  await runtime.dev.load('fresh-install');
  permissionsStore.getState().patch({ screenTime: 'denied' });
  const openSettings = jest.spyOn(Linking, 'openSettings').mockResolvedValue();
  await render(withRuntime(runtime, <PermissionDetail name="screenTime" />));

  expect(screen.getByText('Your selected apps cannot be blocked without access.')).toBeTruthy();
  await userEvent.press(screen.getByRole('button', { name: 'Open Settings' }));
  expect(openSettings).toHaveBeenCalledTimes(1);
});

test('notDetermined permission offers Allow and requests the matching permission', async () => {
  const runtime = createRuntime();
  await runtime.dev.load('fresh-install');
  const request = jest.spyOn(runtime.screenTime, 'requestAuthorization').mockResolvedValue('granted');
  await render(withRuntime(runtime, <PermissionDetail name="screenTime" />));

  await userEvent.press(screen.getByRole('button', { name: 'Allow' }));
  await waitFor(() => expect(request).toHaveBeenCalledTimes(1));
  await waitFor(() => expect(permissionsStore.getState().data.screenTime).toBe('granted'));
});

test('granted permission detail confirms access without the unavailable warning', async () => {
  const runtime = createRuntime();
  await runtime.dev.load('fresh-install');
  permissionsStore.getState().patch({ motion: 'granted' });
  await render(withRuntime(runtime, <PermissionDetail name="motion" />));
  expect(screen.getByText('This is on. Nothing to do here.')).toBeTruthy();
  expect(screen.queryByText('Your walking step goal cannot update without access.')).toBeNull();
});

test('restricted permission detail explains the restriction and offers no action', async () => {
  const runtime = createRuntime();
  await runtime.dev.load('fresh-install');
  permissionsStore.getState().patch({ motion: 'restricted' });
  await render(withRuntime(runtime, <PermissionDetail name="motion" />));
  expect(
    screen.getByText(
      'A Screen Time passcode or a device management profile blocks this. ExcerLock cannot ask for it.',
    ),
  ).toBeTruthy();
  expect(screen.queryByRole('button', { name: 'Allow' })).toBeNull();
  expect(screen.queryByRole('button', { name: 'Open Settings' })).toBeNull();
});

test('restricted location remains visible as Restricted in the Settings permission row', async () => {
  const runtime = createRuntime();
  await runtime.dev.load('fresh-install');
  permissionsStore.getState().patch({ location: 'restricted' });
  await render(withRuntime(runtime, <SettingsScreen navigate={() => {}} onDev={() => {}} />));
  expect(screen.getByRole('button', { name: 'Location, Restricted' })).toBeTruthy();
});

test('turning touch feedback off suppresses its confirming tap', async () => {
  const runtime = createRuntime();
  await runtime.dev.load('fresh-install');
  settingsStore.getState().patch({ haptics: true });
  await render(withRuntime(runtime, <SettingsScreen navigate={() => {}} onDev={() => {}} />));

  await fireEvent(screen.getByRole('switch', { name: 'Touch feedback' }), 'valueChange', false);
  expect(settingsStore.getState().data.haptics).toBe(false);
  expect(feedback).not.toHaveBeenCalled();
});

test('anonymous account can delete its data while preserving local rules', async () => {
  const runtime = createRuntime();
  await runtime.dev.load('multi-rule-overlap');
  const originalRules = rulesStore.getState().data.rules;
  const remove = jest.spyOn(runtime.auth, 'deleteAccount');
  await render(withRuntime(runtime, <AccountScreen onSignIn={() => {}} onBack={() => {}} />));

  expect(screen.getByRole('button', { name: 'Sign in' })).toBeTruthy();
  await userEvent.press(screen.getByRole('button', { name: 'Delete my data' }));
  expect(screen.getByText('This does not cancel an App Store subscription.')).toBeTruthy();
  await userEvent.press(screen.getByRole('button', { name: 'Delete my data forever' }));
  expect(remove).toHaveBeenCalledTimes(1);
  expect(rulesStore.getState().data.rules).toEqual(originalRules);
  expect(sessionStore.getState().data.session.kind).toBe('anonymous');
});

test('sign-out is confirmed and only ends the session after confirmation', async () => {
  const runtime = createRuntime();
  await runtime.dev.load('signed-in-apple');
  await render(withRuntime(runtime, <AccountScreen onSignIn={() => {}} onBack={() => {}} />));

  await userEvent.press(screen.getByRole('button', { name: 'Sign out' }));
  expect(sessionStore.getState().data.session.kind).toBe('signedIn');
  expect(screen.getByRole('header', { name: 'Sign out of ExcerLock?' })).toBeTruthy();
  expect(screen.getByText('This does not cancel an App Store subscription.')).toBeTruthy();
  await userEvent.press(screen.getByRole('button', { name: 'Stay signed in' }));
  expect(sessionStore.getState().data.session.kind).toBe('signedIn');

  await userEvent.press(screen.getByRole('button', { name: 'Sign out' }));
  await userEvent.press(screen.getAllByRole('button', { name: 'Sign out' }).at(-1)!);
  expect(sessionStore.getState().data.session.kind).toBe('anonymous');
  expect(screen.getByText("You're signed out. Your plan is still on this device.")).toBeTruthy();
});

test('support requires a reply email and previews only privacy-floored diagnostics', async () => {
  const runtime = createRuntime();
  await runtime.dev.load('multi-rule-overlap');
  await render(withRuntime(runtime, <SupportScreen />));

  await userEvent.type(screen.getByLabelText('Your message'), 'A useful idea');
  expect(screen.getByRole('button', { name: 'Send message' })).toBeDisabled();
  await userEvent.type(screen.getByLabelText('Your email'), 'alex@example.test');
  await waitFor(() => expect(screen.getByRole('button', { name: 'Send message' })).not.toBeDisabled());
  expect(screen.getByText(/App version/)).toBeTruthy();
  expect(screen.getByText(/Screen Time/)).toBeTruthy();
  expect(screen.queryByText(/Demo Gym|latitude|longitude|health value/i)).toBeNull();
  await userEvent.press(screen.getByRole('button', { name: "What we'll send" }));
  expect(screen.queryByText(/App version/)).toBeNull();
});

test('support sends the widened request through its fake port', async () => {
  const runtime = createRuntime();
  await runtime.dev.load('fresh-install');
  const send = jest.spyOn(runtime.support, 'send');
  await render(withRuntime(runtime, <SupportScreen />));

  await userEvent.type(screen.getByLabelText('Your message'), 'Please help');
  await userEvent.type(screen.getByLabelText('Your email'), 'alex@example.test');
  await userEvent.press(screen.getByRole('button', { name: 'Send message' }));
  expect(send).toHaveBeenCalledWith(
    expect.objectContaining({
      category: 'Problem',
      message: 'Please help',
      replyTo: 'alex@example.test',
      diagnostics: expect.objectContaining({ ruleCount: 0 }),
    }),
  );
  expect(screen.getByRole('button', { name: 'Sending…' })).toBeTruthy();
  await act(async () => {
    await new Promise((resolve) => setTimeout(resolve, 650));
  });
  expect(screen.getByRole('header', { name: 'Message sent' })).toBeTruthy();
});

test('support sent screen names the destination and response time', async () => {
  await render(<SupportSent onBack={() => {}} />);
  expect(screen.getByText(/support@excerlock\.com.*two business days/)).toBeTruthy();
});

test('signed-in support prefills an editable reply address', async () => {
  const runtime = createRuntime();
  await runtime.dev.load('signed-in-apple');
  await render(withRuntime(runtime, <SupportScreen />));

  const email = screen.getByLabelText('Your email');
  expect(email).toHaveProp('value', 'alex@example.test');
  await userEvent.clear(email);
  await userEvent.type(email, 'other@example.test');
  expect(screen.getByLabelText('Your email')).toHaveProp('value', 'other@example.test');
});

test('auto-detect ignores a second toggle while the permission request is open', async () => {
  const runtime = createRuntime();
  await runtime.dev.load('fresh-install');
  let finish!: (value: Awaited<ReturnType<typeof runtime.gym.enableAutoDetect>>) => void;
  let pending!: Promise<boolean>;
  const enable = jest
    .spyOn(runtime.gym, 'enableAutoDetect')
    .mockImplementation(() => (pending = new Promise((resolve) => (finish = resolve))));
  await render(withRuntime(runtime, <SettingsScreen navigate={() => {}} onDev={() => {}} />));
  const toggle = screen.getByRole('switch', { name: 'Gym auto-detect' });

  await fireEvent(toggle, 'valueChange', true);
  await waitFor(() =>
    expect(screen.getByRole('switch', { name: 'Gym auto-detect' })).toHaveProp(
      'accessibilityState',
      expect.objectContaining({ busy: true }),
    ),
  );
  expect(enable).toHaveBeenCalledTimes(1);
  await act(async () => {
    finish(true);
    await pending;
  });
  await waitFor(() => expect(settingsStore.getState().data.gymAutoDetect).toBe(true));
});

test('denying Always location leaves auto-detect off, explains why and links to Location', async () => {
  const runtime = createRuntime();
  await runtime.dev.load('fresh-install');
  runtime.dev.setPromptMode('deny');
  const navigate = jest.fn();
  await render(withRuntime(runtime, <SettingsScreen navigate={navigate} onDev={() => {}} />));
  const toggle = screen.getByRole('switch', { name: 'Gym auto-detect' });

  await fireEvent(toggle, 'valueChange', true);
  await waitFor(() => expect(screen.getByText(/Gym auto-detect needs Always location/)).toBeTruthy());
  expect(settingsStore.getState().data.gymAutoDetect).toBe(false);
  await userEvent.press(screen.getByRole('button', { name: 'Open location settings' }));
  expect(navigate).toHaveBeenCalledWith('permission/location');
});

test('a failed support send while offline keeps the message and offers an explicit retry', async () => {
  const runtime = createRuntime();
  await runtime.dev.load('fresh-install');
  runtime.dev.setOnline(false);
  runtime.dev.setOutcome('error');
  await render(withRuntime(runtime, <SupportScreen />));

  await userEvent.type(screen.getByLabelText('Your message'), 'Please help');
  await userEvent.type(screen.getByLabelText('Your email'), 'alex@example.test');
  await userEvent.press(screen.getByRole('button', { name: 'Send message' }));
  await act(async () => {
    await new Promise((resolve) => setTimeout(resolve, 650));
  });
  expect(screen.getByText("You're offline. Connect and try again — this will not retry on its own.")).toBeTruthy();
  expect(screen.getByRole('button', { name: 'Not sent — tap to retry' })).toBeTruthy();
  expect(screen.getByLabelText('Your message').props.value).toBe('Please help');
  runtime.dispose();
});
