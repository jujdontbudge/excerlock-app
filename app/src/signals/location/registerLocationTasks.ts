import * as TaskManager from "expo-task-manager";

import { AsyncStorageGymVisitLog } from "./AsyncStorageGymVisitLog";
import {
  LocationTaskRuntime,
  type GeofencingTaskData,
  type LocationTaskData,
} from "./LocationTaskRuntime";
import {
  GEOFENCE_TASK_NAME,
  WALK_LOCATION_TASK_NAME,
} from "./locationTaskNames";

export { GEOFENCE_TASK_NAME, WALK_LOCATION_TASK_NAME };

export const locationTaskRuntime = new LocationTaskRuntime(
  new AsyncStorageGymVisitLog(),
);

if (!TaskManager.isTaskDefined(GEOFENCE_TASK_NAME)) {
  TaskManager.defineTask<GeofencingTaskData>(
    GEOFENCE_TASK_NAME,
    async ({ data, error }) => {
      if (error !== null) {
        return;
      }
      await locationTaskRuntime.handleGeofencingTask(data);
    },
  );
}

if (!TaskManager.isTaskDefined(WALK_LOCATION_TASK_NAME)) {
  TaskManager.defineTask<LocationTaskData>(
    WALK_LOCATION_TASK_NAME,
    async ({ data, error }) => {
      if (error === null) {
        locationTaskRuntime.handleLocationTask(data);
      }
    },
  );
}
