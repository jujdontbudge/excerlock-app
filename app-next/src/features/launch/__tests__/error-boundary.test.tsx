import { Text } from 'react-native';
import { render, screen, userEvent } from '@testing-library/react-native';
import { router } from 'expo-router';
import { AppErrorBoundary } from '../AppErrorBoundary';
import { common as c } from '../../../content/common';

function Boom(): never {
  throw new Error('render exploded');
}

let quiet: jest.SpyInstance;
beforeEach(() => {
  quiet = jest.spyOn(console, 'error').mockImplementation(() => undefined);
});
afterEach(() => quiet.mockRestore());

test('the root error boundary renders the recovery screen when a child throws during render', async () => {
  await render(
    <AppErrorBoundary>
      <Boom />
    </AppErrorBoundary>,
  );

  expect(screen.getByRole('header', { name: c.errorTitle })).toBeTruthy();
  expect(screen.getByText(c.errorBody)).toBeTruthy();
  expect(screen.getByRole('button', { name: c.errorAction })).toBeTruthy();
});

test('the recovery screen Back to Home button resets navigation to the Home tab', async () => {
  const replace = jest.spyOn(router, 'replace').mockImplementation(() => undefined);
  let explode = true;
  const Flaky = () => {
    if (explode) throw new Error('render exploded');
    return <Text>Home</Text>;
  };
  await render(
    <AppErrorBoundary>
      <Flaky />
    </AppErrorBoundary>,
  );
  explode = false;

  await userEvent.press(screen.getByRole('button', { name: c.errorAction }));

  expect(replace).toHaveBeenCalledWith('/');
  expect(screen.getByText('Home')).toBeTruthy();
  replace.mockRestore();
});

test('a child that renders cleanly is left alone', async () => {
  await render(
    <AppErrorBoundary>
      <Text>Home</Text>
    </AppErrorBoundary>,
  );
  expect(screen.queryByText(c.errorTitle)).toBeNull();
});

test('the boundary reports the caught error so Sentry can hook in', async () => {
  const onError = jest.fn();
  await render(
    <AppErrorBoundary onError={onError}>
      <Boom />
    </AppErrorBoundary>,
  );
  expect(onError).toHaveBeenCalledWith(expect.any(Error), expect.anything());
});
