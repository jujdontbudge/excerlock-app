import { act, render, screen, userEvent } from '@testing-library/react-native';
import { AppRuntimeProvider } from '../../../runtime/AppRuntimeProvider';
import { createRuntime } from '../../../runtime/createRuntime';
import { rulesStore } from '../../../state/rulesStore';
import { ruleDaysStore } from '../../../state/ruleDaysStore';
import { WalkingSheet } from '../WalkingSheet';

test('a failed start renders an alert and a successful retry clears it', async () => {
  const runtime = createRuntime();
  await runtime.dev.load('home-walking-session');
  ruleDaysStore.getState().patch({ walkingSession: null });
  const realStart = runtime.walking.start.bind(runtime.walking);
  runtime.walking.start = jest.fn().mockRejectedValueOnce(new Error('stale rule')).mockImplementation(realStart);
  await render(
    <AppRuntimeProvider runtime={runtime}>
      <WalkingSheet rule={rulesStore.getState().data.rules[0]} onDismiss={jest.fn()} />
    </AppRuntimeProvider>,
  );

  await act(async () => userEvent.press(screen.getByRole('button', { name: 'Start walking' })));
  expect(screen.getByRole('alert')).toHaveTextContent(
    "Couldn't start the walk. Check that this condition is on and scheduled now.",
  );

  await act(async () => userEvent.press(screen.getByRole('button', { name: 'Start walking' })));
  expect(screen.queryByRole('alert')).toBeNull();
  expect(screen.getByText('Checking your pace')).toBeTruthy();
});

test('handheld walking never renders treadmill framing and remains startable', async () => {
  const runtime = createRuntime();
  await runtime.dev.load('home-walking-session');
  ruleDaysStore.getState().patch({ walkingSession: null });
  runtime.dev.setPlacement('handheld');
  const rule = {
    ...rulesStore.getState().data.rules[0],
    mode: { kind: 'state', activity: 'walking', place: 'treadmill' } as const,
  };
  await render(
    <AppRuntimeProvider runtime={runtime}>
      <WalkingSheet rule={rule} onDismiss={jest.fn()} />
    </AppRuntimeProvider>,
  );

  expect(screen.queryByText('Prop your phone on the console')).toBeNull();
  expect(screen.queryByText('Place your phone securely before starting')).toBeNull();
  expect(screen.getByRole('button', { name: 'Start walking' })).toBeEnabled();
});
