import { act, renderHook } from '@testing-library/react-native';
import { createRuntime } from '../../runtime/createRuntime';
import { AppRuntimeProvider } from '../../runtime/AppRuntimeProvider';
import { useLockDecision } from '../selectors';
test('advancing the fake clock updates the mounted lock selector across a window boundary', async () => {
  const runtime = createRuntime();
  await runtime.dev.load('home-before-window');
  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <AppRuntimeProvider runtime={runtime}>{children}</AppRuntimeProvider>
  );
  const view = await renderHook(() => useLockDecision(), { wrapper });
  expect(view.result.current.state).toBe('beforeWindow');
  await act(() => runtime.dev.advance(3600000));
  expect(view.result.current.state).toBe('locked');
  await view.unmount();
  runtime.dispose();
});
