import type { GymTransitionRecord } from './lib/location/GymVisitLog';
import type { HistoryCreditLedger, HistoryLedger } from './lib/detection/HistoryCreditLedger';
import type { WalkingDurationLedger, WalkingDurationState } from './WalkingDurationLedger';
import type { AsyncStorageGymVisitLog } from './AsyncStorageGymVisitLog';
import { suspendGymVisitLogWritesAndReset } from './AsyncStorageGymVisitLog';
import { detectionStore, persistDetectionState, type DetectionData } from './detectionStore';
import { createWalkingState } from './walkingMachine';
import { createProppedState } from './proppedMachine';
import { createGymState } from './gymMachine';

export type ActivityAccountData = {
  detection: DetectionData;
  historyLedger: HistoryLedger;
  walkingDuration: WalkingDurationState;
  gymTransitions: readonly GymTransitionRecord[];
};

type ActivityAccountDataDeps = {
  historyLedger: Pick<HistoryCreditLedger, 'read' | 'replace' | 'reset'>;
  walkingDurationLedger: Pick<WalkingDurationLedger, 'read' | 'replace' | 'reset'>;
  gymLog: Pick<AsyncStorageGymVisitLog, 'readAll' | 'replace' | 'reset'>;
  now(): number;
};

export function createActivityAccountData(deps: ActivityAccountDataDeps) {
  const resetDetection = async () => {
    const now = deps.now();
    detectionStore.getState().patch({
      version: 1,
      generation: detectionStore.getState().data.generation + 1,
      observedAt: now,
      walking: createWalkingState(now),
      propped: createProppedState(now),
      gym: createGymState(now),
      creditedThrough: {},
      pendingHistory: null,
    });
    await persistDetectionState();
  };
  return {
    capture: async (): Promise<ActivityAccountData> => {
      const [historyLedger, walkingDuration, gymTransitions] = await Promise.all([
        deps.historyLedger.read(),
        deps.walkingDurationLedger.read(),
        deps.gymLog.readAll(),
      ]);
      return { detection: detectionStore.getState().data, historyLedger, walkingDuration, gymTransitions };
    },
    reset: async () => {
      await suspendGymVisitLogWritesAndReset();
      await Promise.all([resetDetection(), deps.historyLedger.reset(), deps.walkingDurationLedger.reset()]);
    },
    restore: async (snapshot: ActivityAccountData | undefined) => {
      if (!snapshot) {
        await suspendGymVisitLogWritesAndReset();
        await Promise.all([resetDetection(), deps.historyLedger.reset(), deps.walkingDurationLedger.reset()]);
        return;
      }
      await suspendGymVisitLogWritesAndReset();
      const now = deps.now();
      detectionStore.getState().patch({
        ...snapshot.detection,
        generation: detectionStore.getState().data.generation + 1,
        observedAt: now,
        walking: createWalkingState(now),
        propped: createProppedState(now),
        gym: snapshot.detection.gym,
      });
      await Promise.all([
        persistDetectionState(),
        deps.historyLedger.replace(snapshot.historyLedger),
        deps.walkingDurationLedger.replace(snapshot.walkingDuration),
        deps.gymLog.replace(snapshot.gymTransitions),
      ]);
    },
    hasData: (snapshot: ActivityAccountData) =>
      snapshot.detection.observedAt > 0 ||
      Object.keys(snapshot.detection.creditedThrough).length > 0 ||
      snapshot.detection.pendingHistory !== null ||
      snapshot.detection.gym.records.length > 0 ||
      snapshot.historyLedger.through !== null ||
      Object.keys(snapshot.historyLedger.instanceMeasurements).length > 0 ||
      snapshot.walkingDuration.cursor !== null ||
      Object.keys(snapshot.walkingDuration.millisecondsByDay).length > 0 ||
      snapshot.gymTransitions.length > 0,
  };
}
