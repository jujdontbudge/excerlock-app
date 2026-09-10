import { render, screen, userEvent } from '@testing-library/react-native';
import { AppRuntimeProvider } from '../../../runtime/AppRuntimeProvider';
import { createRuntime } from '../../../runtime/createRuntime';
import { SettingsScreen } from '../SettingsScreen';

test('export requires consent and sends the complete payload to the port', async () => {
  const runtime = createRuntime();
  await runtime.dev.load('multi-rule-overlap');
  runtime.dataExport.requestShare = jest.fn().mockResolvedValue(undefined);
  await render(
    <AppRuntimeProvider runtime={runtime}>
      <SettingsScreen navigate={jest.fn()} onDev={jest.fn()} />
    </AppRuntimeProvider>,
  );
  await userEvent.press(screen.getByRole('button', { name: 'Export my data' }));
  expect(runtime.dataExport.requestShare).not.toHaveBeenCalled();
  expect(screen.getByText(/profile, conditions, progress, earned unlocks and gym visits/)).toBeTruthy();
  await userEvent.press(screen.getByRole('button', { name: 'Create export' }));
  expect(runtime.dataExport.requestShare).toHaveBeenCalledWith(expect.objectContaining({
    exportedAt: expect.any(String),
    rules: expect.any(Array),
    days: expect.any(Array),
    earnedUnlocks: expect.any(Array),
    visits: expect.any(Array),
    profile: expect.any(Object),
  }));
  expect(await screen.findByRole('alert')).toHaveTextContent(/ready to share/i);
});
