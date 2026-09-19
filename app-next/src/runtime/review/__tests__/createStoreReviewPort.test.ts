import { createStoreReviewPort, type StoreReviewNative } from '../createStoreReviewPort';

function native(overrides: Partial<StoreReviewNative> = {}): StoreReviewNative & { requestReview: jest.Mock; isAvailableAsync: jest.Mock } {
  return {
    isAvailableAsync: jest.fn(async () => true),
    requestReview: jest.fn(async () => undefined),
    ...overrides,
  } as StoreReviewNative & { requestReview: jest.Mock; isAvailableAsync: jest.Mock };
}

test('requestReview asks StoreKit once and reports that it asked, nothing more', async () => {
  const storeKit = native();
  const port = createStoreReviewPort(storeKit);
  await expect(port.requestReview()).resolves.toBe('requested');
  expect(storeKit.requestReview).toHaveBeenCalledTimes(1);
});

test('a rejected native call (no foreground scene) is reported as failed, never thrown at the caller', async () => {
  const storeKit = native({ requestReview: jest.fn(async () => { throw new Error('Cannot determine the current window scene'); }) });
  const port = createStoreReviewPort(storeKit);
  await expect(port.requestReview()).resolves.toBe('failed');
});

test('availability is StoreKit’s own answer; a TestFlight install still gets the sheet on request', async () => {
  const storeKit = native({ isAvailableAsync: jest.fn(async () => false) });
  const port = createStoreReviewPort(storeKit);
  await expect(port.isAvailable()).resolves.toBe(false);
  await expect(port.requestReview()).resolves.toBe('requested');
  expect(storeKit.requestReview).toHaveBeenCalledTimes(1);
});

test('a native surface without the review function is unavailable and fails closed', async () => {
  const port = createStoreReviewPort({} as StoreReviewNative);
  await expect(port.isAvailable()).resolves.toBe(false);
  await expect(port.requestReview()).resolves.toBe('failed');
});
