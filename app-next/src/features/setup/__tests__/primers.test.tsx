import { act, render, screen, userEvent } from '@testing-library/react-native';
import { PermissionPrimer } from '../PermissionPrimer';
import { createRuntime } from '../../../runtime/createRuntime';
import { AppRuntimeProvider } from '../../../runtime/AppRuntimeProvider';
import { permissionsStore } from '../../../state/permissionsStore';
test.each(['screenTime', 'motion', 'health', 'location'] as const)(
  '%s denied primer explains the missing ability and allows continuation',
  async (name) => {
    const r = createRuntime();
    await r.dev.load('fresh-install');
    permissionsStore.getState().patch({ [name]: 'denied' });
    const onContinue = jest.fn();
    await render(
      <AppRuntimeProvider runtime={r}>
        <PermissionPrimer name={name} onContinue={onContinue} />
      </AppRuntimeProvider>,
    );
    expect(screen.getByRole('button', { name: 'Continue anyway' })).toBeTruthy();
    await userEvent.press(screen.getByRole('button', { name: 'Open Settings' }));
    expect(
      screen.getByText('You can change this permission in Settings. Your current choice stays as it is for now.'),
    ).toBeTruthy();
    await userEvent.press(screen.getByRole('button', { name: 'Continue anyway' }));
    expect(onContinue).toHaveBeenCalledTimes(1);
  },
);

test('the Location primer offers the explained Always toggle only after location is granted', async () => {
  const r = createRuntime();
  await r.dev.load('fresh-install');
  permissionsStore.getState().patch({ location: 'notDetermined' });
  const view = await render(
    <AppRuntimeProvider runtime={r}>
      <PermissionPrimer name="location" onContinue={jest.fn()} />
    </AppRuntimeProvider>,
  );
  expect(screen.queryByRole('switch', { name: 'Auto-detect arrivals' })).toBeNull();
  await act(() => permissionsStore.getState().patch({ location: 'whenInUse' }));
  await view.rerender(
    <AppRuntimeProvider runtime={r}>
      <PermissionPrimer name="location" onContinue={jest.fn()} />
    </AppRuntimeProvider>,
  );
  expect(screen.getByRole('switch', { name: 'Auto-detect arrivals' })).toBeTruthy();
  expect(
    screen.getByText('Allow location access all the time to recognize arrivals when ExcerLock is closed.'),
  ).toBeTruthy();
});
