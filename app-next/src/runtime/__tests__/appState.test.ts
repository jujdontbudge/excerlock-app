import { createAppStateOwner } from '../appState';

function recordingSource() {
  const listeners: ((state: string) => void)[] = [];
  const removed: number[] = [];
  return {
    subscriptions: 0,
    listeners,
    removed,
    source: {
      addEventListener(_event: 'change', callback: (state: string) => void) {
        listeners.push(callback);
        const index = listeners.length - 1;
        return {
          remove: () => removed.push(index),
        };
      },
    },
  };
}

describe('createAppStateOwner', () => {
  it('holds one subscription however many owners take a foreground signal', () => {
    const recorder = recordingSource();
    const owner = createAppStateOwner(recorder.source);
    const enforcement = jest.fn();
    const sync = jest.fn();
    owner.addEventListener('change', enforcement);
    owner.addEventListener('change', sync);
    expect(recorder.listeners).toHaveLength(1);

    recorder.listeners[0]('active');
    expect(enforcement).toHaveBeenCalledWith('active');
    expect(sync).toHaveBeenCalledWith('active');
    owner.dispose();
  });

  it('passes every transition through, not only the foreground one', () => {
    const recorder = recordingSource();
    const owner = createAppStateOwner(recorder.source);
    const seen: string[] = [];
    owner.addEventListener('change', (state) => seen.push(state));
    ['active', 'inactive', 'background'].forEach((state) => recorder.listeners[0](state));
    expect(seen).toEqual(['active', 'inactive', 'background']);
    owner.dispose();
  });

  it('stops delivering to an owner that has gone away', () => {
    const recorder = recordingSource();
    const owner = createAppStateOwner(recorder.source);
    const gone = jest.fn();
    owner.addEventListener('change', gone).remove();
    recorder.listeners[0]('active');
    expect(gone).not.toHaveBeenCalled();
    owner.dispose();
  });

  it('releases the underlying subscription when the app tears down', () => {
    const recorder = recordingSource();
    const owner = createAppStateOwner(recorder.source);
    const seen = jest.fn();
    owner.addEventListener('change', seen);
    owner.dispose();
    recorder.listeners[0]('active');
    expect(recorder.removed).toEqual([0]);
    expect(seen).not.toHaveBeenCalled();
  });

  it('survives an owner whose handler throws, so the next one still hears', () => {
    const recorder = recordingSource();
    const owner = createAppStateOwner(recorder.source);
    const after = jest.fn();
    owner.addEventListener('change', () => {
      throw new Error('bad owner');
    });
    owner.addEventListener('change', after);
    recorder.listeners[0]('active');
    expect(after).toHaveBeenCalledWith('active');
    owner.dispose();
  });
});
