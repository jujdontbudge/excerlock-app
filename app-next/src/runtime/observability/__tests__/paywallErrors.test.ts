const mockReportSentryError = jest.fn();
jest.mock('../SentryCapture', () => ({ reportSentryError: mockReportSentryError }));
jest.mock('../../detection/headlessRegistry', () => ({ registerHeadlessDetectionBootstrap: jest.fn() }));

import type { AnalyticsPort } from '../../../ports/AnalyticsPort';
import { reportPaywallError } from '../paywallErrors';

function analytics() {
  const track = jest.fn();
  const port: AnalyticsPort = { track, screen: jest.fn(), identify: jest.fn(async () => {}), reset: jest.fn(async () => {}) };
  return { port, track };
}

test('captures the failure in Sentry and emits one client paywall_error event', () => {
  const error = new Error('plans failed');
  const { port, track } = analytics();
  reportPaywallError({ analytics: port }, error, 'load');
  expect(mockReportSentryError).toHaveBeenCalledWith(error);
  expect(track).toHaveBeenCalledWith('paywall_error', { operation: 'load' });
});

test('keeps the operation name on every paywall operation', () => {
  const error = new Error('restore failed');
  const { port, track } = analytics();
  reportPaywallError({ analytics: port }, error, 'restore');
  expect(mockReportSentryError).toHaveBeenCalledWith(error);
  expect(track).toHaveBeenCalledWith('paywall_error', { operation: 'restore' });
});
