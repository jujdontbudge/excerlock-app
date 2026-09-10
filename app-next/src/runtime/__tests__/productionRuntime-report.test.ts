const mockReportSentryError = jest.fn();
jest.mock('../observability/SentryCapture', () => ({ reportSentryError: mockReportSentryError }));
jest.mock('../detection/headlessRegistry', () => ({ registerHeadlessDetectionBootstrap: jest.fn() }));

import { reportRuntimeError } from '../productionRuntime';

test('lazily forwards the exact runtime error through the local capture binding', () => {
  const error = new Error('runtime failed');
  reportRuntimeError(error);
  expect(mockReportSentryError).toHaveBeenCalledWith(error);
});
