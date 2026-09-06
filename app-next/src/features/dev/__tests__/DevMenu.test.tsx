import { render, screen, userEvent } from '@testing-library/react-native';
import { DevMenu } from '../DevMenu';
import { AppRuntimeProvider } from '../../../runtime/AppRuntimeProvider';
import { createRuntime } from '../../../runtime/createRuntime';
import { rulesStore } from '../../../state/rulesStore';
jest.mock('expo-router', () => ({
  useRouter: () => ({ push: jest.fn(), replace: jest.fn() }),
  useLocalSearchParams: () => ({}),
}));
test('scenario controls load a real fixture and adjust its clock', async () => {
  const runtime = createRuntime();
  await render(
    <AppRuntimeProvider runtime={runtime}>
      <DevMenu />
    </AppRuntimeProvider>,
  );
  await userEvent.press(screen.getByRole('button', { name: 'Load Walking goal · locked' }));
  expect(rulesStore.getState().data.rules).toHaveLength(1);
  await userEvent.press(screen.getByRole('button', { name: '+1 hour' }));
  expect(runtime.clock.now()).toBe('2026-09-07T16:00:00.000Z');
});
