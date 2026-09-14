import { render, screen } from '@testing-library/react-native';
import { Text } from 'react-native';
import type { Runtime } from '../Runtime';

const mockCreateRuntime = jest.fn();
jest.mock('../createRuntime', () => ({ createRuntime: (mode: unknown) => mockCreateRuntime(mode) }));
jest.mock('../productionRuntime', () => ({ reportRuntimeError: jest.fn() }));
// A Release research bundle embeds extra.environment = 'lab'. There is no
// Metro manifest to override it, so this is the exact value the installed
// standalone Trace Lab reads at boot.
jest.mock('expo-constants', () => ({
  __esModule: true,
  default: { expoConfig: { extra: { environment: 'lab' } } },
}));
jest.mock('../../screentime/native/createNativeScreenTimePort', () => ({ NativeScreenTimePickerHost: () => null }));
jest.mock('../NativeRuntimeEffects', () => ({ NativeRuntimeEffects: () => null }));

import { AppRuntimeProvider, useRuntime } from '../AppRuntimeProvider';

function Child() {
  const runtime = useRuntime();
  return <Text>{runtime.kind === 'real' ? 'Real child' : 'Fake child'}</Text>;
}

beforeEach(() => jest.clearAllMocks());

test('a non-development lab bundle boots the real runtime instead of throwing without a dev server', async () => {
  const globalWithDev = global as { __DEV__?: boolean };
  const previous = globalWithDev.__DEV__;
  globalWithDev.__DEV__ = false; // the Release bundle has no dev client or Metro
  try {
    mockCreateRuntime.mockResolvedValue({ kind: 'real' } as Runtime);
    await render(<AppRuntimeProvider><Child /></AppRuntimeProvider>);
    expect(await screen.findByText('Real child')).toBeTruthy();
    expect(mockCreateRuntime).toHaveBeenCalledWith('real');
    expect(screen.queryByText(/Starting ExcerLock/)).toBeNull();
  } finally {
    globalWithDev.__DEV__ = previous;
  }
});

test('a development lab bundle still boots the real runtime, never demo services', async () => {
  mockCreateRuntime.mockResolvedValue({ kind: 'real' } as Runtime);
  await render(<AppRuntimeProvider><Child /></AppRuntimeProvider>);
  expect(await screen.findByText('Real child')).toBeTruthy();
  expect(mockCreateRuntime).toHaveBeenCalledWith('real');
});
