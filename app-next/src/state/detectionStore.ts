import { createPersistedStore } from './createPersistedStore';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createWalkingState, reduceWalking, type WalkingState } from '../domain/walkingMachine';
import { createProppedState, reducePropped, type ProppedState } from '../domain/proppedMachine';
import { createGymState, reduceGym, type GymDetectionState } from '../domain/gymMachine';
export type DetectionData = {
  version: 1;
  generation: number;
  observedAt: number;
  walking: WalkingState;
  propped: ProppedState;
  gym: GymDetectionState;
  creditedThrough: Record<string, number>;
};
const initial: DetectionData = {
  version: 1,
  generation: 0,
  observedAt: 0,
  walking: createWalkingState(0),
  propped: createProppedState(0),
  gym: createGymState(0),
  creditedThrough: {},
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
});
/** Explicit durability barrier for background callbacks and serialized reconciliation. */
export async function persistDetectionState(): Promise<void> {
  await AsyncStorage.setItem(
    'excerlock-next.detection.v1',
    JSON.stringify({ state: { data: detectionStore.getState().data }, version: 0 }),
  );
}
