import { createExtensionDrain } from '../extensionDrain';
import { DiagnosticsLog } from '../DiagnosticsLog';

function memoryStorage() {
  const items = new Map<string, string>();
  return {
    getItem: async (key: string) => items.get(key) ?? null,
    setItem: async (key: string, value: string) => void items.set(key, value),
    removeItem: async (key: string) => void items.delete(key),
  };
}

const at = (iso: string) => new Date(iso);

function harness(events: { activityName: string; callbackName: string; eventName?: string; lastCalledAt: Date }[]) {
  const log = new DiagnosticsLog({ storage: memoryStorage(), now: () => 5_000 });
  const drain = createExtensionDrain({ log, getEvents: () => events });
  return { log, drain, entries: () => log.entries().filter((entry) => entry.event.startsWith('extension.')) };
}

describe('createExtensionDrain', () => {
  it('turns every extension callback into the entry the verifier reads', () => {
    const { drain, entries } = harness([
      { activityName: 'window-1', callbackName: 'intervalDidStart', lastCalledAt: at('2026-09-08T09:00:00.000Z') },
    ]);

    drain();

    expect(entries()).toEqual([
      {
        atMs: 5_000,
        event: 'extension.event',
        data: { kind: 'intervalDidStart', name: 'window-1', at: '2026-09-08T09:00:00.000Z' },
      },
    ]);
  });

  it('keeps the extension instant and stamps when the app drained it', () => {
    const { drain, entries } = harness([
      { activityName: 'window-1', callbackName: 'intervalDidEnd', lastCalledAt: at('2026-09-08T08:59:00.000Z') },
    ]);
    drain();
    expect(entries()[0].atMs).toBe(5_000);
    expect(entries()[0].data.at).toBe('2026-09-08T08:59:00.000Z');
  });

  it('names a threshold event by its event name, which is what the callback identifies', () => {
    const { drain, entries } = harness([
      {
        activityName: 'window-1',
        callbackName: 'eventDidReachThreshold',
        eventName: 'usage-30',
        lastCalledAt: at('2026-09-08T09:30:00.000Z'),
      },
    ]);
    drain();
    expect(entries()[0].data).toEqual({
      kind: 'eventDidReachThreshold',
      name: 'window-1:usage-30',
      at: '2026-09-08T09:30:00.000Z',
    });
  });

  it('reports each callback once, however many foregrounds follow it', () => {
    const events = [
      { activityName: 'window-1', callbackName: 'intervalDidStart', lastCalledAt: at('2026-09-08T09:00:00.000Z') },
    ];
    const { drain, entries } = harness(events);
    drain();
    drain();
    expect(entries()).toHaveLength(1);

    events[0] = { ...events[0], lastCalledAt: at('2026-09-08T10:00:00.000Z') };
    drain();
    expect(entries()).toHaveLength(2);
  });

  it('ignores a callback the extension has not made', () => {
    const { drain, entries } = harness([
      { activityName: 'window-1', callbackName: 'intervalDidStart', lastCalledAt: new Date(0) },
    ]);
    drain();
    expect(entries()).toEqual([]);
  });

  it('survives a device that cannot answer, because the app group is not there', () => {
    const log = new DiagnosticsLog({ storage: memoryStorage(), now: () => 5_000 });
    const drain = createExtensionDrain({
      log,
      getEvents: () => {
        throw new Error('no app group');
      },
    });
    expect(() => drain()).not.toThrow();
    expect(log.entries()).toEqual([]);
  });
});
