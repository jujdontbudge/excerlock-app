import { render, screen, fireEvent } from '@testing-library/react-native';
import { Preferences } from '../PreferencesPanel';
import { createRuntime } from '../../../runtime/createRuntime';
import { AppRuntimeProvider } from '../../../runtime/AppRuntimeProvider';
import { settingsStore } from '../../../state/settingsStore';
import { settingsCopy as c } from '../../../content/settings';
import { createPostHogAnalytics } from '../../../adapters/analytics';
import { recordingClient } from '../../../adapters/analytics/__tests__/recordingClient';

async function panel() {
  const runtime = createRuntime();
  await runtime.dev.load('home-locked-walking');
  await render(
    <AppRuntimeProvider runtime={runtime}>
      <Preferences navigate={() => undefined} />
    </AppRuntimeProvider>,
  );
  return runtime;
}

test('sharing usage analytics is on by default', () => {
  expect(settingsStore.getState().data.shareAnalytics).toBe(true);
});

test('the switch turns sharing off', async () => {
  settingsStore.getState().patch({ shareAnalytics: true });
  await panel();

  await fireEvent(screen.getByRole('switch', { name: c.shareAnalytics }), 'valueChange', false);

  expect(settingsStore.getState().data.shareAnalytics).toBe(false);
});

test('the switch turns sharing back on', async () => {
  settingsStore.getState().patch({ shareAnalytics: false });
  await panel();

  await fireEvent(screen.getByRole('switch', { name: c.shareAnalytics }), 'valueChange', true);

  expect(settingsStore.getState().data.shareAnalytics).toBe(true);
});

test('the row says what is shared and what never is', async () => {
  await panel();
  expect(screen.getByText(c.shareAnalyticsBody)).toBeTruthy();
  for (const promise of ['gyms', 'location', 'app choices', 'health data']) {
    expect(c.shareAnalyticsBody).toContain(promise);
  }
});

test('an adapter reading the store stops capturing the moment the switch goes off', () => {
  settingsStore.getState().patch({ shareAnalytics: true });
  const client = recordingClient();
  const analytics = createPostHogAnalytics(client, {
    isEnabled: () => settingsStore.getState().data.shareAnalytics,
    isAnonymous: () => false,
  });

  analytics.track('shields_applied');
  settingsStore.getState().patch({ shareAnalytics: false });
  analytics.track('shields_lifted');
  analytics.screen('O01');

  expect(client.captured).toEqual([{ event: 'shields_applied', props: {} }]);
});
