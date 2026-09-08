import { DIAGNOSTICS_FILE, mirrorToFile } from '../logFile';
import { DiagnosticsLog } from '../DiagnosticsLog';

function memoryStorage() {
  const items = new Map<string, string>();
  return {
    getItem: async (key: string) => items.get(key) ?? null,
    setItem: async (key: string, value: string) => void items.set(key, value),
    removeItem: async (key: string) => void items.delete(key),
  };
}

function sinkDouble() {
  const writes: { path: string; contents: string }[] = [];
  return {
    writes,
    sink: { write: async (path: string, contents: string) => void writes.push({ path, contents }) },
  };
}

describe('mirrorToFile', () => {
  it('names the file the device runbook pulls', () => {
    expect(DIAGNOSTICS_FILE).toBe('diagnostics/latest.log');
  });

  it('writes the whole log where devicectl can copy it from, on every flush', async () => {
    const log = new DiagnosticsLog({ storage: memoryStorage(), now: () => 1_000 });
    const { sink, writes } = sinkDouble();
    const stop = mirrorToFile(log, sink);
    log.append('app.launch', { runtime: 'real' });

    await log.flush();

    expect(writes).toEqual([
      { path: DIAGNOSTICS_FILE, contents: '1000\tapp.launch\t{"runtime":"real"}' },
    ]);
    stop();
  });

  it('leaves the file empty rather than stale when the log is cleared', async () => {
    const log = new DiagnosticsLog({ storage: memoryStorage(), now: () => 1_000 });
    const { sink, writes } = sinkDouble();
    const stop = mirrorToFile(log, sink);
    log.append('app.launch', {});
    await log.flush();
    await log.clear();

    expect(writes.at(-1)).toEqual({ path: DIAGNOSTICS_FILE, contents: '' });
    stop();
  });

  it('keeps recording when the file cannot be written', async () => {
    const log = new DiagnosticsLog({ storage: memoryStorage(), now: () => 1_000 });
    const stop = mirrorToFile(log, {
      write: async () => {
        throw new Error('read-only volume');
      },
    });
    log.append('app.launch', {});

    await expect(log.flush()).resolves.toBeUndefined();
    expect(log.entries()).toHaveLength(1);
    stop();
  });

  it('stops mirroring once the app tears the recorder down', async () => {
    const log = new DiagnosticsLog({ storage: memoryStorage(), now: () => 1_000 });
    const { sink, writes } = sinkDouble();
    mirrorToFile(log, sink)();
    log.append('app.launch', {});
    await log.flush();

    expect(writes).toEqual([]);
  });
});
