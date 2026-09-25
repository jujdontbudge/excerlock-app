import { createPersistedStore } from './createPersistedStore';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createWalkingState, reduceWalking, type WalkingState } from '../domain/walkingMachine';
import { createProppedState, reducePropped, type ProppedState } from '../domain/proppedMachine';
import { createGymState, reduceGym, type GymDetectionState } from '../domain/gymMachine';
export type PendingHistoryCredit = { idempotencyKey: string; from: number; to: number; steps: number; timezone?: string };
export type DetectionData = {
  version: 1;
  generation: number;
  observedAt: number;
  walking: WalkingState;
  propped: ProppedState;
  gym: GymDetectionState;
  creditedThrough: Record<string, number>;
  pendingHistory: PendingHistoryCredit | null;
};
const initial: DetectionData = {
  version: 1,
  generation: 0,
  observedAt: 0,
  walking: createWalkingState(0),
  propped: createProppedState(0),
  gym: createGymState(0),
  creditedThrough: {},
  pendingHistory: null,
};
const validReducerState = (value: unknown, reducer: (value: never) => unknown) => {
  if (typeof value !== 'object' || value === null) return false;
  try {
    reducer(value as never);
    return true;
  } catch {
    return false;
  }
};
export const detectionStore = createPersistedStore('detection', initial, {
  version: (value) => value === 1,
  generation: (value) => Number.isSafeInteger(value) && Number(value) >= 0,
  observedAt: (value) => typeof value === 'number' && Number.isFinite(value),
  walking: (value) =>
    validReducerState(value, (state: WalkingState) => reduceWalking(state, { kind: 'tick' }, state.watermark, 30_000)),
  propped: (value) =>
    validReducerState(value, (state: ProppedState) => reducePropped(state, { kind: 'tick' }, state.watermark)),
  gym: (value) =>
    validReducerState(value, (state: GymDetectionState) => reduceGym(state, { kind: 'tick' }, state.watermark)),
  creditedThrough: (value) =>
    typeof value === 'object' &&
    value !== null &&
    Object.values(value).every((cursor) => typeof cursor === 'number' && Number.isFinite(cursor) && cursor >= 0),
  pendingHistory: (value) =>
    value === null ||
    (typeof value === 'object' &&
      value !== null &&
      typeof (value as PendingHistoryCredit).idempotencyKey === 'string' &&
      Number.isFinite((value as PendingHistoryCredit).from) &&
      Number.isFinite((value as PendingHistoryCredit).to) &&
      Number.isFinite((value as PendingHistoryCredit).steps) &&
      (value as PendingHistoryCredit).steps >= 0 &&
      ((value as PendingHistoryCredit).timezone === undefined ||
        (typeof (value as PendingHistoryCredit).timezone === 'string' && (value as PendingHistoryCredit).timezone!.length > 0)) &&
      (value as PendingHistoryCredit).to > (value as PendingHistoryCredit).from),
}, { manualPersistence: true });
let durableWrites: Promise<void> = Promise.resolve();
export function persistDetectionState(): Promise<void> {
  const serialized = JSON.stringify({ state: { data: detectionStore.getState().data }, version: 0 });
  const write = durableWrites.catch(() => undefined).then(() => AsyncStorage.setItem(
    'excerlock-next.detection.v1',
    serialized,
  ));
  durableWrites = write.catch(() => undefined);
  return write;
}
