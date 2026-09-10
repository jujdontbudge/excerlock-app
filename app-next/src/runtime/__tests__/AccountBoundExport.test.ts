import { createAccountBoundExport } from '../AccountBoundExport';

const canonical = (userId: string, generation: number) => ({
  kind: 'canonical' as const,
  userId,
  generation,
  ready: true,
  isAnonymous: false,
});

test('captures account before payload assembly and rejects an account switch during it', async () => {
  let identity = canonical('old', 1);
  let finish!: () => void;
  const exporter = { requestShare: jest.fn(async () => undefined) };
  const port = createAccountBoundExport(() => identity, exporter, () => false);
  const request = port.requestShare(async () => {
    await new Promise<void>((resolve) => { finish = resolve; });
    return {} as never;
  });
  await Promise.resolve();
  identity = canonical('new', 2);
  finish();
  await expect(request).rejects.toThrow('session changed');
  expect(exporter.requestShare).not.toHaveBeenCalled();
});

test('rejects deletion in the same generation before sharing assembled data', async () => {
  let identity: any = canonical('account', 4);
  const exporter = { requestShare: jest.fn(async () => undefined) };
  const port = createAccountBoundExport(() => identity, exporter, () => false);
  await expect(port.requestShare(async () => {
    identity = { ...identity, kind: 'deleting' };
    return {} as never;
  })).rejects.toThrow('session changed');
  expect(exporter.requestShare).not.toHaveBeenCalled();
});
