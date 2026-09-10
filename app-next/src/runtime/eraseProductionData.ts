import type { Permissions } from '../domain/types';
import { createGymState } from '../domain/gymMachine';
import { createProppedState } from '../domain/proppedMachine';
import { createWalkingState } from '../domain/walkingMachine';
import { detectionStore, persistDetectionState } from '../state/detectionStore';
import { permissionsStore } from '../state/permissionsStore';
import { stores } from '../state/stores';

type Resettable = { reset(): Promise<void> };

/**
 * Erases account-owned local state after server deletion acceptance. The caller
 * must first quiesce sensors/policy writers. OS permissions are projected, not
 * reset to `notDetermined`: deleting app data cannot revoke system grants.
 */
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

  // Store barriers are per-key and queue behind any older middleware write, so
  // a pre-erasure write cannot land after the reset snapshot.
  await Promise.all([
    ...stores.map((store) => store.persistBarrier()),
    persistDetectionState(),
    options.historyLedger.reset(),
    options.gymLog.reset(),
  ]);
}
