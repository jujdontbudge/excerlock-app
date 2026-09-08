import { render, screen } from '@testing-library/react-native';
import { Text } from 'react-native';
import * as Sentry from '@sentry/react-native';
import { AppErrorBoundary } from '../../features/launch/AppErrorBoundary';
import { reportError } from '../reportError';

const captureException = Sentry.captureException as jest.Mock;

beforeEach(() => captureException.mockClear());

function Throws(): never {
  throw new Error('gym save failed for Anytime Fitness Kensington');
}

test('a render error below the root boundary reaches Sentry', async () => {
  const silence = jest.spyOn(console, 'error').mockImplementation(() => {});
  await render(
    <AppErrorBoundary onError={reportError}>
      <Throws />
    </AppErrorBoundary>,
  );
  expect(captureException).toHaveBeenCalledTimes(1);
  silence.mockRestore();
});

test('the report is marked handled, so a caught render error is not counted as a crash', () => {
  reportError(new Error('boom'));
  expect(captureException.mock.calls[0][1]).toMatchObject({
    mechanism: { type: 'react-error-boundary', handled: true },
  });
});

test('the component stack rides along, because a scrubbed error otherwise says nothing', () => {
  reportError(new Error('boom'), { componentStack: '\n at HomeScreen' });
  expect(captureException.mock.calls[0][1]).toMatchObject({
    contexts: { react: { componentStack: '\n at HomeScreen' } },
  });
});

test('a failure inside Sentry never becomes a second error', () => {
  captureException.mockImplementationOnce(() => {
    throw new Error('transport down');
  });
  expect(() => reportError(new Error('boom'))).not.toThrow();
});

test('the recovery screen replaces the screen that threw', async () => {
  const silence = jest.spyOn(console, 'error').mockImplementation(() => {});
  await render(
    <AppErrorBoundary onError={reportError}>
      <Throws />
    </AppErrorBoundary>,
  );
  expect(screen.queryByText('gym save failed for Anytime Fitness Kensington')).toBeNull();
  silence.mockRestore();
});

test('a child that renders fine is left alone', async () => {
  await render(
    <AppErrorBoundary onError={reportError}>
      <Text>Home</Text>
    </AppErrorBoundary>,
  );
  expect(screen.getByText('Home')).toBeTruthy();
  expect(captureException).not.toHaveBeenCalled();
});
