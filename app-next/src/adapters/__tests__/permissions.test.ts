import { permissionsStore } from '../../state/permissionsStore';
import { resetStores } from '../../state/stores';
import { locationPermission, readPermissionHealth, recordPermission } from '../permissions';

beforeEach(() => resetStores());

describe('permission health', () => {
  test('a restricted device reads as denied for location', () => {
    // P2-T15's Permissions['location'] has no `restricted`, and the product treats a restricted
    // device exactly as it treats a refusal: blocked, with nothing more to ask for.
    expect(locationPermission('restricted')).toBe('denied');
    expect(locationPermission('notDetermined')).toBe('notDetermined');
    expect(locationPermission('authorizedWhenInUse')).toBe('whenInUse');
    expect(locationPermission('authorizedAlways')).toBe('always');
    expect(locationPermission('denied')).toBe('denied');
  });

  test('foreground reads every signal authorization from the OS', async () => {
    permissionsStore.getState().patch({ motion: 'granted', location: 'always', health: 'granted' });

    // The user revoked motion and downgraded location in iOS Settings while the app was away.
    const health = await readPermissionHealth({
      motion: { getAuthorizationStatus: () => 'denied' },
      health: { getAuthorizationStatus: () => 'authorized' },
      location: { getAuthorizationStatus: () => 'authorizedWhenInUse' },
      camera: { permission: async () => 'granted' },
    });

    expect(health).toMatchObject({
      motion: 'denied',
      health: 'granted',
      location: 'whenInUse',
      camera: 'granted',
    });
    expect(permissionsStore.getState().data.motion).toBe('denied');
  });

  test('permissions owned by other adapters are left alone', async () => {
    permissionsStore.getState().patch({ screenTime: 'granted', notifications: 'denied' });
    const health = await readPermissionHealth({ motion: { getAuthorizationStatus: () => 'authorized' } });
    expect(health).toMatchObject({ screenTime: 'granted', notifications: 'denied', motion: 'granted' });
  });

  test('an unchanged status does not rewrite the store', () => {
    recordPermission('motion', 'granted');
    const before = permissionsStore.getState().data;
    recordPermission('motion', 'granted');
    expect(permissionsStore.getState().data).toBe(before);
  });
});
