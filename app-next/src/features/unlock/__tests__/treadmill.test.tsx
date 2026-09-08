import { act, render, screen, fireEvent } from '@testing-library/react-native';
import { TreadmillUnlockScreen } from '../TreadmillUnlockScreen';
import { AppRuntimeProvider } from '../../../runtime/AppRuntimeProvider';
import { createRuntime } from '../../../runtime/createRuntime';
const mockRouter = { back: jest.fn() };
jest.mock('expo-router', () => ({ useRouter: () => mockRouter }));
test('the dev menu treadmill scenario reaches preview mode without starting a real walking session', async () => {
  jest.useFakeTimers();
  const runtime = createRuntime();
  await runtime.dev.load('unlock-treadmill-scan');
  const start = jest.spyOn(runtime.walking, 'start');
  await render(
    <AppRuntimeProvider runtime={runtime}>
      <TreadmillUnlockScreen preview />
    </AppRuntimeProvider>,
  );
  await act(() => jest.advanceTimersByTime(5000));
  await act(() => jest.advanceTimersByTime(1600));
  expect(screen.getByRole('button', { name: 'Done' })).toBeTruthy();
  expect(start).not.toHaveBeenCalled();
  runtime.dispose();
  jest.useRealTimers();
});
test('camera denial offers handheld walking instead of granting scan credit', async () => {
  jest.useFakeTimers();
  const runtime = createRuntime(); await runtime.dev.load('unlock-treadmill-denied');
  const start = jest.spyOn(runtime.walking, 'start');
  await render(<AppRuntimeProvider runtime={runtime}><TreadmillUnlockScreen ruleId="walk" /></AppRuntimeProvider>);
  expect(screen.getByRole('header', { name: 'Camera access is off' })).toBeTruthy();
  await fireEvent.press(screen.getByRole('button', { name: 'Continue with phone in hand' }));
  expect(start).toHaveBeenCalledTimes(2);
  expect(runtime.dev.snapshot().placement).toBe('handheld');
  await act(() => runtime.dispose()); jest.useRealTimers();
});
