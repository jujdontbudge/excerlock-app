import { act, fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { Text } from 'react-native';
import type { Runtime } from '../Runtime';

const mockCreateRuntime = jest.fn();
const mockReportRuntimeError = jest.fn();
jest.mock('../createRuntime', () => ({ createRuntime: (mode: unknown) => mockCreateRuntime(mode) }));
jest.mock('../environment', () => ({ runtimeMode: () => 'real' }));
jest.mock('../productionRuntime', () => ({ reportRuntimeError: (error: unknown) => mockReportRuntimeError(error) }));
jest.mock('../../screentime/native/createNativeScreenTimePort', () => ({ NativeScreenTimePickerHost: () => null }));

import { AppRuntimeProvider, useRuntime } from '../AppRuntimeProvider';

function Child() {
  const runtime = useRuntime();
  return <Text>{runtime.kind === 'real' ? 'Real child' : 'Fake child'}</Text>;
}

const runtime = (kind: 'real' | 'fake', dispose = jest.fn()): Runtime =>
  ({ kind, dispose } as unknown as Runtime);

beforeEach(() => jest.clearAllMocks());

test('production boot renders the styled pending state until the real singleton resolves', async () => {
  let resolve!: (value: Runtime) => void;
  mockCreateRuntime.mockReturnValue(new Promise<Runtime>((done) => { resolve = done; }));
  await render(<AppRuntimeProvider><Child /></AppRuntimeProvider>);
  expect(screen.getByText('Starting ExcerLock…')).toBeTruthy();
  expect(screen.getByLabelText('Starting ExcerLock')).toBeTruthy();
  expect(screen.queryByText('Real child')).toBeNull();
  await act(async () => resolve(runtime('real')));
  expect(await screen.findByText('Real child')).toBeTruthy();
  expect(mockCreateRuntime).toHaveBeenCalledWith('real');
});

test('rejection shows generic recovery copy and retry can resolve without exposing raw errors', async () => {
  const raw = new Error('secret native module path');
  mockCreateRuntime.mockRejectedValueOnce(raw).mockResolvedValueOnce(runtime('real'));
  await render(<AppRuntimeProvider><Child /></AppRuntimeProvider>);
  expect(await screen.findByText('ExcerLock could not finish starting. Your saved data has not been cleared.')).toBeTruthy();
  expect(screen.queryByText(/secret native module path/i)).toBeNull();
  expect(mockReportRuntimeError).toHaveBeenCalledWith(raw);
  await act(async () => fireEvent.press(screen.getByText('Try again')));
  expect(await screen.findByText('Real child')).toBeTruthy();
  expect(mockCreateRuntime).toHaveBeenCalledTimes(2);
});

test('unmount during production boot neither disposes the shared VM singleton nor updates the dead tree', async () => {
  let resolve!: (value: Runtime) => void;
  const dispose = jest.fn();
  mockCreateRuntime.mockReturnValue(new Promise<Runtime>((done) => { resolve = done; }));
  const view = await render(<AppRuntimeProvider><Child /></AppRuntimeProvider>);
  await view.unmount();
  resolve(runtime('real', dispose));
  await waitFor(() => expect(mockCreateRuntime).toHaveBeenCalledTimes(1));
  await Promise.resolve();
  expect(dispose).not.toHaveBeenCalled();
});

test('a provided fake keeps synchronous behavior and is disposed on provider unmount', async () => {
  const dispose = jest.fn();
  const view = await render(<AppRuntimeProvider runtime={runtime('fake', dispose)}><Child /></AppRuntimeProvider>);
  expect(screen.getByText('Fake child')).toBeTruthy();
  expect(mockCreateRuntime).not.toHaveBeenCalled();
  await view.unmount();
  expect(dispose).toHaveBeenCalledTimes(1);
});
