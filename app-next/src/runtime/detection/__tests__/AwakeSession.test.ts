import { AwakeSession } from '../AwakeSession';
import type { LocationProvider } from '../../../engine/signals/location/LocationProvider';
function setup(authorization: 'authorizedAlways' | 'denied' = 'authorizedAlways') {
  let running = false;
  const provider = {
    getAuthorizationStatus: () => authorization,
    isWalkKeepAliveActive: () => running,
    startWalkKeepAlive: jest.fn(async () => {
      running = true;
    }),
    stopWalkKeepAlive: jest.fn(async () => {
      running = false;
    }),
  } as unknown as LocationProvider;
  return { session: new AwakeSession(provider), provider };
}
test('starts only for active windows with Always authorization and stops outside', async () => {
  const { session, provider } = setup();
  await expect(session.reconcile(true)).resolves.toMatchObject({ requested: true, running: true, error: null });
  await expect(session.reconcile(false)).resolves.toMatchObject({ requested: false, running: false });
  expect(provider.startWalkKeepAlive).toHaveBeenCalledTimes(1);
  expect(provider.stopWalkKeepAlive).toHaveBeenCalledTimes(1);
});
test('denied reports requested but never claims running', async () => {
  const { session, provider } = setup('denied');
  await expect(session.reconcile(true)).resolves.toMatchObject({
    requested: true,
    running: false,
    authorization: 'denied',
  });
  expect(provider.startWalkKeepAlive).not.toHaveBeenCalled();
});
