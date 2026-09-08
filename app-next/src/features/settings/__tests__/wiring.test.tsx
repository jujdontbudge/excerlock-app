import { act, render, screen, userEvent, waitFor } from '@testing-library/react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Linking, Share } from 'react-native';
import { createApiClient, createHttpSupportPort, createUserApi } from '../../../adapters/api';
import { AuthPort } from '../../../ports/AuthPort';
import { ApiFetch } from '../../../adapters/api/client';
import { AppRuntimeProvider } from '../../../runtime/AppRuntimeProvider';
import { createRuntime } from '../../../runtime/createRuntime';
import { reviewStore } from '../../../state/reviewStore';
import { rulesStore } from '../../../state/rulesStore';
import { sessionStore } from '../../../state/sessionStore';
import { AccountScreen } from '../AccountScreen';
import { SettingsScreen } from '../SettingsScreen';
import { SupportScreen } from '../SupportScreen';

jest.mock('../../../motion/haptics', () => ({ feedback: jest.fn(), setHapticsEnabled: jest.fn() }));
jest.mock('../nativeExport', () => ({
  nativeExportSink: {
    writeFile: jest.fn(async (name: string) => `file:///cache/${name}`),
    share: jest.fn(async () => {}),
  },
}));
const mockSink = jest.requireMock('../nativeExport').nativeExportSink as { writeFile: jest.Mock; share: jest.Mock };

/**
 * Mirrors P2-T01's real adapter: `deleteAccount()` is DELETE /v1/user first, then the local teardown,
 * and a refused server call leaves the session exactly as it was.
 */
function serverBackedAuth(auth: AuthPort, api: ReturnType<typeof createUserApi>, onServer = () => {}): AuthPort {
  const local = auth.deleteAccount;
  return {
    ...auth,
    session: () => auth.session(),
    subscribe: (callback) => auth.subscribe(callback),
    deleteAccount: async () => {
      onServer();
      await api.deleteUser();
      await local();
    },
  };
}

function withRuntime(runtime: ReturnType<typeof createRuntime>, child: React.ReactElement) {
  return <AppRuntimeProvider runtime={runtime}>{child}</AppRuntimeProvider>;
}

function serverStub(status: number, calls: { url: string; method: string; body?: string }[] = [], text = '') {
  const fetch: ApiFetch = async (url, init) => {
    calls.push({ url, method: init.method, body: init.body });
    return { status, text: async () => text };
  };
  return { client: createApiClient({ baseUrl: 'https://api.test', getAccessToken: async () => 'jwt', fetch }), calls };
}

beforeEach(async () => {
  jest.clearAllMocks();
  await AsyncStorage.clear();
  reviewStore.getState().reset();
});

test('Rate ExcerLock opens the App Store review composer and ends the automatic prompts', async () => {
  const runtime = createRuntime();
  await runtime.dev.load('multi-rule-overlap');
  const openURL = jest.spyOn(Linking, 'openURL').mockResolvedValue(true);
  await render(withRuntime(runtime, <SettingsScreen navigate={() => {}} onDev={() => {}} />));

  await userEvent.press(screen.getByRole('button', { name: 'Rate ExcerLock' }));
  await waitFor(() =>
    expect(openURL).toHaveBeenCalledWith('https://apps.apple.com/app/id6787265352?action=write-review'),
  );
  expect(reviewStore.getState().data.manualRateTapped).toBe(true);
  expect(screen.getByRole('alert')).toHaveTextContent('Thanks for taking a moment for ExcerLock.');
  runtime.dispose();
});

test('Share ExcerLock opens the native share sheet with the App Store link', async () => {
  const runtime = createRuntime();
  await runtime.dev.load('multi-rule-overlap');
  const share = jest.spyOn(Share, 'share').mockResolvedValue({ action: 'sharedAction' });
  await render(withRuntime(runtime, <SettingsScreen navigate={() => {}} onDev={() => {}} />));

  await userEvent.press(screen.getByRole('button', { name: 'Share ExcerLock' }));
  expect(share).toHaveBeenCalledWith({
    message: 'ExcerLock blocks your apps until you exercise. Block apps. Exercise more.',
    url: 'https://apps.apple.com/app/id6787265352',
  });
  runtime.dispose();
});

test('Export my data writes the documented JSON, shares it and emits data_export_requested', async () => {
  const runtime = createRuntime();
  await runtime.dev.load('multi-rule-overlap');
  await render(withRuntime(runtime, <SettingsScreen navigate={() => {}} onDev={() => {}} />));

  await userEvent.press(screen.getByRole('button', { name: 'Export my data' }));
  await waitFor(() => expect(mockSink.share).toHaveBeenCalledTimes(1));
  const [name, contents] = mockSink.writeFile.mock.calls[0] as [string, string];
  expect(name).toBe(`excerlock-export-${runtime.clock.now().slice(0, 10)}.json`);
  const data = JSON.parse(contents);
  expect(data).toMatchObject({
    format: 'excerlock-data-export',
    version: 1,
    exportedAt: runtime.clock.now(),
    userId: sessionStore.getState().data.session.userId,
  });
  expect(data.rules).toEqual(rulesStore.getState().data.rules);
  expect(Array.isArray(data.ruleDays) && Array.isArray(data.earnedUnlocks) && Array.isArray(data.history)).toBe(true);
  expect(contents).not.toMatch(/lockedApps|handle|Demo Gym|latitude/);
  expect(mockSink.share).toHaveBeenCalledWith(`file:///cache/${name}`);
  expect(runtime.dev.snapshot().events.some((e) => e.event === 'data_export_requested')).toBe(true);
  runtime.dispose();
});

test('a failed export says so and leaves the screen usable', async () => {
  const runtime = createRuntime();
  await runtime.dev.load('multi-rule-overlap');
  mockSink.writeFile.mockRejectedValueOnce(new Error('disk'));
  await render(withRuntime(runtime, <SettingsScreen navigate={() => {}} onDev={() => {}} />));
  await userEvent.press(screen.getByRole('button', { name: 'Export my data' }));
  await waitFor(() => expect(screen.getByRole('alert')).toHaveTextContent(/Your export could not be prepared/));
  runtime.dispose();
});

test('deleting the account resets subscription, then analytics, then the server, then the local session', async () => {
  const runtime = createRuntime();
  await runtime.dev.load('signed-in-apple');
  const order: string[] = [];
  const calls: { url: string; method: string }[] = [];
  const { client } = serverStub(204, calls);
  runtime.subscription.reset = () => order.push('subscription');
  runtime.analytics.reset = () => order.push('analytics');
  const local = runtime.auth.deleteAccount;
  runtime.auth.deleteAccount = async () => {
    order.push('auth');
    await local();
  };
  runtime.auth = serverBackedAuth(runtime.auth, createUserApi(client), () => order.push('server'));
  const originalRules = rulesStore.getState().data.rules;
  await render(withRuntime(runtime, <AccountScreen onSignIn={() => {}} onBack={() => {}} />));

  await userEvent.press(screen.getByRole('button', { name: 'Delete account' }));
  await userEvent.press(screen.getByRole('button', { name: 'Delete account forever' }));
  await waitFor(() => expect(sessionStore.getState().data.session.kind).toBe('anonymous'));
  expect(order).toEqual(['subscription', 'analytics', 'server', 'auth']);
  expect(calls).toEqual([{ url: 'https://api.test/v1/user', method: 'DELETE' }]);
  expect(rulesStore.getState().data.rules).toEqual(originalRules);
  expect(screen.getByText('Your account has been deleted. Your on-device plan is still here.')).toBeTruthy();
  runtime.dispose();
});

test('a refused server deletion keeps the session and explains the retry', async () => {
  const runtime = createRuntime();
  await runtime.dev.load('signed-in-apple');
  const { client } = serverStub(503, [], '{"error":{"code":"ACCOUNT_DELETION_UNAVAILABLE"}}');
  runtime.auth = serverBackedAuth(runtime.auth, createUserApi(client));
  await render(withRuntime(runtime, <AccountScreen onSignIn={() => {}} onBack={() => {}} />));

  await userEvent.press(screen.getByRole('button', { name: 'Delete account' }));
  await userEvent.press(screen.getByRole('button', { name: 'Delete account forever' }));
  await waitFor(() =>
    expect(screen.getByText('Your account could not be deleted. Nothing has changed — please try again.')).toBeTruthy(),
  );
  expect(sessionStore.getState().data.session.kind).toBe('signedIn');
  runtime.dispose();
});

test('an anonymous session deletes its server data through the same endpoint', async () => {
  const runtime = createRuntime();
  await runtime.dev.load('multi-rule-overlap');
  const calls: { url: string; method: string }[] = [];
  runtime.auth = serverBackedAuth(runtime.auth, createUserApi(serverStub(204, calls).client));
  await render(withRuntime(runtime, <AccountScreen onSignIn={() => {}} onBack={() => {}} />));
  await userEvent.press(screen.getByRole('button', { name: 'Delete my data' }));
  await userEvent.press(screen.getByRole('button', { name: 'Delete my data forever' }));
  await waitFor(() => expect(calls).toEqual([{ url: 'https://api.test/v1/user', method: 'DELETE' }]));
  expect(sessionStore.getState().data.session.kind).toBe('anonymous');
  runtime.dispose();
});

test('support sends the real POST /v1/support payload without a gym name, coordinate or app name', async () => {
  const runtime = createRuntime();
  await runtime.dev.load('multi-rule-overlap');
  const calls: { url: string; method: string; body?: string }[] = [];
  runtime.support = createHttpSupportPort(serverStub(201, calls, '{"submissionId":"s1"}').client);
  await render(withRuntime(runtime, <SupportScreen />));

  await userEvent.type(screen.getByLabelText('Your message'), 'The lock stayed on at the gym');
  await userEvent.type(screen.getByLabelText('Your email'), 'alex@example.test');
  await userEvent.press(screen.getByRole('button', { name: 'Send message' }));
  await waitFor(() => expect(screen.getByRole('header', { name: 'Message sent' })).toBeTruthy());
  expect(calls).toHaveLength(1);
  expect(calls[0]).toMatchObject({ url: 'https://api.test/v1/support', method: 'POST' });
  const body = JSON.parse(calls[0].body!);
  expect(body).toMatchObject({
    category: 'problem',
    message: 'The lock stayed on at the gym',
    replyTo: 'alex@example.test',
    diagnostics: { ruleCount: rulesStore.getState().data.rules.length, permissions: { screenTime: 'granted' } },
  });
  expect(calls[0].body).not.toMatch(/Demo Gym|latitude|longitude|Instagram|gymPlaces/);
  runtime.dispose();
});

test('a rejected support request keeps the draft and names the reason', async () => {
  const runtime = createRuntime();
  await runtime.dev.load('fresh-install');
  runtime.support = createHttpSupportPort(serverStub(400, [], '{"error":{"code":"INVALID_SUPPORT_REQUEST"}}').client);
  await render(withRuntime(runtime, <SupportScreen />));
  await userEvent.type(screen.getByLabelText('Your message'), 'Hello');
  await userEvent.type(screen.getByLabelText('Your email'), 'alex@example.test');
  await userEvent.press(screen.getByRole('button', { name: 'Send message' }));
  await waitFor(() =>
    expect(screen.getByText("The server couldn't accept this message. Check it and try again.")).toBeTruthy(),
  );
  expect(screen.getByRole('button', { name: 'Not sent — tap to retry' })).toBeTruthy();
  expect(screen.getByLabelText('Your message').props.value).toBe('Hello');
  runtime.dispose();
});

test('a timed-out support request says so', async () => {
  const runtime = createRuntime();
  await runtime.dev.load('fresh-install');
  runtime.support = createHttpSupportPort(
    createApiClient({
      baseUrl: 'https://api.test',
      getAccessToken: async () => 'jwt',
      timeoutMs: 5,
      fetch: () => new Promise(() => {}),
    }),
  );
  await render(withRuntime(runtime, <SupportScreen />));
  await userEvent.type(screen.getByLabelText('Your message'), 'Hello');
  await userEvent.type(screen.getByLabelText('Your email'), 'alex@example.test');
  await userEvent.press(screen.getByRole('button', { name: 'Send message' }));
  await act(async () => {
    await new Promise((resolve) => setTimeout(resolve, 20));
  });
  expect(screen.getByText('The request timed out. Your message is still here — tap to retry.')).toBeTruthy();
  runtime.dispose();
});
