import * as TaskManager from 'expo-task-manager';
import { reconcilePersistedGeofenceEvent } from './headlessRegistry';

import { AsyncStorageGymVisitLog } from './AsyncStorageGymVisitLog';
import { LocationTaskRuntime, type GeofencingTaskData, type LocationTaskData } from './lib/location/LocationTaskRuntime';
import { GEOFENCE_TASK_NAME, WALK_LOCATION_TASK_NAME } from './lib/location/locationTaskNames';
import { linkedTrace } from '@linked-trace';

export { GEOFENCE_TASK_NAME, WALK_LOCATION_TASK_NAME };

export const locationTaskRuntime = new LocationTaskRuntime(new AsyncStorageGymVisitLog());

if (!TaskManager.isTaskDefined(GEOFENCE_TASK_NAME)) {
  TaskManager.defineTask<GeofencingTaskData>(GEOFENCE_TASK_NAME, async ({ data, error }) => {
    if (__LINKED_RECORDER_TRACE__) linkedTrace.record('execution_opportunity', { source: 'geofence_task', status: error === null ? 'received' : 'error' });
    if (error !== null) return;
    await locationTaskRuntime.handleGeofencingTask(data);
    const regionId = data.region?.identifier;
    if (regionId !== undefined && (data.eventType === 1 || data.eventType === 2)) {
      await reconcilePersistedGeofenceEvent({
        type: data.eventType === 1 ? 'enter' : 'exit',
        regionId,
        atMs: Date.now(),
      });
    }
    if (__LINKED_RECORDER_TRACE__) linkedTrace.record('execution_opportunity', { source: 'geofence_task', status: 'completed' });
  });
}

if (!TaskManager.isTaskDefined(WALK_LOCATION_TASK_NAME)) {
  TaskManager.defineTask<LocationTaskData>(WALK_LOCATION_TASK_NAME, async ({ data, error }) => {
    if (__LINKED_RECORDER_TRACE__) linkedTrace.record('execution_opportunity', { source: 'walk_location_task', status: error === null ? 'received' : 'error' });
    if (error === null) {
      locationTaskRuntime.handleLocationTask(data);
      if (__LINKED_RECORDER_TRACE__) linkedTrace.record('execution_opportunity', { source: 'walk_location_task', status: 'completed' });
    }
  });
}
