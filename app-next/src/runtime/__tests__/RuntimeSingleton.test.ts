import { RuntimeCleanupError, RuntimeSingleton } from '../RuntimeSingleton';
test('UI and headless callers construct one graph', async () => {
  const runtime = { disposeAsync: jest.fn(async () => {}) }, create = jest.fn(async () => runtime);
  const owner = new RuntimeSingleton(create);
  const ui = owner.get(), headless = owner.get();
  expect(ui).toBe(headless); expect(await ui).toBe(runtime); expect(create).toHaveBeenCalledTimes(1);
});
test('failed initialization permits retry without retaining a failed graph', async () => {
  const create = jest.fn().mockRejectedValueOnce(new Error('disk')).mockResolvedValue({ disposeAsync: async () => {} });
  const owner = new RuntimeSingleton(create);
  await expect(owner.get()).rejects.toThrow('disk'); await owner.get(); expect(create).toHaveBeenCalledTimes(2);
});
test('shutdown waits for in-flight creation and new boot waits for disposal', async () => {
  let build!: (runtime: { disposeAsync(): Promise<void> }) => void, finish!: () => void;
  const old = { disposeAsync: jest.fn(() => new Promise<void>(resolve => { finish = resolve; })) };
  const fresh = { disposeAsync: jest.fn(async () => {}) };
  const create = jest.fn().mockImplementationOnce(() => new Promise(resolve => { build = resolve; })).mockResolvedValue(fresh);
  const owner = new RuntimeSingleton(create); const first = owner.get(); await Promise.resolve();
  const shutdown = owner.dispose(), next = owner.get(); build(old); await first; await Promise.resolve();
  expect(create).toHaveBeenCalledTimes(1); finish(); await shutdown; expect(await next).toBe(fresh);
  expect(old.disposeAsync).toHaveBeenCalledTimes(1);
});

test('cleanup failure during construction blocks every later retry in this VM', async () => {
  const failure = new RuntimeCleanupError([new Error('native stop failed')]);
  const create = jest.fn().mockRejectedValue(failure);
  const owner = new RuntimeSingleton(create);
  await expect(owner.get()).rejects.toBe(failure);
  await expect(owner.get()).rejects.toBe(failure);
  await expect(owner.dispose()).rejects.toBe(failure);
  expect(create).toHaveBeenCalledTimes(1);
});

test('cleanup failure during disposal blocks concurrent and later startup', async () => {
  let failDispose!: (error: unknown) => void;
  const failure = new RuntimeCleanupError([new Error('client dispose failed')]);
  const runtime = { disposeAsync: jest.fn(() => new Promise<void>((_resolve, reject) => { failDispose = reject; })) };
  const create = jest.fn(async () => runtime);
  const owner = new RuntimeSingleton(create);
  await owner.get();
  const shutdown = owner.dispose();
  const concurrentGet = owner.get();
  await Promise.resolve();
  failDispose(failure);
  await expect(shutdown).rejects.toBe(failure);
  await expect(concurrentGet).rejects.toBe(failure);
  await expect(owner.get()).rejects.toBe(failure);
  await expect(owner.dispose()).rejects.toBe(failure);
  expect(create).toHaveBeenCalledTimes(1);
});
