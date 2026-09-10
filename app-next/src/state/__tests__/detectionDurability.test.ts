import AsyncStorage from '@react-native-async-storage/async-storage';
import { detectionStore, persistDetectionState } from '../detectionStore';
test('detection patches cannot race automatic middleware writes with the explicit intent commit', async () => {
  await detectionStore.persist.rehydrate();
  jest.mocked(AsyncStorage.setItem).mockClear();
  detectionStore.getState().patch({ observedAt: 100 });
  await Promise.resolve();
  expect(AsyncStorage.setItem).not.toHaveBeenCalled();
  await persistDetectionState();
  expect(AsyncStorage.setItem).toHaveBeenCalledTimes(1);
  const stored = JSON.parse(jest.mocked(AsyncStorage.setItem).mock.calls[0]![1]);
  expect(stored.state.data.observedAt).toBe(100);
});
test('invalid pending credit cannot replace a valid persisted intent', () => {
  const intent = { idempotencyKey: 'steps:0:0:100', from: 0, to: 100, steps: 10 };
  detectionStore.getState().patch({ pendingHistory: intent });
  detectionStore.getState().patch({ pendingHistory: { ...intent, steps: -1 } });
  expect(detectionStore.getState().data.pendingHistory).toEqual(intent);
});
