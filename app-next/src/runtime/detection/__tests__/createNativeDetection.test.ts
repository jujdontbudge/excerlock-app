import { stopNativeDetection } from '../createNativeDetection';

test('native stop attempts every owner and aggregates service and disposal failures', async () => {
  const serviceError = new Error('service stop failed');
  const locationError = new Error('location dispose failed');
  const owned = {
    unregisterHeadless: jest.fn(() => {}),
    service: { stop: jest.fn(async () => { throw serviceError; }) },
    rawMotion: { dispose: jest.fn(() => {}) },
    rawPlacement: { dispose: jest.fn(() => {}) },
    location: { dispose: jest.fn(() => { throw locationError; }) },
  };

  const stopped = stopNativeDetection(owned);
  await expect(stopped).rejects.toMatchObject({ errors: [serviceError, locationError] });
  expect(owned.unregisterHeadless).toHaveBeenCalledTimes(1);
  expect(owned.rawMotion.dispose).toHaveBeenCalledTimes(1);
  expect(owned.rawPlacement.dispose).toHaveBeenCalledTimes(1);
  expect(owned.location.dispose).toHaveBeenCalledTimes(1);
});
