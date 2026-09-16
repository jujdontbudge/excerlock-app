import { renderHook } from '@testing-library/react-native';
import { useScreenTracking } from '../useScreenTracking';

// jest hoists these registrations above the import graph, so the hook always
// sees the pathname and runtime the test drives.
const mockScreen = jest.fn();
const mockRuntime = { analytics: { screen: mockScreen } };
let mockPathname = '/home';

jest.mock('expo-router', () => ({ usePathname: () => mockPathname }));
jest.mock('../../AppRuntimeProvider', () => ({ useRuntime: () => mockRuntime }));

beforeEach(() => {
  mockScreen.mockClear();
  mockPathname = '/home';
});

test('one root subscriber reports every route change and skips non-production routes', async () => {
  const hook = await renderHook(() => useScreenTracking());
  expect(mockScreen).toHaveBeenCalledTimes(1);
  expect(mockScreen).toHaveBeenLastCalledWith('/home');

  // A re-render of the same route is not a navigation.
  await hook.rerender({});
  expect(mockScreen).toHaveBeenCalledTimes(1);

  mockPathname = '/settings/account';
  await hook.rerender({});
  expect(mockScreen).toHaveBeenLastCalledWith('/settings/account');

  mockPathname = '/setup/X4';
  await hook.rerender({});
  expect(mockScreen).toHaveBeenLastCalledWith('/setup/X4');

  for (const excluded of ['/', '/dev', '/linked-trace']) {
    mockPathname = excluded;
    await hook.rerender({});
  }
  expect(mockScreen).toHaveBeenCalledTimes(3);
});
