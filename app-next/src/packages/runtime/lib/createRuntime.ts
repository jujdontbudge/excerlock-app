import type { FakeRuntimeInstance } from '../../dev-harness/FakeRuntime';
import type { Runtime } from '../../ports/Runtime';
import { getProductionRuntime } from '../productionRuntime';
import { createAccountDataCoordinator, createMemoryAccountDataStorage } from '../AccountDataCoordinator';
import type { ActivityAccountData } from '../../activity/ActivityAccountData';
import { createWalkingState } from '../../activity/walkingMachine';
import { createProppedState } from '../../activity/proppedMachine';
import { createGymState } from '../../activity/gymMachine';
export type { Runtime } from '../../ports/Runtime';
export function createRuntime(): FakeRuntimeInstance;
export function createRuntime(mode: 'fake'): FakeRuntimeInstance;
export function createRuntime(mode: 'real'): Promise<Runtime>;
export function createRuntime(mode: 'fake' | 'real' = 'fake'): Runtime | Promise<Runtime> {
  if (mode === 'real') return getProductionRuntime();
  if (__DEV__) {
    // eslint-disable-next-line @typescript-eslint/no-require-imports -- loaded lazily so the module stays out of the startup path
    const { FakeRuntime } = require('../../dev-harness/FakeRuntime') as typeof import('../../dev-harness/FakeRuntime');
    // eslint-disable-next-line @typescript-eslint/no-require-imports -- loaded lazily so the module stays out of the startup path
    const { Platform } = require('react-native') as typeof import('react-native');
    const runtime = FakeRuntime({
      createAccountData: () => {
        const emptyActivity = (): ActivityAccountData => ({
          detection: {
            version: 1,
            generation: 0,
            observedAt: 0,
            walking: createWalkingState(0),
            propped: createProppedState(0),
            gym: createGymState(0),
            creditedThrough: {},
            pendingHistory: null,
          },
          historyLedger: { version: 1, through: null, stepsByDay: {}, instanceMeasurements: {} },
          walkingDuration: {
            version: 1,
            generation: null,
            cursor: null,
            millisecondsByDay: {},
            pending: [],
            segments: [],
          },
          gymTransitions: [],
        });
        let activity = emptyActivity();
        const activityData = {
          capture: async () => structuredClone(activity),
          restore: async (snapshot: ActivityAccountData | undefined) => {
            activity = snapshot ? structuredClone(snapshot) : emptyActivity();
          },
          reset: async () => {
            activity = emptyActivity();
          },
          hasData: (snapshot: ActivityAccountData) => Object.keys(snapshot.detection.creditedThrough).length > 0,
        };
        const coordinator = createAccountDataCoordinator(
          createMemoryAccountDataStorage(),
          activityData,
        );
        return {
          ...coordinator,
          seedActivity: (account: 'A' | 'B') => {
            const value = account === 'A' ? 11 : 22;
            const day = account === 'A' ? '2026-09-01' : '2026-09-02';
            activity = {
              ...emptyActivity(),
              detection: { ...emptyActivity().detection, creditedThrough: { [`activity-${account.toLowerCase()}`]: value } },
              historyLedger: { version: 1, through: value, stepsByDay: { [day]: value }, instanceMeasurements: {} },
              walkingDuration: { ...emptyActivity().walkingDuration, millisecondsByDay: { [day]: value * 10 } },
              gymTransitions: Array.from({ length: account === 'A' ? 1 : 2 }, (_, index) => ({
                id: `${account}:${index}`,
                regionId: `gym-${account.toLowerCase()}`,
                type: 'enter' as const,
                atMs: value + index,
                receivedAtMs: value + index,
              })),
            };
          },
          activityCheckpoint: () => {
            const marker = Object.keys(activity.detection.creditedThrough)[0] ?? 'none';
            const credits = Object.values(activity.historyLedger.stepsByDay)[0] ?? 0;
            const walking = Object.values(activity.walkingDuration.millisecondsByDay)[0] ?? 0;
            return `${marker}/${credits}/${walking}/${activity.gymTransitions.length}`;
          },
        };
      },
    });
    if (Platform.OS === 'ios' && process.env.NODE_ENV !== 'test') {
      // eslint-disable-next-line @typescript-eslint/no-require-imports -- loaded lazily so the module stays out of the startup path
      const { foregroundGym } = require('../../gyms/ForegroundGym') as typeof import('../../gyms/ForegroundGym');
      // eslint-disable-next-line @typescript-eslint/no-require-imports -- loaded lazily so the module stays out of the startup path
      const { supportDelivery } = require('../../support/SupportDelivery') as typeof import('../../support/SupportDelivery');
      runtime.gym = foregroundGym(runtime.gym, runtime.dev.setPresence);
      runtime.support = supportDelivery(runtime.support);
      // eslint-disable-next-line @typescript-eslint/no-require-imports -- loaded lazily so the module stays out of the startup path
      const Constants = (require('expo-constants') as typeof import('expo-constants')).default;
      if (Constants.isDevice) {
        // eslint-disable-next-line @typescript-eslint/no-require-imports -- loaded lazily so the module stays out of the startup path
        const { nativeGait } = require('./NativeGait') as typeof import('./NativeGait');
        runtime.gait = nativeGait() ?? runtime.gait;
      }
    }
    return runtime;
  }
  throw new Error('Demo services are unavailable in a release build');
}
