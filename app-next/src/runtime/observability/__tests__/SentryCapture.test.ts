jest.mock('@sentry/react-native', () => ({ captureException: jest.fn(), init: jest.fn() }));

import { reportSentryError } from '../SentryCapture';

const { captureException: mockCaptureException, init: mockInit } = jest.requireMock('@sentry/react-native') as {
  captureException: jest.Mock;
  init: jest.Mock;
};

test('forwards the exact error without initializing the SDK', () => {
  const error = new Error('runtime failed');
  reportSentryError(error);
  expect(mockCaptureException).toHaveBeenCalledTimes(1);
  expect(mockCaptureException).toHaveBeenCalledWith(error);
  expect(mockInit).not.toHaveBeenCalled();
});
