import { createHttpReachability, REACHABILITY_CACHE_MS } from '../reachability';

describe('createHttpReachability', () => {
  const build = (fetcher: jest.Mock, now = { value: 0 }) =>
    createHttpReachability({ baseUrl: 'https://api.test', fetch: fetcher, now: () => now.value });

  it('is online when the health endpoint answers at all', async () => {
    const fetcher = jest.fn(async () => ({ status: 503 }));
    await expect(build(fetcher).isOnline()).resolves.toBe(true);
    expect(fetcher).toHaveBeenCalledWith('https://api.test/v1/health', expect.objectContaining({ method: 'GET' }));
  });

  it('is offline when the request cannot leave the device', async () => {
    const fetcher = jest.fn(async () => {
      throw new Error('Network request failed');
    });
    await expect(build(fetcher).isOnline()).resolves.toBe(false);
  });

  it('answers repeated questions from one probe', async () => {
    const now = { value: 0 };
    const fetcher = jest.fn(async () => ({ status: 200 }));
    const reachability = build(fetcher, now);
    await reachability.isOnline();
    now.value += REACHABILITY_CACHE_MS - 1;
    await reachability.isOnline();
    expect(fetcher).toHaveBeenCalledTimes(1);
    now.value += 2;
    await reachability.isOnline();
    expect(fetcher).toHaveBeenCalledTimes(2);
  });

  it('shares one in-flight probe between concurrent callers', async () => {
    let settle: (value: { status: number }) => void = () => undefined;
    const fetcher = jest.fn(() => new Promise<{ status: number }>((resolve) => (settle = resolve)));
    const reachability = build(fetcher);
    const both = Promise.all([reachability.isOnline(), reachability.isOnline()]);
    settle({ status: 200 });
    await expect(both).resolves.toEqual([true, true]);
    expect(fetcher).toHaveBeenCalledTimes(1);
  });

  it('gives up on a probe that never answers', async () => {
    jest.useFakeTimers();
    const fetcher = jest.fn(() => new Promise<{ status: number }>(() => undefined));
    const pending = build(fetcher).isOnline();
    jest.runOnlyPendingTimers();
    await expect(pending).resolves.toBe(false);
    jest.useRealTimers();
  });
});
