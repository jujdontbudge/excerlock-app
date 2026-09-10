import { createJsonExport, JsonExportDependencies } from '../JsonExport';

function setup(overrides: Partial<JsonExportDependencies> = {}) {
  const deps: JsonExportDependencies = {
    cacheDirectory: 'file:///cache/', randomId: () => '12345678-1234-1234-1234-123456789abc',
    isAvailable: jest.fn(async () => true), write: jest.fn(async () => {}),
    share: jest.fn(async () => {}), remove: jest.fn(async () => {}),
    isCurrent: () => true, ...overrides,
  };
  return { deps, port: createJsonExport(deps) };
}

test('writes JSON before sharing and removes temporary file after sheet dismissal', async () => {
  const events: string[] = [];
  const { deps, port } = setup({
    write: jest.fn(async () => { events.push('write'); }),
    share: jest.fn(async () => { events.push('share'); }),
    remove: jest.fn(async () => { events.push('remove'); }),
  });
  await expect(port.requestShare({ profile: 'private' })).resolves.toBeUndefined();
  expect(events).toEqual(['write', 'share', 'remove']);
  expect(deps.write).toHaveBeenCalledWith(expect.not.stringContaining('private'), JSON.stringify({ profile: 'private' }, null, 2));
});

test.each(['write', 'share'] as const)('%s failure cleans even a partial file', async (operation) => {
  const { deps, port } = setup({ [operation]: jest.fn(async () => { throw new Error('native failure'); }) });
  await expect(port.requestShare({})).rejects.toThrow('native failure');
  expect(deps.remove).toHaveBeenCalledTimes(1);
});

test('unavailable sharing never writes or uploads', async () => {
  const { deps, port } = setup({ isAvailable: async () => false });
  await expect(port.requestShare({})).rejects.toThrow('unavailable');
  expect(deps.write).not.toHaveBeenCalled();
  expect(deps.share).not.toHaveBeenCalled();
});

test('stale account after writing cannot expose data to share sheet', async () => {
  let current = true;
  const { deps, port } = setup({ isCurrent: () => current, write: async () => { current = false; } });
  await expect(port.requestShare({})).rejects.toThrow('session changed');
  expect(deps.share).not.toHaveBeenCalled();
  expect(deps.remove).toHaveBeenCalledTimes(1);
});

test('concurrent exports are rejected until cleanup completes', async () => {
  let finish!: () => void;
  const { port } = setup({ share: () => new Promise<void>((resolve) => { finish = resolve; }) });
  const first = port.requestShare({});
  await Promise.resolve(); await Promise.resolve(); await Promise.resolve();
  await expect(port.requestShare({})).rejects.toThrow('already open');
  finish(); await first;
});

test('cleanup errors are visible and release the busy guard', async () => {
  const remove = jest.fn().mockRejectedValueOnce(new Error('cleanup failed')).mockResolvedValue(undefined);
  const { port } = setup({ remove });
  await expect(port.requestShare({})).rejects.toThrow('cleanup failed');
  await expect(port.requestShare({})).resolves.toBeUndefined();
});

test('unsafe filename rejected before write', async () => {
  const { deps, port } = setup({ randomId: () => '../profile' });
  await expect(port.requestShare({})).rejects.toThrow('identifier');
  expect(deps.write).not.toHaveBeenCalled();
});
