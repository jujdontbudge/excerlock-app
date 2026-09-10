import { GymRegionAdapter } from '../GymRegionAdapter';
import type { LocationProvider } from '../../../engine/signals/location/LocationProvider';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { GYM_VISIT_LOG_ACCEPTANCE_KEY, suspendGymVisitLogWritesAndReset } from '../../../engine/signals/location/AsyncStorageGymVisitLog';
jest.mock('@react-native-async-storage/async-storage', () => require('@react-native-async-storage/async-storage/jest/async-storage-mock'));
const place = (id: string) => ({ id, name: id, address: '', latitude: 1, longitude: 2, radiusMeters: 100 });
test('registers at most five saved gyms with no invented per-rule binding', async () => {
  await AsyncStorage.clear();
  await suspendGymVisitLogWritesAndReset();
  const location = { startMonitoringRegions: jest.fn(async () => {}) } as unknown as LocationProvider;
  const adapter = new GymRegionAdapter(location, async () => {});
  await adapter.registerSavedGyms([place('a'), place('b')]);
  expect(location.startMonitoringRegions).toHaveBeenCalledWith([
    expect.objectContaining({ id: 'a' }),
    expect.objectContaining({ id: 'b' }),
  ]);
  expect(JSON.parse((await AsyncStorage.getItem(GYM_VISIT_LOG_ACCEPTANCE_KEY))!)).toEqual({ epoch: 1, regionIds: ['a', 'b'] });
  await expect(adapter.registerSavedGyms(Array.from({ length: 6 }, (_, i) => place(String(i))))).rejects.toThrow(
    'At most 5',
  );
});
test('deletion stops the native region before invalidating current presence', async () => {
  const order: string[] = [];
  const location = {
    stopMonitoringRegions: jest.fn(async () => {
      order.push('stop');
    }),
  } as unknown as LocationProvider;
  const adapter = new GymRegionAdapter(location, async () => {
    order.push('invalidate');
  });
  await adapter.deleteSavedGym('a');
  expect(location.stopMonitoringRegions).toHaveBeenCalledWith(['a']);
  expect(order).toEqual(['stop', 'invalidate']);
});
