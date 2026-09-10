import { render, screen, fireEvent } from '@testing-library/react-native';
import { PreferencesScreen } from '../PreferencesScreen';
import { AppRuntimeProvider } from '../../../runtime/AppRuntimeProvider';
import { createRuntime } from '../../../runtime/createRuntime';
import { settingsStore } from '../../../state/settingsStore';
test('analytics switch persists opt-out and awaits SDK consent without disabling crash diagnostics', async () => {
  const runtime = createRuntime();
  settingsStore.getState().patch({ analyticsEnabled: true });
  const setEnabled = jest.fn(async () => {}); runtime.analytics.setEnabled = setEnabled;
  await render(<AppRuntimeProvider runtime={runtime}><PreferencesScreen navigate={() => {}} onBack={() => {}} /></AppRuntimeProvider>);
  await fireEvent(screen.getByRole('switch', { name: 'Usage analytics' }), 'valueChange', false);
  expect(settingsStore.getState().data.analyticsEnabled).toBe(false);
  expect(setEnabled).toHaveBeenCalledWith(false);
  expect(screen.getByText('Help improve ExcerLock. Crash diagnostics remain enabled.')).toBeTruthy();
});
