import { startRuntimeSync } from '../startRuntimeSync';
import { createRuntime } from '../createRuntime';
import { historyStore } from '../../state/historyStore';
import * as host from '../../adapters/sync/SyncHost';

function appStateSource() {
  let listener: ((state: string) => void) | undefined;
  return {
    source: {
      addEventListener: (_event: 'change', callback: (state: string) => void) => {
        listener = callback;
        return { remove: jest.fn() };
      },
    },
    background: () => listener?.('background'),
  };
}

describe('startRuntimeSync', () => {
  it('does not back up a demo runtime', () => {
    const startSync = jest.spyOn(host, 'startSync');
    const runtime = createRuntime();
    startRuntimeSync(runtime, { appState: appStateSource().source })();
    expect(startSync).not.toHaveBeenCalled();
    startSync.mockRestore();
    runtime.dispose();
  });

  it('gives the sync host the app-state source, the history bridge and a recovery for a rejected session', async () => {
    const stop = jest.fn();
    const startSync = jest
      .spyOn(host, 'startSync')
      .mockReturnValue({ ready: Promise.resolve(), flush: async () => undefined, stop });
    const onForeground = jest.fn(async () => undefined);
    const runtime = { ...createRuntime(), kind: 'real' as const, onForeground };
    const appState = appStateSource();

    const unsubscribe = startRuntimeSync(runtime, { appState: appState.source });

    const options = startSync.mock.calls[0][1];
    expect(options?.appState).toBe(appState.source);
    expect(options?.history?.get()).toEqual(historyStore.getState().data.days);
    options?.onAuthRequired?.();
    expect(onForeground).toHaveBeenCalledTimes(1);

    unsubscribe();
    expect(stop).toHaveBeenCalledTimes(1);
    startSync.mockRestore();
    runtime.dispose();
  });
});
