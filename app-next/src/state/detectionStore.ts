import { createPersistedStore } from './createPersistedStore';
import { createWalkingState, type WalkingState } from '../domain/walkingMachine';
import { createProppedState, type ProppedState } from '../domain/proppedMachine';
import { createGymState, type GymDetectionState } from '../domain/gymMachine';
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
const object = (value: unknown) => typeof value === 'object' && value !== null;
export const detectionStore = createPersistedStore('detection', initial, {
  version: (value) => value === 1,
  generation: (value) => Number.isSafeInteger(value) && Number(value) >= 0,
  observedAt: (value) => typeof value === 'number' && Number.isFinite(value),
  walking: object,
  propped: object,
  gym: object,
  creditedThrough: object,
});
