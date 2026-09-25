import * as Location from "expo-location";

import {
  ExpoLocationClient,
  type ExpoLocationModule,
} from "./ExpoLocationClient";
import type { NativeLocationClient } from "./NativeLocationClient";
import { locationTaskRuntime } from "../../registerLocationTasks";

export function createExpoLocationClient(): NativeLocationClient {
  return new ExpoLocationClient(
    Location as unknown as ExpoLocationModule,
    locationTaskRuntime,
  );
}
