import type { Permissions } from '../../model/types';
import { createGymState } from '../../activity/gymMachine';
import { createProppedState } from '../../activity/proppedMachine';
import { createWalkingState } from '../../activity/walkingMachine';
import { detectionStore, persistDetectionState } from '../../activity/detectionStore';
import { permissionsStore } from '../../permissions/permissionsStore';
import { stores } from '../../launch/stores';

type Resettable = { reset(): Promise<void> };

export async function eraseProductionData(options: {
  historyLedger: Resettable;
  gymLog: Resettable;
  permissions: Permissions;
  now?: number;
}): Promise<void> {
  const generation = detectionStore.getState().data.generation + 1;
  for (const store of stores) {
    store.getState().reset();
  }
  permissionsStore.getState().patch(options.permissions);

  const now = options.now ?? Date.now();
  detectionStore.getState().patch({
    generation,
    observedAt: now,
    walking: createWalkingState(now),
    propped: createProppedState(now),
    gym: createGymState(now),
    creditedThrough: {},
    pendingHistory: null,
  });

  await Promise.all([
    ...stores.map((store) => store.persistBarrier()),
    persistDetectionState(),
    options.historyLedger.reset(),
    options.gymLog.reset(),
  ]);
}
