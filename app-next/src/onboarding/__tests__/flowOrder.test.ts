import { preBranch, tail } from '../flow';
import { createOnboardingFlowPort, parseOnboardingFlowOrder } from '../flowOrder';
import { isOnboardingStepId } from '../stepId';

const swapped = ['O01', 'O03', 'O02', ...preBranch.filter((step) => !['O01', 'O02', 'O03'].includes(step))];
const dropped = preBranch.filter((step) => step !== 'O05' && step !== 'O06');

test.each([
  [{ preBranch: swapped }, swapped, [...tail]],
  [{ preBranch: dropped }, dropped, [...tail]],
  [{ tail: ['S1', 'P'] }, [...preBranch], ['S1', 'P']],
  [{ preBranch: dropped, tail: ['T4', 'S2', 'P'] }, dropped, ['T4', 'S2', 'P']],
] as const)('accepts a reordered or reduced rail: %j', (payload, expectedPre, expectedTail) => {
  expect(parseOnboardingFlowOrder(payload)).toEqual({ preBranch: expectedPre, tail: expectedTail });
});

test('the tail must still end at the paywall so the rail cannot strand the user', () => {
  expect(parseOnboardingFlowOrder({ tail: ['S1', 'S2'] })).toBeNull();
  expect(parseOnboardingFlowOrder({ tail: ['P', 'S1'] })).toBeNull();
  expect(parseOnboardingFlowOrder({ tail: [] })).toBeNull();
});

test.each([
  [undefined],
  [null],
  [42],
  ['preBranch'],
  [[]],
  [[...preBranch]],
  [{}],
  [{ preBranch: 'O01' }],
  [{ preBranch: [] }],
  [{ preBranch: ['O01', 'O01'] }],
  [{ preBranch: ['O99'] }],
  [{ preBranch: ['X1'] }],
  [{ preBranch: ['W1'] }],
  [{ preBranch: ['O19'] }],
  [{ tail: ['O01'] }],
  [{ tail: ['S3', 'S1', 'P', 'P'] }],
  [{ preBranch: swapped, extra: true }],
  [{ preBranch: swapped, tail: ['S1'] }],
] as const)('rejects a malformed payload: %j', (payload) => {
  expect(parseOnboardingFlowOrder(payload)).toBeNull();
});

test('the parser and the persisted store share one step-id vocabulary', () => {
  expect(isOnboardingStepId('O01')).toBe(true);
  expect(isOnboardingStepId('O20')).toBe(true);
  expect(isOnboardingStepId('P')).toBe(true);
  expect(isOnboardingStepId('O07')).toBe(true);
  expect(isOnboardingStepId('O21')).toBe(true);
  expect(isOnboardingStepId('O22')).toBe(true);
  expect(isOnboardingStepId('O23')).toBe(false);
  expect(isOnboardingStepId('X1')).toBe(false);
  expect(isOnboardingStepId('O1')).toBe(false);
  expect(isOnboardingStepId(7)).toBe(false);
});

test('the port reads once per run and publishes the validated order', async () => {
  const readPayload = jest.fn(async () => ({ preBranch: swapped }));
  const port = createOnboardingFlowPort({ readPayload });
  const seen: (unknown)[] = [];
  const stop = port.subscribe((order) => seen.push(order));
  expect(port.order()).toBeNull();
  await port.load();
  expect(port.order()).toEqual({ preBranch: swapped, tail: [...tail] });
  expect(seen).toEqual([{ preBranch: swapped, tail: [...tail] }]);
  expect(readPayload).toHaveBeenCalledTimes(1);
  stop();
  await port.load();
  expect(readPayload).toHaveBeenCalledTimes(1);
  expect(seen).toHaveLength(1);
});

test('concurrent loads share one read and a throwing or malformed answer stays bundled', async () => {
  const readPayload = jest.fn(async () => undefined);
  const port = createOnboardingFlowPort({ readPayload });
  await Promise.all([port.load(), port.load()]);
  expect(readPayload).toHaveBeenCalledTimes(1);
  expect(port.order()).toBeNull();

  const failing = createOnboardingFlowPort({
    readPayload: async () => {
      throw new Error('flags offline');
    },
  });
  await expect(failing.load()).resolves.toBeNull();
  expect(failing.order()).toBeNull();

  const malformed = createOnboardingFlowPort({ readPayload: async () => ({ preBranch: ['nope'] }) });
  await malformed.load();
  expect(malformed.order()).toBeNull();
});

test('a first read before the identity spine still applies the rail after awaitReady', async () => {
  const readPayload = jest
    .fn<Promise<unknown>, []>()
    .mockResolvedValueOnce(undefined)
    .mockResolvedValueOnce({ preBranch: swapped });
  const awaitReady = jest.fn(async () => undefined);
  const port = createOnboardingFlowPort({ readPayload, awaitReady });
  await port.load();
  expect(awaitReady).toHaveBeenCalledTimes(1);
  expect(readPayload).toHaveBeenCalledTimes(2);
  expect(port.order()).toEqual({ preBranch: swapped, tail: [...tail] });
});

test('a rejected identity wait falls back to the bundled order without a second read', async () => {
  const readPayload = jest.fn(async () => undefined);
  const awaitReady = jest.fn(async () => {
    throw new Error('identity not ready');
  });
  const port = createOnboardingFlowPort({ readPayload, awaitReady });
  await expect(port.load()).resolves.toBeNull();
  expect(readPayload).toHaveBeenCalledTimes(1);
  expect(port.order()).toBeNull();
});
