import { act, render, screen, fireEvent, waitFor } from '@testing-library/react-native';
import { GymPickerScreen } from '../GymPickerScreen';
import { AppRuntimeProvider } from '../../../runtime/AppRuntimeProvider';
import { createRuntime } from '../../../runtime/createRuntime';
import { gymPickerCopy as c } from '../../../content/gymPicker';
const firstGymId = 'gym-1';
const saved = jest.fn();
async function openSearch() {
  await fireEvent.press(screen.getByRole('button', { name: c.search }));
}
test('late search responses cannot replace the newer query', async () => {
  const r = await mount();
  await openSearch();
  let finishOld!: (rows: { id: string; title: string; subtitle: string }[]) => void;
  const search = jest
    .spyOn(r.gym, 'suggest')
    .mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          finishOld = resolve;
        }),
    )
    .mockResolvedValueOnce([{ id: 'new', title: 'Tokyo Gym', subtitle: 'Tokyo, Japan' }]);
  await fireEvent.changeText(screen.getByLabelText(c.search), 'Paris');
  await waitFor(() => expect(search).toHaveBeenCalledTimes(1));
  await fireEvent.changeText(screen.getByLabelText(c.search), 'Tokyo');
  await waitFor(() => expect(screen.getByRole('button', { name: /Tokyo Gym/ })).toBeTruthy());
  await act(async () => finishOld([{ id: 'old', title: 'Paris Gym', subtitle: 'Paris, France' }]));
  expect(screen.queryByRole('button', { name: /Paris Gym/ })).toBeNull();
  expect(screen.getByRole('button', { name: /Tokyo Gym/ })).toBeTruthy();
  r.dispose();
});
test('unavailable search offers retry and still allows a custom pin', async () => {
  const r = await mount();
  await openSearch();
  jest.spyOn(r.gym, 'suggest').mockRejectedValue(new Error('offline'));
  await fireEvent.changeText(screen.getByLabelText(c.search), 'Gym');
  await waitFor(() => expect(screen.getByText(c.searchError)).toBeTruthy());
  expect(screen.getByRole('button', { name: c.retry })).toBeTruthy();
  await fireEvent.press(screen.getByRole('button', { name: c.drop }));
  expect(screen.getByRole('button', { name: c.save })).not.toBeDisabled();
  r.dispose();
});
async function mount(edit = false, cap = false) {
  const r = createRuntime();
  await r.dev.load('fresh-install');
  if (cap)
    for (const p of (await r.gym.nearbyGyms({ latitude: 41.884, longitude: -87.652 })).slice(0, 5))
      await r.gym.savePlace({ ...p, radiusMeters: 100 });
  await render(
    <AppRuntimeProvider runtime={r}>
      <GymPickerScreen placeId={edit ? firstGymId : undefined} onSaved={saved} />
    </AppRuntimeProvider>,
  );
  return r;
}
test('search, resolve, move over 250m, resize and save the actual pin', async () => {
  const r = await mount();
  await openSearch();
  expect(screen.queryByText(c.current)).toBeNull();
  await fireEvent.changeText(screen.getByLabelText(c.search), 'West');
  await waitFor(() => expect(screen.getByRole('button', { name: /West Loop Fitness/ })).toBeTruthy());
  await fireEvent.press(screen.getByRole('button', { name: /West Loop Fitness/ }));
  expect(screen.getByTestId('gym-map').props.initialRegion).toMatchObject({ latitude: 41.884, longitude: -87.652 });
  const moved = { latitude: 41.888, longitude: -87.652, latitudeDelta: 0.004, longitudeDelta: 0.004 };
  await fireEvent(screen.getByTestId('gym-map'), 'regionChange', moved);
  await fireEvent(screen.getByTestId('gym-map'), 'regionChangeComplete', moved);
  await waitFor(() => expect(screen.getByText(/Demo Street/)).toBeTruthy());
  for (let n = 0; n < 5; n++)
    await fireEvent(screen.getByRole('adjustable'), 'accessibilityAction', {
      nativeEvent: { actionName: 'increment' },
    });
  expect(screen.getByText('150 m')).toBeTruthy();
  await fireEvent.press(screen.getByRole('button', { name: c.save }));
  expect(r.gym.listPlaces()[0]).toMatchObject({
    latitude: moved.latitude,
    longitude: moved.longitude,
    radiusMeters: 150,
  });
  expect(saved).toHaveBeenCalled();
  r.dispose();
});
test('no matches allows a custom pin', async () => {
  const r = await mount();
  await openSearch();
  await fireEvent.changeText(screen.getByLabelText(c.search), 'No-such-gym');
  await waitFor(() => expect(screen.getByText(c.empty)).toBeTruthy());
  await fireEvent.press(screen.getByRole('button', { name: c.drop }));
  expect(screen.getByRole('button', { name: c.save })).toBeEnabled();
  r.dispose();
});
test('five gym cap prevents additions but permits editing radius', async () => {
  const r = await mount(false, true);
  expect(screen.getByText(c.limit)).toBeTruthy();
  expect(screen.getByRole('button', { name: c.save })).toBeDisabled();
  r.dispose();
});
test('existing gym can be edited at the cap', async () => {
  const r = await mount(true, true);
  expect(screen.getByRole('button', { name: c.save })).not.toBeDisabled();
  await fireEvent(screen.getByRole('adjustable'), 'accessibilityAction', { nativeEvent: { actionName: 'decrement' } });
  await fireEvent.press(screen.getByRole('button', { name: c.save }));
  expect(r.gym.listPlaces()).toHaveLength(5);
  expect(r.gym.listPlaces().find((p) => p.id === firstGymId)?.radiusMeters).toBe(90);
  r.dispose();
});

test('the picker renders the radius trade-off line under the slider', async () => {
  const r = await mount();
  expect(screen.getByText(c.helper)).toBeTruthy();
  expect(screen.getByRole('adjustable').props.accessibilityValue).toMatchObject({ min: 50, max: 200, now: 100 });
  r.dispose();
});
