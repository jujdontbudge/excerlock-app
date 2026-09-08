import { render, screen, userEvent, act } from '@testing-library/react-native';
import { createRuntime } from '../../../runtime/createRuntime';
import { AppRuntimeProvider } from '../../../runtime/AppRuntimeProvider';
import { WalkingSheet } from '../WalkingSheet';
import { rulesStore } from '../../../state/rulesStore';
import { ruleDaysStore } from '../../../state/ruleDaysStore';
test('walking sheet follows the script, can minimize, stop, and finish', async () => {
  const runtime = createRuntime();
  await runtime.dev.load('home-walking-session');
  await runtime.walking.start(rulesStore.getState().data.rules[0]);
  const dismiss = jest.fn();
  await render(
    <AppRuntimeProvider runtime={runtime}>
      <WalkingSheet rule={rulesStore.getState().data.rules[0]} onDismiss={dismiss} />
    </AppRuntimeProvider>,
  );
  expect(screen.getByText('Checking your pace')).toBeTruthy();
  await act(() => runtime.dev.advance(6000));
  expect(screen.getByText('until renewal')).toBeTruthy();
  await userEvent.press(screen.getByRole('button', { name: 'Minimize' }));
  expect(dismiss).toHaveBeenCalled();
  await act(() => runtime.dev.advance(6000));
  expect(screen.getByText('Keep walking to stay unlocked')).toBeTruthy();
  await userEvent.press(screen.getByRole('button', { name: 'Stop walk' }));
  expect(screen.getByText('Walk complete')).toBeTruthy();
  await userEvent.press(screen.getByRole('button', { name: 'Done' }));
  expect(ruleDaysStore.getState().data.walkingSession).toBeNull();
});
test('the handheld sheet does not gate Start on treadmill framing', async () => {
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
  expect(screen.getByRole('button', { name: 'Start walking' })).toBeEnabled();
  expect(screen.queryByText('Prop your phone on the console')).toBeNull();
});
