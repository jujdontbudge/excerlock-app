import { act, renderHook } from '@testing-library/react-native';
import { createRuntime } from '../../runtime/createRuntime';
import { AppRuntimeProvider } from '../../runtime/AppRuntimeProvider';
import { useLockDecision, useRuntimeStatus } from '../selectors';
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

test('production-safe runtime status exposes hydration and history without dev controls', async () => {
  const runtime = createRuntime();
  await runtime.status.ready();
  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <AppRuntimeProvider runtime={runtime}>{children}</AppRuntimeProvider>
  );
  const view = await renderHook(() => useRuntimeStatus(), { wrapper });
  expect(view.result.current).toMatchObject({ hydrated: true, loading: false });
  expect(Array.isArray(view.result.current.history)).toBe(true);
  view.unmount();
  runtime.dispose();
});
