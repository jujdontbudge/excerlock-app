import { createRuntime } from '../createRuntime';
import * as realRuntime from '../realRuntime';

test('uses the local fake runtime by default', () => {
  expect(createRuntime().kind).toBe('fake');
});

test('keeps the fake for any mode but the one that names the real runtime', () => {
  expect(createRuntime('demo').kind).toBe('fake');
  expect(createRuntime(undefined).kind).toBe('fake');
});

test('builds the real runtime only when the build asked for it', () => {
  const built = { kind: 'real', dispose: jest.fn() } as never;
  const create = jest.spyOn(realRuntime, 'createRealRuntime').mockReturnValue(built);
  expect(createRuntime('real')).toBe(built);
  expect(create).toHaveBeenCalledWith(expect.objectContaining({ report: expect.any(Function) }));
  create.mockRestore();
});
