import { act, renderHook } from '@testing-library/react-native';
import { useInteractiveHomeMarker } from '../useInteractiveHomeMarker';
const mockMark = jest.fn<boolean, []>();
jest.mock('../../../../modules/excerlock-startup', () => ({ markInteractiveHome: () => mockMark() }));
let callbacks = new Map<number, FrameRequestCallback>(), next = 1;
beforeEach(() => {
  mockMark.mockReset(); callbacks = new Map(); next = 1;
  global.requestAnimationFrame = jest.fn((cb: FrameRequestCallback) => { const id=next++; callbacks.set(id,cb); return id; });
  global.cancelAnimationFrame = jest.fn((id?: number | null) => { if (id != null) callbacks.delete(id); });
});
const runtime = { kind: 'real' } as never;
test('coalesces layouts and never marks after readiness is revoked or unmount', async () => {
  const hook=await renderHook<ReturnType<typeof useInteractiveHomeMarker>, { ready: boolean }>(
    ({ready}) => useInteractiveHomeMarker(runtime,ready),
    {initialProps:{ready:true}},
  );
  await act(() => { hook.result.current({} as never); hook.result.current({} as never); });
  expect(callbacks.size).toBe(1);
  const callback=[...callbacks.values()][0];
  await hook.rerender({ready:false});
  await act(() => callback(0));
  expect(mockMark).not.toHaveBeenCalled();
  await hook.rerender({ready:true});
  expect(callbacks.size).toBe(1);
  await hook.unmount(); expect(callbacks.size).toBe(0);
});
test('retries until native confirms the content marker preceded Home', async () => {
  mockMark.mockReturnValueOnce(false).mockReturnValueOnce(true);
  const hook=await renderHook(() => useInteractiveHomeMarker(runtime,true));
  await act(() => hook.result.current({} as never));
  let callback=[...callbacks.values()][0]; callbacks.clear(); await act(() => callback(0));
  callback=[...callbacks.values()][0]; callbacks.clear(); await act(() => callback(1));
  expect(mockMark).toHaveBeenCalledTimes(2);
});
test('stops retrying when the native marker is unavailable', async () => {
  mockMark.mockReturnValue(false);
  const warning = jest.spyOn(console, 'warn').mockImplementation(() => undefined);
  const hook=await renderHook(() => useInteractiveHomeMarker(runtime,true));
  await act(() => hook.result.current({} as never));
  for (let index=0; index<8; index += 1) {
    const callback=[...callbacks.values()][0]; callbacks.clear(); await act(() => callback(index));
  }
  expect(mockMark).toHaveBeenCalledTimes(8);
  expect(callbacks.size).toBe(0);
  expect(warning).toHaveBeenCalledTimes(1);
  warning.mockRestore();
});
test('contains native exceptions and stops after the bounded retries', async () => {
  mockMark.mockImplementation(() => { throw new Error('missing native implementation'); });
  const warning = jest.spyOn(console, 'warn').mockImplementation(() => undefined);
  const hook=await renderHook(() => useInteractiveHomeMarker(runtime,true));
  await act(() => hook.result.current({} as never));
  for (let index=0; index<8; index += 1) {
    const callback=[...callbacks.values()][0]; callbacks.clear();
    expect(() => callback(index)).not.toThrow();
  }
  expect(mockMark).toHaveBeenCalledTimes(8);
  expect(warning).toHaveBeenCalledTimes(1);
  warning.mockRestore();
});
test('never schedules or marks for a fake runtime', async () => {
  const fakeRuntime = { kind: 'fake' } as never;
  const hook=await renderHook(() => useInteractiveHomeMarker(fakeRuntime,true));
  await act(() => hook.result.current({} as never));
  expect(callbacks.size).toBe(0);
  expect(mockMark).not.toHaveBeenCalled();
});
